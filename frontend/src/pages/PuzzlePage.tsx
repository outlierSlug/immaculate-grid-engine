import { useEffect, useRef, useState } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { fetchTodaysPuzzle, fetchArchivedPuzzle, InvalidArchiveDateError } from '../api/client';
import type { PuzzleResponse } from '../types/puzzle';
import { GAMES, isValidGameId, type GameId } from '../config/games';
import { GAME_HELP_NOTES } from '../config/gameHelpNotes';
import PuzzleGrid from '../components/PuzzleGrid';
import GuessInput from '../components/GuessInput';
import Score from '../components/Score';
import GuessCounter from '../components/GuessCounter';
import UniquenessScore from '../components/UniquenessScore';
import PuzzleStatsPanel from '../components/PuzzleStatsPanel';
import ConfirmModal from '../components/ConfirmModal';
import HelpButton from '../components/HelpButton';
import HelpModal from '../components/HelpModal';
import LoadingSpinner from '../components/LoadingSpinner';
import NotFoundPage from './NotFoundPage';
import { usePuzzleGuesses } from '../hooks/usePuzzleGuesses';
import { computeLiveUniquenessScore, computeUniquenessPercentile } from '../utils/uniqueness';
import { useAuth } from '../auth/AuthProvider';
import intertwinedFateIcon from '../assets/genshin/Item_Intertwined_Fate.webp';
import starrPinIcon from '../assets/brawlstars/starr_pin.png';

// Daily's guess limit is a fixed genre convention (matches Pokedoku), not a
// user-facing setting — unlike Unlimited, there is no toggle and no
// settings surface for it.
const DAILY_GUESS_LIMIT = 9;

const DAILY_GUESS_ICON: Partial<Record<GameId, string>> = {
  genshin: intertwinedFateIcon,
  brawlstars: starrPinIcon,
};

