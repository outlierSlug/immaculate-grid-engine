import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchGameCategories, generateUnlimitedPuzzle } from '../api/client';
import type { GameCategoriesResponse, PuzzleResponse } from '../types/puzzle';
import { GAMES, isValidGameId, type GameId } from '../config/games';
import { GAME_HELP_NOTES } from '../config/gameHelpNotes';
import PuzzleGrid from '../components/PuzzleGrid';
import GuessInput from '../components/GuessInput';
import Timer from '../components/Timer';
import Score from '../components/Score';
import GuessCounter from '../components/GuessCounter';
import UnlimitedSettingsPanel, {
  DEFAULT_UNLIMITED_SETTINGS,
  type UnlimitedSettings,
} from '../components/UnlimitedSettingsPanel';
import ConfirmModal from '../components/ConfirmModal';
import HelpButton from '../components/HelpButton';
import HelpModal from '../components/HelpModal';
import NotFoundPage from './NotFoundPage';
import { usePuzzleGuesses } from '../hooks/usePuzzleGuesses';
import acquaintFateIcon from '../assets/genshin/Item_Acquaint_Fate.webp';
import starrPinIcon from '../assets/brawlstars/starr_pin.png';
import luckyDropIcon from '../assets/clashroyale/Item_Lucky_Drop_Common.png';

const GUESS_LIMIT = 9;

// Themed guess-counter icon, per game. Daily mode should use
// Item_Intertwined_Fate.webp for Genshin once it gets this same treatment
// (Phase 5) — Unlimited uses Acquaint Fate. Games without an entry here
// fall back to GuessCounter's generic icon.
const UNLIMITED_GUESS_ICON: Partial<Record<GameId, string>> = {
  genshin: acquaintFateIcon,
  brawlstars: starrPinIcon,
  clashroyale: luckyDropIcon,
};

function remainingDimensionCount(categories: GameCategoriesResponse | null, excludedCategoryIds: string[]): number {
  if (!categories) return 0;
  return categories.dimensions.filter((dim) => dim.categories.some((c) => !excludedCategoryIds.includes(c.id)))
    .length;
}

