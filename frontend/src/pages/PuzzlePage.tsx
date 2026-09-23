import { useEffect, useRef, useState } from 'react';
import { useParams, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { fetchTodaysPuzzle, fetchArchivedPuzzle, fetchCollection, fetchItems, InvalidArchiveDateError } from '../api/client';
import type { GridItem, PuzzleResponse } from '../types/puzzle';
import { GAMES, isValidGameId } from '../config/games';
import { GAME_HELP_NOTES } from '../config/gameHelpNotes';
import PuzzleGrid from '../components/PuzzleGrid';
import GuessInput from '../components/GuessInput';
import Score from '../components/Score';
import GuessCounter from '../components/GuessCounter';
import UniquenessScore from '../components/UniquenessScore';
import PuzzleStatsPanel from '../components/PuzzleStatsPanel';
import PuzzleSummaryModal from '../components/PuzzleSummaryModal';
import CollectionCellBadge from '../components/CollectionCellBadge';
import ArchiveModal, { CURRENT_IS_TODAY } from '../components/ArchiveModal';
import SignInModal from '../components/SignInModal';
import { ArchiveIcon } from '../components/NavIcons';
import { collectionGainsMessage } from '../config/collection';
import ConfirmModal from '../components/ConfirmModal';
import HelpButton from '../components/HelpButton';
import HelpModal from '../components/HelpModal';
import LoadingSpinner from '../components/LoadingSpinner';
import NotFoundPage from './NotFoundPage';
import { usePuzzleGuesses } from '../hooks/usePuzzleGuesses';
import { computeLiveUniquenessScore, computeUniquenessPercentile } from '../utils/uniqueness';
import { useAuth } from '../auth/AuthProvider';

// Daily's guess limit is a fixed genre convention (matches Pokedoku), not a
// user-facing setting — unlike Unlimited, there is no toggle and no
// settings surface for it.
const DAILY_GUESS_LIMIT = 9;

export default function PuzzlePage() {
  const { game, date } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
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
  // - same reasoning as the Collection page's authLoading gate. `user` is seeded
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

  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  // /:game/archive renders this page with the Archive modal open, so an
  // old bookmark and the invalid-date redirect both land on the date list.
  // Derived from the URL rather than initialised from it: this page also
  // renders /:game/archive/:date, and a client-side redirect between the
  // two keeps the same component mounted, so a one-shot useState read at
  // mount never sees the change (an invalid date redirected to
  // /:game/archive and then sat there with no modal at all).
  const archiveUrlOpen = location.pathname.endsWith('/archive');
  const [archiveOpenedHere, setArchiveOpenedHere] = useState(false);
  const archiveOpen = archiveUrlOpen || archiveOpenedHere;
  const [signInOpen, setSignInOpen] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

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
    guessError,
    puzzleStats,
    statsSettled,
  } = usePuzzleGuesses(puzzle, {
    guessLimit: DAILY_GUESS_LIMIT,
    // Opens the one-time PuzzleSummaryModal - see UsePuzzleGuessesOptions'
    // own doc comment for why this fires exactly once, only on a genuine
    // live completion. Archive excluded outright - revisiting a past date
    // isn't a "just finished today's Daily" moment.
    onGameOver: isArchive ? undefined : () => setSummaryModalOpen(true),
    // Same shape as the fetch effect's own fetchTarget above - lets the
    // hook's auto-finalize logic tell a genuine same-tab day rollover apart
    // from navigating to a different game/date (see pageKey's own doc
    // comment on UsePuzzleGuessesOptions).
    pageKey: `${validGame ?? ''}:${isArchive}:${date ?? ''}`,
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

  // itemId -> copies collected before today's puzzle, for the live Daily's
  // collection badges. Signed-in live Daily only - Archive and anonymous
  // play never collect anything, so they get no badges at all.
  // Stored with the key it was fetched for, so a result from a different
  // game/date/account is simply ignored rather than needing a reset.
  // The roster is fetched alongside it because a filled cell's own GridItem
  // carries no attributes (a guess response only returns id/name/image, and
  // a restored remote completion even less) - and the badge needs rarity and
  // element to pick the right constellation/eidolon material.
  const [fetchedCollection, setFetchedCollection] = useState<{
    key: string;
    counts: Map<string, number>;
    roster: Map<string, GridItem>;
  } | null>(null);
  const userId = user?.id;
  const puzzleDate = puzzle?.puzzleDate;
  const collectionKey = validGame && !isArchive && userId && puzzleDate ? `${validGame}:${puzzleDate}:${userId}` : null;
  const priorCollection = fetchedCollection && fetchedCollection.key === collectionKey ? fetchedCollection : null;
  useEffect(() => {
    if (!collectionKey || !validGame || !puzzleDate) return;
    let cancelled = false;
    Promise.all([fetchCollection(validGame, puzzleDate), fetchItems(validGame)])
      .then(([entries, items]) => {
        if (!cancelled) {
          setFetchedCollection({
            key: collectionKey,
            counts: new Map(entries.map((e) => [e.itemId, e.timesCollected])),
            roster: new Map(items.map((item) => [item.id, item])),
          });
        }
      })
      .catch(() => {
        // Badges are decoration - a failed fetch just means none are shown.
      });
    return () => {
      cancelled = true;
    };
  }, [collectionKey, validGame, puzzleDate]);

  function collectionBadges(cells: Record<string, GridItem>, obtained: boolean) {
    if (!priorCollection || !validGame) return undefined;
    return Object.fromEntries(
      Object.entries(cells).map(([cellKey, item]) => [
        cellKey,
        <CollectionCellBadge
          game={validGame}
          // The roster entry, which has the attributes this cell's own copy
          // lacks; the cell's copy is only a fallback for an item the roster
          // somehow doesn't list.
          item={priorCollection.roster.get(item.id) ?? item}
          priorTimesCollected={priorCollection.counts.get(item.id) ?? 0}
          obtained={obtained}
        />,
      ])
    );
  }

  function scrollToStats() {
    setSummaryModalOpen(false);
    statsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Both the Summary button and the modal it opens are shared by the two
  // finished-board renders below - the one this device just played, and a
  // completion it only knows about from the server (same account, another
  // device). They used to live in the interactive render alone, so opening
  // a Daily you'd finished elsewhere had no way back to the summary.
  // Archive plays never get a summary at all.
  const summaryButton = !isArchive ? (
    <button
      type="button"
      onClick={() => setSummaryModalOpen(true)}
      className="px-5 py-2.5 rounded-full border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-indigo-400 dark:hover:border-indigo-500 transition cursor-pointer"
    >
      Summary
    </button>
  ) : null;

  // Everything that differs between those two renders is passed in; the rest
  // comes from the puzzle itself, so the two can't drift apart.
  function summaryModal(you: {
    score: number;
    correctCellKeys: Set<string>;
    uniquenessScore: number | null;
    uniquenessPercentile: number | null;
    collectedItemIds: string[];
  }) {
    if (!summaryModalOpen || isArchive || !puzzle || !validGame) return null;
    return (
      <PuzzleSummaryModal
        onClose={() => setSummaryModalOpen(false)}
        onViewStats={scrollToStats}
        onOpenArchive={() => {
          setSummaryModalOpen(false);
          setArchiveOpenedHere(true);
        }}
        gameId={validGame}
        gameLabel={GAMES[validGame].label}
        puzzleDate={puzzle.puzzleDate}
        score={you.score}
        totalCells={totalCells}
        correctCellKeys={you.correctCellKeys}
        rowCount={puzzle.rowLabels.length}
        colCount={puzzle.colLabels.length}
        uniquenessScore={you.uniquenessScore}
        uniquenessPercentile={you.uniquenessPercentile}
        mostUniqueScore={puzzleStats?.mostUniqueScore ?? null}
        collectionMessage={
          priorCollection ? collectionGainsMessage(validGame, you.collectedItemIds, priorCollection.counts) : null
        }
      />
    );
  }

  // Account-only: the date list and every archived puzzle behind it
  // require signing in, so the modal never opens for a signed-out visitor
  // even if they land on /:game/archive directly.
  function closeArchive() {
    setArchiveOpenedHere(false);
    // Opened by the URL, so closing it has to leave that URL too, or the
    // modal would just re-derive itself as open.
    if (archiveUrlOpen && validGame) navigate(`/${validGame}`, { replace: true });
  }

  const archiveModal = archiveOpen && user && validGame && (
    <ArchiveModal game={validGame} current={date ?? CURRENT_IS_TODAY} onClose={closeArchive} />
  );

  const helpModal = helpOpen && (
    <HelpModal title={isArchive ? 'Archived Puzzle' : "Today's Puzzle"} onClose={() => setHelpOpen(false)}>
      {isArchive ? (
        <p>
          This puzzle is archived. Your picks still count toward this puzzle's community pick-rate
          data, but if it's not being played on its original day, it won't count toward your personal
          games-played or average-score stats, or your collection.
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

  const signInModal = signInOpen && <SignInModal onClose={() => setSignInOpen(false)} />;

  // The branchy part of this page - an error, a loading state, the board
  // this device just played, or one it only knows about from the server.
  // It's a function rather than a chain of early returns from the
  // component itself so the overlays below can render from one fixed
  // position in the tree: when they were repeated inside each branch's own
  // <main>, a branch change (loading state resolving into the board)
  // unmounted and remounted them, and the Archive modal visibly replayed
  // its entrance animation mid-load.
  function renderBody() {
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
      // links to an invalid date). Still /:game/archive now that the list is
      // a modal - that route opens it over the Daily board.
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

    // Whether this account already finished this puzzle is only knowable once
    // the stats request lands (that's where `puzzleStats.you` comes from), so
    // rendering a board before then means a signed-in player can watch an
    // empty, playable grid get replaced by their own completed one. It shows
    // up most on a second device - a phone, when the puzzle was played on a
    // desktop - since there's no local progress there to restore either.
    // Restored local progress beats it to the first commit (it's a
    // localStorage read, not a request), so anyone continuing on the device
    // they played on isn't held behind this; and the stats request follows
    // the puzzle request to an already-warm backend, so the wait is one
    // round-trip. A failed stats fetch still settles, so this can't hang.
    if (user && !hasLocalProgress && !statsSettled) {
      return (
        <main className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner label={isArchive ? 'Loading archived puzzle...' : "Loading today's puzzle..."} size="lg" />
        </main>
      );
    }

    const avatarShapeClass = GAMES[validGame].avatarShapeClass;
    const avatarAspectClass = GAMES[validGame].avatarAspectClass;
    const avatarSizeClass = GAMES[validGame].avatarSizeClass;
    const avatarBorderClass = GAMES[validGame].avatarBorderClass;

    // The Archive lives here rather than in the header: picking a past day
    // is choosing *which* Daily to play, not switching mode the way
    // Unlimited/Collection do, so it belongs next to the board it changes.
    // Shown to everyone, unlike the header pill it replaced: a signed-out
    // visitor gets the sign-in prompt rather than no affordance at all, so
    // the Archive is at least discoverable before you have an account.
    const archiveButton = (
      <button
        type="button"
        onClick={() => (user ? setArchiveOpenedHere(true) : setSignInOpen(true))}
        aria-label="Archive"
        title="Archive"
        className="inline-flex items-center gap-1.5 p-1 rounded-full sm:rounded-lg sm:pr-2 text-gray-400 hover:bg-gray-100 hover:text-indigo-600 dark:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-indigo-400 transition cursor-pointer"
      >
        <ArchiveIcon className="w-5 h-5 shrink-0" />
        {/* Icon-only below sm, where the heading row is tightest. */}
        <span className="hidden sm:inline text-sm font-medium">Archive</span>
      </button>
    );

    // Equal-width boxes with each side's content anchored toward the title,
    // so the Archive icon and the (i) icon sit the same distance from it.
    // Wider on an archived date only because that side also carries the
    // "Archived" badge (dropped below sm - see below).
    const sideBoxWidthClass = isArchive ? 'w-16 sm:w-36' : 'w-9 sm:w-24';

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
        <div className={`${sideBoxWidthClass} flex justify-end`}>{archiveButton}</div>
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
            game={validGame}
            rowLabels={puzzle.rowLabels}
            colLabels={puzzle.colLabels}
            filledCells={remoteFilledCells}
            onCellClick={() => {}}
            locked
            cellStats={puzzleStats.perCell}
            cornerBadges={collectionBadges(remoteFilledCells, true)}
            avatarShapeClass={avatarShapeClass} avatarAspectClass={avatarAspectClass} avatarSizeClass={avatarSizeClass} avatarBorderClass={avatarBorderClass}
            sideColumn={[
              <UniquenessScore key="uniq" score={remoteUniquenessScore} percentile={remoteUniquenessPercentile} youFinished />,
              <Score key="score" correct={puzzleStats.you.score} total={totalCells} />,
              <GuessCounter key="guesses" remaining={Math.max(DAILY_GUESS_LIMIT - puzzleStats.you.guessesUsed, 0)} iconSrc={GAMES[validGame].dailyGuessIcon} gaveUp={puzzleStats.you.gaveUp} />,
            ]}
          />

          {summaryButton}

          <div ref={statsRef} className="w-full flex flex-col items-center">
            <PuzzleStatsPanel
              puzzleStats={puzzleStats}
              rowLabels={puzzle.rowLabels}
              colLabels={puzzle.colLabels}
              yourUniquenessScore={remoteUniquenessScore}
              avatarShapeClass={avatarShapeClass} avatarAspectClass={avatarAspectClass} avatarSizeClass={avatarSizeClass} avatarBorderClass={avatarBorderClass}
              puzzleDate={puzzle.puzzleDate}
              gameId={validGame}
              gameLabel={GAMES[validGame].label}
              isArchive={isArchive}
              correctCellKeys={new Set(Object.keys(remoteFilledCells))}
            />
          </div>

          {summaryModal({
            score: puzzleStats.you.score,
            correctCellKeys: new Set(Object.keys(remoteFilledCells)),
            uniquenessScore: remoteUniquenessScore,
            uniquenessPercentile: remoteUniquenessPercentile,
            collectedItemIds: Object.values(puzzleStats.you.cellAnswers),
          })}
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
          game={validGame}
          rowLabels={puzzle.rowLabels}
          colLabels={puzzle.colLabels}
          filledCells={filledCells}
          onCellClick={handleCellClick}
          locked={isGameOver}
          feedback={feedback}
          cellStats={puzzleStats?.perCell}
          cornerBadges={collectionBadges(filledCells, isGameOver)}
          avatarShapeClass={avatarShapeClass} avatarAspectClass={avatarAspectClass} avatarSizeClass={avatarSizeClass} avatarBorderClass={avatarBorderClass}
          sideColumn={[
            <UniquenessScore key="uniq" score={liveUniquenessScore} percentile={uniquenessPercentile} youFinished={isGameOver} />,
            <Score key="score" correct={correctCount} total={totalCells} feedback={feedback} />,
            <GuessCounter key="guesses" remaining={guessesRemaining} iconSrc={GAMES[validGame].dailyGuessIcon} feedback={feedback} gaveUp={gaveUp} />,
          ]}
        />

        {isGameOver && !isArchive && (
          <button
            type="button"
            onClick={() => setSummaryModalOpen(true)}
            className="px-5 py-2.5 rounded-full border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-indigo-400 dark:hover:border-indigo-500 transition cursor-pointer"
          >
            Summary
          </button>
        )}

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
            submitError={guessError}
            avatarShapeClass={avatarShapeClass} avatarAspectClass={avatarAspectClass}
          />
        )}

        {isGameOver && puzzleStats && (
          <div ref={statsRef} className="w-full flex flex-col items-center">
            <PuzzleStatsPanel
              puzzleStats={puzzleStats}
              rowLabels={puzzle.rowLabels}
              colLabels={puzzle.colLabels}
              yourUniquenessScore={liveUniquenessScore}
              avatarShapeClass={avatarShapeClass} avatarAspectClass={avatarAspectClass} avatarSizeClass={avatarSizeClass} avatarBorderClass={avatarBorderClass}
              puzzleDate={puzzle.puzzleDate}
              gameId={validGame}
              gameLabel={GAMES[validGame].label}
              isArchive={isArchive}
              correctCellKeys={new Set(Object.keys(filledCells))}
            />
          </div>
        )}

        {summaryModal({
          score: correctCount,
          correctCellKeys: new Set(Object.keys(filledCells)),
          uniquenessScore: liveUniquenessScore,
          uniquenessPercentile,
          collectedItemIds: Object.values(filledCells).map((item) => item.id),
        })}

      </main>
    );


  }

  const body = renderBody();

  return (
    <>
      {body}
      {helpModal}
      {archiveModal}
      {signInModal}
    </>
  );
}