export default function PuzzlePage() {
  const { game, date } = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const [puzzle, setPuzzle] = useState<PuzzleResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmGiveUpOpen, setConfirmGiveUpOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const validGame = isValidGameId(game) ? game : undefined;
  // Archive access is account-only - enforced here as a redirect rather
  // than an error, since it's not really the visitor's fault (a stale
  // bookmark, or clicking Archive before signing in). Whether `date` is
  // actually a valid archived date (not today, not out of window) is
  // deliberately NOT re-checked here with a client-computed "today" -
  // that used to compare against `new Date().toISOString()` (always UTC)
  // while the backend's LocalDate.now() is the server's local time, so
  // for hours every day the two disagreed about what "today" was, and
  // today's own puzzle could sail through as a seemingly-valid archived
  // date. The backend is now the sole authority (PuzzleController.archive
  // rejects it); a rejection here just means "not a valid archive date"
  // and redirects rather than showing a raw error, since this route is
  // never reached through the UI except by direct URL entry.
  const isArchive = date !== undefined;
  // Waits for AuthProvider's own /me revalidation before deciding to redirect
  // - same reasoning as ArchiveListPage's authLoading gate. `user` is seeded
  // optimistically from localStorage before that revalidation completes, so
  // checking `!user` alone would either bounce a still-actually-logged-in
  // visitor mid-flash on a page refresh, or (the riskier direction) briefly
  // fetch and render another account's archived puzzle content on a stale
  // token before the session turns out to be expired/revoked.
  const archiveRedirect = isArchive && !authLoading && !user;
  const [invalidArchiveDate, setInvalidArchiveDate] = useState(false);

  // `authLoading` has to stay a dependency below - it's what lets this
  // effect wait to fetch an archived puzzle until AuthProvider's one-time
  // token revalidation resolves (otherwise a signed-in visitor could get
  // bounced by archiveRedirect on a stale pre-revalidation read). But that
  // means this effect also re-runs on the LIVE Daily route the instant that
  // same background revalidation finishes - even though authLoading has no
  // bearing on which Daily puzzle to show. Without this guard, that spurious
  // re-run's unconditional setPuzzle(null) blipped puzzle.id from a real
  // value to undefined and back to the SAME value a moment later - which
  // usePuzzleGuesses's midnight-rollover detector (see its own comment)
  // can't distinguish from a genuine day change, so it auto-submitted
  // whatever was in progress as a permanent "gave up" attempt. Reproduced
  // as 100% deterministic for any signed-in user (not a rare race) - the
  // puzzle fetch reliably resolves before the auth revalidation call, so
  // this fired on effectively every load. Tracking the actual fetch target
  // (not just "some dependency changed") skips the reset+refetch when
  // nothing about *what puzzle to show* actually changed.
  const fetchedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!validGame || (isArchive && authLoading) || archiveRedirect) return;

    const fetchTarget = `${validGame}:${isArchive}:${date ?? ''}`;
    if (fetchedForRef.current === fetchTarget) return;
    fetchedForRef.current = fetchTarget;

    setPuzzle(null);
    setError(null);
    setInvalidArchiveDate(false);

    if (isArchive) {
      fetchArchivedPuzzle(validGame, date!)
        .then(setPuzzle)
        .catch((err) => {
          if (err instanceof InvalidArchiveDateError) {
            setInvalidArchiveDate(true);
          } else {
            setError(err.message);
          }
        });
    } else {
      fetchTodaysPuzzle(validGame).then(setPuzzle).catch((err) => setError(err.message));
    }
  }, [validGame, isArchive, date, archiveRedirect, authLoading]);

  // Daily's puzzle id encodes the date ("{gameId}:{date}"), so a puzzle
  // loaded before midnight silently goes stale if the tab is just left
  // open - refresh was the only way to notice. This re-asks the server
  // whenever the tab regains attention and swaps in a new puzzle only if
  // the id actually changed, rather than polling on a timer: no client-side
  // guess at what timezone "today" resets in, no background work while the
  // tab isn't being looked at, and a same-day recheck is a no-op that
  // leaves in-progress state (filled cells, guesses used) untouched, since
  // usePuzzleGuesses only resets on puzzle.id actually changing. Archived
  // dates are immutable once past, so this effect is Daily-only.
  useEffect(() => {
    if (!validGame || isArchive) return;

    function checkForNewPuzzle() {
      if (document.visibilityState !== 'visible') return;
      fetchTodaysPuzzle(validGame!)
        .then((latest) => {
          setPuzzle((current) => (current && current.id === latest.id ? current : latest));
        })
        .catch(() => {
          // Silent - this is a background freshness check, not the primary
          // load path. A transient failure here shouldn't disrupt an
          // already-loaded puzzle; the next focus/visibility event retries.
        });
    }

    document.addEventListener('visibilitychange', checkForNewPuzzle);
    window.addEventListener('focus', checkForNewPuzzle);
    return () => {
      document.removeEventListener('visibilitychange', checkForNewPuzzle);
      window.removeEventListener('focus', checkForNewPuzzle);
    };
  }, [validGame, isArchive]);

  const {
    filledCells,
    activeCell,
    handleCellClick,
    handleGuessSelect,
    closeActiveCell,
    correctCount,
    totalCells,
    guessesRemaining,
    isGameOver,
    giveUp,
    gaveUp,
    feedback,
    puzzleStats,
  } = usePuzzleGuesses(puzzle, {
    guessLimit: DAILY_GUESS_LIMIT,
    // Same key format for Daily and Archive - puzzle.id already encodes the
    // date, so a puzzle played live and later revisited via Archive (or
    // vice versa, once "today" becomes a past date) resolves to the same
    // local progress rather than two independent copies. The identity
    // suffix is what makes usePuzzleGuesses's own puzzle-changed reset
    // logic also fire on a login/logout transition, even though puzzle.id
    // itself hasn't changed - without it, guesses made under one identity
    // would silently carry into a submission credited to a different one
    // (e.g. anonymous progress getting attributed to an account on login,
    // or vice versa on logout), which contradicts the "clean slate, no
    // history merge" decision this whole feature was built around.
    persistKey: puzzle ? `daily-progress:${puzzle.id}:${user ? `user-${user.id}` : 'anon'}` : null,
    trackStats: true,
    // A signed-in user's personal /me/stats aggregate excludes archived
    // completions (see backend UserStatsService) - "games played" should
    // reflect genuine daily engagement, not binge-playing the archive.
    // Community-level stats (this puzzle's own pick-rates/Games Played) are
    // unaffected either way - those always count every attempt.
    playedLive: !isArchive,
  });

  // Once accounts exist, "have I already played this" can no longer be
  // answered by localStorage alone - it's one browser, not the account.
  // Finishing today's puzzle on one device and opening the site on another
  // would otherwise show a blank, replayable board. If the server already
  // has a completed attempt for this account (puzzleStats.you) and this
  // device has no local progress of its own, trust the server over local
  // state instead of rendering the normal interactive flow.
  const hasLocalProgress = correctCount > 0 || isGameOver
    || (guessesRemaining !== null && guessesRemaining < DAILY_GUESS_LIMIT);
  const remoteCompletion = !!user && !hasLocalProgress && !!puzzleStats?.you;

  if (!validGame) {
    return <NotFoundPage />;
  }

  if (archiveRedirect) {
    return <Navigate to={`/${validGame}`} replace />;
  }

  if (invalidArchiveDate) {
    // Sends them to the actual list of valid dates rather than the daily
    // page - more useful than silently landing on today's puzzle with no
    // explanation, for what's already an edge case only reachable by
    // directly typing/bookmarking a URL (the generated Archive list never
    // links to an invalid date).
    return <Navigate to={`/${validGame}/archive`} replace />;
  }

  if (error) {
    return (
      <main className="flex items-center justify-center min-h-[60vh] p-8">
        <p className="text-red-600 dark:text-red-400">Failed to load puzzle: {error}</p>
      </main>
    );
  }

  if (!puzzle) {
    return (
      <main className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner label={isArchive ? 'Loading archived puzzle...' : "Loading today's puzzle..."} size="lg" />
      </main>
    );
  }

  const avatarShapeClass = GAMES[validGame].avatarShapeClass;

  // Lets a visitor get back to the date list directly from the puzzle
  // itself, rather than re-clicking the header's already-active Archive
  // pill (which does work, but isn't where the eye lands when you're done
  // with this particular date).
  const backToArchiveLink = isArchive && (
    <Link
      to={`/${validGame}/archive`}
      className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition"
    >
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
      </svg>
      {/* Shortened below sm rather than hidden outright - "Back" still reads
          clearly next to the arrow icon, at a fraction of the width
          "Back to Archive" needed (that was the overflow risk at narrow
          widths in the first place). */}
      <span className="sm:hidden">Archive</span>
      <span className="hidden sm:inline">Back to Archive</span>
    </Link>
  );

  // Daily has nothing on the left at all (no Back to Archive link), so its
  // side boxes only ever need to fit the HelpButton. Archive's mobile
  // content is now just "‹ Back" (left) and the icon alone (right, the
  // Archived badge is dropped below sm - see below) - both much narrower
  // than the sm+ content ("Back to Archive" spelled out, badge shown), so
  // the box itself can be much narrower below sm too.
  const sideBoxWidthClass = isArchive ? 'w-16 sm:w-36' : 'w-9';

  const heading = (
    <div className="flex items-center gap-2 sm:gap-4">
      {/* Fixed, equal-width boxes on both sides (not an invisible mirror of
          each other's actual content) - each side's real content is
          aligned toward the title, so any leftover width (the gap between
          "Back to Archive" and the narrower badge+icon side) lands at the
          outer edges instead of sitting right next to the date. Equal box
          widths keep the title itself exactly centered without doubling
          each side's reserved space the way mirroring the two different
          content clusters against each other did. Narrower below sm to
          match the icon-only Back to Archive link above - w-36 on both
          sides overflowed a real phone viewport outright (verified via
          Playwright at 390px: content 43px wider than the viewport). */}
      <div className={`${sideBoxWidthClass} flex justify-end`}>{backToArchiveLink}</div>
      <h1 className="text-2xl font-bold whitespace-nowrap">{isArchive ? puzzle.puzzleDate : "Today's Puzzle"}</h1>
      <div className={`${sideBoxWidthClass} flex items-center justify-start gap-2`}>
        {isArchive && (
          // Dropped below sm - "‹ Back" already signals archived context at
          // that width, and the badge was the widest single piece of mobile
          // content this row carried.
          <span className="hidden sm:inline text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            Archived
          </span>
        )}
        <HelpButton onClick={() => setHelpOpen(true)} label={isArchive ? 'About archived puzzles' : "About today's puzzle"} />
      </div>
    </div>
  );

  // Page-specific rules live inline here (edit these paragraphs directly to
  // change what the (i) button next to the heading shows) - anything
  // game-specific instead comes from GAME_HELP_NOTES, so a caveat that
  // applies to a game everywhere (Daily, Archive, Unlimited) only needs
  // editing once rather than staying in sync across every page.
  const helpModal = helpOpen && (
    <HelpModal title={isArchive ? 'Archived Puzzle' : "Today's Puzzle"} onClose={() => setHelpOpen(false)}>
      {isArchive ? (
        <p>
          This puzzle is archived. Your picks still count toward this puzzle's community pick-rate
          data, but if it's not being played on its original day, it won't count toward your personal
          games-played or average-score stats.
        </p>
      ) : (
        <>
          <p>
            Fill all 9 cells with a character that fits both its row and column category.
          </p>
          <p>
            A character may only be used <b>once</b> per board.
          </p>
        </>
      )}
      {validGame &&
        GAME_HELP_NOTES[validGame]?.map((note, i) => <p key={i}>{note}</p>)}
      {!isArchive && (
        <p>
          The Daily Puzzle resets at <b>midnight Pacific time</b>. Sign in to save your progress and revisit past days from the Archive.
        </p>
      )}
    </HelpModal>
  );

  if (remoteCompletion && puzzleStats?.you) {
    // true: this completion was already recorded server-side (that's how
    // `you` exists at all) and puzzleStats.perCell reflects it.
    const remoteUniquenessScore = computeLiveUniquenessScore(puzzleStats.you.cellAnswers, puzzleStats.perCell, true);
    const remoteUniquenessPercentile = computeUniquenessPercentile(remoteUniquenessScore, puzzleStats.uniquenessScores, true);
    // Rebuilds the same shape usePuzzleGuesses's own filledCells carries,
    // from the server's cellAnswers (itemId strings only) - the matching
    // displayName/imageUrl for each pick already live in puzzleStats.perCell
    // (every correctly-answered item for a cell appears in that cell's
    // answers list, this account's own pick included), so no extra fetch is
    // needed just to render the board this account already completed.
    const remoteFilledCells = Object.fromEntries(
      Object.entries(puzzleStats.you.cellAnswers).map(([cellKey, itemId]) => {
        const answer = puzzleStats.perCell[cellKey]?.answers.find((a) => a.itemId === itemId);
        return [
          cellKey,
          {
            id: itemId,
            gameId: puzzle.gameId,
            displayName: answer?.displayName ?? itemId,
            imageUrl: answer?.imageUrl ?? '',
            attributes: {},
          },
        ];
      })
    );
    return (
      <main className="flex flex-col items-center gap-5 py-8 motion-safe:animate-[page-in_350ms_ease-out]">
        {heading}
        <PuzzleGrid
          rowLabels={puzzle.rowLabels}
          colLabels={puzzle.colLabels}
          filledCells={remoteFilledCells}
          onCellClick={() => {}}
          locked
          cellStats={puzzleStats.perCell}
          avatarShapeClass={avatarShapeClass}
          sideColumn={[
            <UniquenessScore key="uniq" score={remoteUniquenessScore} percentile={remoteUniquenessPercentile} youFinished />,
            <Score key="score" correct={puzzleStats.you.score} total={totalCells} />,
            <GuessCounter key="guesses" remaining={Math.max(DAILY_GUESS_LIMIT - puzzleStats.you.guessesUsed, 0)} iconSrc={DAILY_GUESS_ICON[validGame]} gaveUp={puzzleStats.you.gaveUp} />,
          ]}
        />

        <PuzzleStatsPanel
          puzzleStats={puzzleStats}
          rowLabels={puzzle.rowLabels}
          colLabels={puzzle.colLabels}
          yourUniquenessScore={remoteUniquenessScore}
          avatarShapeClass={avatarShapeClass}
          puzzleDate={puzzle.puzzleDate}
          gameId={validGame}
          gameLabel={GAMES[validGame].label}
          isArchive={isArchive}
          correctCellKeys={new Set(Object.keys(remoteFilledCells))}
        />
        {helpModal}
      </main>
    );
  }

  const filledCellIds = Object.fromEntries(Object.entries(filledCells).map(([key, item]) => [key, item.id]));
  // This single value drives both the mid-game sideColumn number and (once
  // isGameOver) the post-game-over stats panel below - selfAlreadyCounted
  // tracks that transition: false while this attempt hasn't been submitted
  // yet, true once it has (isGameOver flips in the same tick the game
  // ends; puzzleStats itself catches up moments later via the post-submit
  // refreshStats() call in usePuzzleGuesses - a brief, self-correcting gap
  // consistent with UNIQ being live/dynamic everywhere else).
  const liveUniquenessScore = computeLiveUniquenessScore(filledCellIds, puzzleStats?.perCell, isGameOver);
  const uniquenessPercentile = puzzleStats
    ? computeUniquenessPercentile(liveUniquenessScore, puzzleStats.uniquenessScores, isGameOver)
    : null;

  return (
    <main className="flex flex-col items-center gap-5 py-8 motion-safe:animate-[page-in_350ms_ease-out]">
      {heading}

      <PuzzleGrid
        rowLabels={puzzle.rowLabels}
        colLabels={puzzle.colLabels}
        filledCells={filledCells}
        onCellClick={handleCellClick}
        locked={isGameOver}
        feedback={feedback}
        cellStats={puzzleStats?.perCell}
        avatarShapeClass={avatarShapeClass}
        sideColumn={[
          <UniquenessScore key="uniq" score={liveUniquenessScore} percentile={uniquenessPercentile} youFinished={isGameOver} />,
          <Score key="score" correct={correctCount} total={totalCells} feedback={feedback} />,
          <GuessCounter key="guesses" remaining={guessesRemaining} iconSrc={DAILY_GUESS_ICON[validGame]} feedback={feedback} gaveUp={gaveUp} />,
        ]}
      />

      {!isGameOver && (
        <button
          type="button"
          onClick={() => setConfirmGiveUpOpen(true)}
          className="px-5 py-2.5 rounded-full border border-red-300 dark:border-red-800/70 text-gray-600 dark:text-gray-400 font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-400 dark:hover:border-red-700 transition cursor-pointer"
        >
          Give Up
        </button>
      )}

      {confirmGiveUpOpen && (
        <ConfirmModal
          title="Give up?"
          message={`Your current picks will be locked in and ${isArchive ? 'this puzzle' : "today's puzzle"} marked as done. This cannot be undone.`}
          confirmLabel="Give Up"
          onConfirm={() => {
            setConfirmGiveUpOpen(false);
            giveUp();
          }}
          onCancel={() => setConfirmGiveUpOpen(false)}
        />
      )}

      {activeCell && (
        <GuessInput
          game={validGame}
          rowLabel={puzzle.rowLabels[activeCell.row]}
          colLabel={puzzle.colLabels[activeCell.col]}
          usedItemIds={new Set(Object.values(filledCells).map((item) => item.id))}
          onSelect={handleGuessSelect}
          onClose={closeActiveCell}
          avatarShapeClass={avatarShapeClass}
        />
      )}

      {isGameOver && puzzleStats && (
        <PuzzleStatsPanel
          puzzleStats={puzzleStats}
          rowLabels={puzzle.rowLabels}
          colLabels={puzzle.colLabels}
          yourUniquenessScore={liveUniquenessScore}
          avatarShapeClass={avatarShapeClass}
          puzzleDate={puzzle.puzzleDate}
          gameId={validGame}
          gameLabel={GAMES[validGame].label}
          isArchive={isArchive}
          correctCellKeys={new Set(Object.keys(filledCells))}
        />
      )}

      {helpModal}
    </main>
  );
}
