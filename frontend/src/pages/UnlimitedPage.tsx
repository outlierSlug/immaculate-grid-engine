import { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { fetchGameCategories, generateUnlimitedPuzzle } from '../api/client';
import type { GameCategoriesResponse, PuzzleResponse } from '../types/puzzle';
import { isValidGameId } from '../config/games';
import PuzzleGrid from '../components/PuzzleGrid';
import GuessInput from '../components/GuessInput';
import Timer from '../components/Timer';
import Score from '../components/Score';
import UnlimitedSettingsPanel, {
  DEFAULT_UNLIMITED_SETTINGS,
  type UnlimitedSettings,
} from '../components/UnlimitedSettingsPanel';
import { usePuzzleGuesses } from '../hooks/usePuzzleGuesses';

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

  const {
    filledCells,
    activeCell,
    handleCellClick,
    handleGuessSelect,
    closeActiveCell,
    correctCount,
    totalCells,
    isComplete,
  } = usePuzzleGuesses(puzzle);

  useEffect(() => {
    if (!validGame) return;
    fetchGameCategories(validGame).then(setCategories);
  }, [validGame]);

  if (!validGame) {
    return <Navigate to="/" replace />;
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const generated = await generateUnlimitedPuzzle(validGame as string, {
        excludedCategoryIds: settings.excludedCategoryIds,
        minAnswersPerCell: settings.allowSingleAnswers ? 1 : 2,
      });
      setPuzzle(generated);
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

  if (!puzzle) {
    return (
      <main className="flex flex-col items-center gap-5 py-8">
        <h1 className="text-2xl font-bold">Unlimited Mode</h1>

        {error && <p className="text-red-600 text-sm text-center px-4">{error}</p>}

        <UnlimitedSettingsPanel
          variant="inline"
          settings={settings}
          onChange={setSettings}
          categories={categories}
        />

        {categories && !canGenerate && (
          <p className="text-xs text-red-600">Select at least 2 categories to generate a puzzle.</p>
        )}

        <button
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate || generating}
          className="px-6 py-2.5 rounded-full bg-red-600 text-white font-semibold hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition cursor-pointer"
        >
          {generating ? 'Generating…' : 'Generate'}
        </button>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center gap-5 py-8">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Unlimited Mode</h1>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label="Open settings"
          className="p-2.5 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 transition cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {error && <p className="text-red-600 text-sm text-center px-4">{error}</p>}
      {/* {isComplete && (
        <p className="text-green-600 text-sm font-semibold text-center px-4">
          Solved! {correctCount}/{totalCells} correct.
        </p>
      )} */}

      <PuzzleGrid
        rowLabels={puzzle.rowLabels}
        colLabels={puzzle.colLabels}
        filledCells={filledCells}
        onCellClick={handleCellClick}
        sideColumn={[
          <Timer key="timer" startKey={puzzle.id} visible={settings.showTimer} running={!isComplete} />,
          <Score key="score" correct={correctCount} total={totalCells} />,
        ]}
      />

      <button
        type="button"
        onClick={handleGenerate}
        disabled={generating}
        className="px-6 py-2.5 rounded-full bg-red-600 text-white font-semibold hover:bg-red-700 disabled:bg-gray-300 transition cursor-pointer"
      >
        {generating ? 'Generating…' : 'Generate'}
      </button>

      {activeCell && (
        <GuessInput
          game={validGame}
          rowLabel={puzzle.rowLabels[activeCell.row]}
          colLabel={puzzle.colLabels[activeCell.col]}
          usedItemIds={new Set(Object.values(filledCells).map((item) => item.id))}
          onSelect={handleGuessSelect}
          onClose={closeActiveCell}
        />
      )}

      {settingsOpen && (
        <UnlimitedSettingsPanel
          variant="modal"
          settings={settings}
          onChange={setSettings}
          categories={categories}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </main>
  );
}