export default function UnlimitedPage() {
  const { game } = useParams();
  const validGame = isValidGameId(game) ? game : undefined;

  const [categories, setCategories] = useState<GameCategoriesResponse | null>(null);
  const [puzzle, setPuzzle] = useState<PuzzleResponse | null>(null);
  const [settings, setSettings] = useState<UnlimitedSettings>(DEFAULT_UNLIMITED_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Snapshotted from settings.unlimitedGuesses at generation time — toggling
  // the setting mid-game never retroactively changes the puzzle in progress.
  const [activeGuessLimit, setActiveGuessLimit] = useState<number | null>(null);
  const [categoriesError, setCategoriesError] = useState(false);
  const [categoriesRetryCount, setCategoriesRetryCount] = useState(0);
  const [confirmGiveUpOpen, setConfirmGiveUpOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

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
    isComplete,
    giveUp,
    gaveUp,
    feedback,
    startedAt,
    endedAt,
  } = usePuzzleGuesses(puzzle, { guessLimit: activeGuessLimit });

  useEffect(() => {
    if (!validGame) return;
    let cancelled = false;
    fetchGameCategories(validGame)
      .then((result) => {
        if (cancelled) return;
        setCategories(result);
        setCategoriesError(false);
      })
      .catch(() => {
        if (cancelled) return;
        setCategoriesError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [validGame, categoriesRetryCount]);

  if (!validGame) {
    return <NotFoundPage />;
  }

  const avatarShapeClass = GAMES[validGame].avatarShapeClass;
  const avatarAspectClass = GAMES[validGame].avatarAspectClass;
  const avatarSizeClass = GAMES[validGame].avatarSizeClass;
  const avatarBorderClass = GAMES[validGame].avatarBorderClass;

  // Page-specific rules live inline here (edit these paragraphs directly to
  // change what the (i) button next to "Unlimited Mode" shows) - anything
  // game-specific instead comes from GAME_HELP_NOTES (see PuzzlePage's own
  // help modal, the other renderer of the same per-game notes).
  const helpModal = helpOpen && (
    <HelpModal title="Unlimited Mode" onClose={() => setHelpOpen(false)}>
      <p>
        Generate as many grids as you want with your preferred parameters.
      </p>
      <p>
        Unlimited is a practice/sandbox mode. Puzzles are <b>not</b> saved or persisted and nothing here ever counts toward your personal stats or
        community pick-rate data.
      </p>
      {GAME_HELP_NOTES[validGame]?.map((note, i) => <p key={i}>{note}</p>)}
    </HelpModal>
  );

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const generated = await generateUnlimitedPuzzle(validGame as string, {
        excludedCategoryIds: settings.excludedCategoryIds,
        minAnswersPerCell: settings.allowSingleAnswers ? 1 : 2,
        requireSoftLockGuard: settings.softLockGuard,
        unlimitedGuesses: settings.unlimitedGuesses,
      });
      setPuzzle(generated);
      setActiveGuessLimit(settings.unlimitedGuesses ? null : GUESS_LIMIT);
    } catch (err) {
      // A failed generation (e.g. filters too narrow) drops back to the
      // loadup/settings screen rather than leaving a stale grid on screen.
      setPuzzle(null);
      setError(err instanceof Error ? err.message : 'Failed to generate puzzle');
    } finally {
      setGenerating(false);
    }
  }

  const canGenerate = !!categories && remainingDimensionCount(categories, settings.excludedCategoryIds) >= 2;

  // Unlimited never changes routes (everything happens on /:game/unlimited),
  // so "back" is just discarding the current puzzle to show the settings
  // screen again - not a navigation. Deliberately doesn't reset `settings`,
  // so whatever filters were configured are still there to tweak or
  // immediately re-generate with. No confirmation guard, matching the
  // existing "New Puzzle" button's own silent-discard precedent - Unlimited
  // puzzles are never saved either way (see the help modal above).
  function handleBackToSettings() {
    setPuzzle(null);
    setError(null);
  }

  if (!puzzle) {
    return (
      <main className="flex flex-col items-center gap-5 py-8 motion-safe:animate-[page-in_350ms_ease-out]">
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Same box widths (w-9 sm:w-36) as the post-generate heading below,
              even though there's no Back button to show here - matching
              widths is what keeps the title from visibly shifting when
              Generate swaps this screen for the puzzle view (and back). */}
          <div className="w-9 sm:w-36 flex justify-end" aria-hidden="true" />
          <h1 className="text-2xl font-bold whitespace-nowrap">Unlimited Mode</h1>
          <div className="w-9 sm:w-36 flex items-center justify-start">
            <HelpButton onClick={() => setHelpOpen(true)} label="About Unlimited Mode" />
          </div>
        </div>

        <UnlimitedSettingsPanel
          variant="inline"
          settings={settings}
          onChange={setSettings}
          categories={categories}
          categoriesError={categoriesError}
          onRetryCategories={() => setCategoriesRetryCount((n) => n + 1)}
        />

        {categories && !canGenerate && (
          <p className="text-xs text-red-600">Select at least 2 categories to generate a puzzle.</p>
        )}

        <button
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate || generating}
          className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition cursor-pointer"
        >
          <svg className={`w-4 h-4 shrink-0 ${generating ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          {generating ? 'Generating…' : 'Generate'}
        </button>
        {error && <p className="text-red-600 text-sm text-center px-4">{error}</p>}
        {helpModal}
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center gap-5 py-8">
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Equal-width boxes on both sides (same pattern PuzzlePage uses for
            its own Back to Archive link) so "Unlimited Mode" stays centered
            regardless of the Back button's and HelpButton's different
            widths - a plain invisible mirror only works when one side is
            empty, which stopped being true once Back needed real content. */}
        <div className="w-9 sm:w-36 flex justify-end">
          <button
            type="button"
            onClick={handleBackToSettings}
            className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            <span className="sm:hidden">Back</span>
            <span className="hidden sm:inline">Back to Settings</span>
          </button>
        </div>
        <h1 className="text-2xl font-bold whitespace-nowrap">Unlimited Mode</h1>
        <div className="w-9 sm:w-36 flex items-center justify-start">
          <HelpButton onClick={() => setHelpOpen(true)} label="About Unlimited Mode" />
        </div>
      </div>

      {error && <p className="text-red-600 text-sm text-center px-4">{error}</p>}
      {/* End-state messaging (solved / gave up / out of guesses) intentionally
          left unstyled for now — logic (locking, timer stop) is fully wired,
          just no visible copy yet. Revisit once the messaging is designed. */}

      <PuzzleGrid
        game={validGame}
        rowLabels={puzzle.rowLabels}
        colLabels={puzzle.colLabels}
        filledCells={filledCells}
        onCellClick={handleCellClick}
        locked={isGameOver}
        feedback={feedback}
        avatarShapeClass={avatarShapeClass} avatarAspectClass={avatarAspectClass} avatarSizeClass={avatarSizeClass} avatarBorderClass={avatarBorderClass}
        sideColumn={[
          <Timer key="timer" startedAt={startedAt} endedAt={endedAt} visible={settings.showTimer} isComplete={isComplete} />,
          <Score key="score" correct={correctCount} total={totalCells} feedback={feedback} />,
          <GuessCounter key="guesses" remaining={guessesRemaining} iconSrc={UNLIMITED_GUESS_ICON[validGame]} feedback={feedback} gaveUp={gaveUp} />,
        ]}
      />

      {/* Mirrors PuzzleGrid's own column template (including its responsive
          -solo sizing and recentering ml-[...] below sm, where PuzzleGrid
          also drops its reserved stats column) so these three buttons stay
          centered under the bottom-left cell, the bottom-middle cell, and
          the bottom-right cell, at every viewport width. */}
      <div
        className="grid items-center -ml-(--col-label) sm:ml-0 [--col-cell:var(--grid-cell-solo)] [--col-label:var(--grid-label-solo)] [--col-stats:0px] sm:[--col-cell:var(--grid-cell)] sm:[--col-label:var(--grid-label)] sm:[--col-stats:var(--grid-label)]"
        style={{ gridTemplateColumns: `var(--col-label) repeat(3, var(--col-cell)) var(--col-stats)` }}
      >
        <div />
        <div className="flex justify-center">
          {activeGuessLimit != null && !isGameOver && (
            <button
              type="button"
              onClick={() => setConfirmGiveUpOpen(true)}
              className="px-5 py-2.5 rounded-full border border-red-300 dark:border-red-800/70 text-gray-600 dark:text-gray-400 font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-400 dark:hover:border-red-700 transition cursor-pointer"
            >
              Give Up
            </button>
          )}
        </div>
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            // Icon-only below sm - full icon+text (px-6, not this icon
            // button's tighter p-2.5) doesn't fit this row's per-cell grid
            // column at narrow widths and was overlapping the hamburger
            // button next to it. Only this button changes; Give Up and
            // Daily mode (which has no Generate button at all) are
            // untouched. aria-label keeps this labeled for screen readers
            // once the visible text is hidden.
            aria-label={generating ? 'Generating…' : 'Generate'}
            className="flex items-center justify-center gap-2 p-2.5 sm:px-6 sm:py-2.5 rounded-full bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 transition cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            <span className="hidden sm:inline">{generating ? 'Generating…' : 'Generate'}</span>
          </button>
        </div>
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
            className="p-2.5 rounded-full border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        <div />
      </div>

      {activeCell && (
        <GuessInput
          game={validGame}
          rowLabel={puzzle.rowLabels[activeCell.row]}
          colLabel={puzzle.colLabels[activeCell.col]}
          usedItemIds={new Set(Object.values(filledCells).map((item) => item.id))}
          onSelect={handleGuessSelect}
          onClose={closeActiveCell}
          avatarShapeClass={avatarShapeClass} avatarAspectClass={avatarAspectClass}
        />
      )}

      {settingsOpen && (
        <UnlimitedSettingsPanel
          variant="modal"
          settings={settings}
          onChange={setSettings}
          categories={categories}
          categoriesError={categoriesError}
          onRetryCategories={() => setCategoriesRetryCount((n) => n + 1)}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {confirmGiveUpOpen && (
        <ConfirmModal
          title="Give up?"
          message="Are you sure? This cannot be undone."
          confirmLabel="Give Up"
          onConfirm={() => {
            setConfirmGiveUpOpen(false);
            giveUp();
          }}
          onCancel={() => setConfirmGiveUpOpen(false)}
        />
      )}

      {helpModal}
    </main>
  );
}
