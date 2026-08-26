import { useEffect, useState } from 'react';
import {
  fetchPinnedAdminPuzzle,
  fetchAdminCandidates,
  evaluateAdminGrid,
  pinAdminPuzzle,
  fetchItems,
  fetchGameCategories,
  AdminApiError,
} from '../api/client';
import { GAMES, type GameId } from '../config/games';
import type {
  AdminPuzzleResponse,
  AdminPuzzleCandidateResponse,
  AdminPuzzleEvaluationResponse,
  PinPuzzleRequest,
  GameCategoriesResponse,
  GridItem,
  CategoryOption,
} from '../types/puzzle';
import AdminPuzzlePreviewGrid from './AdminPuzzlePreviewGrid';
import AdminCategoryPicker from './AdminCategoryPicker';
import AdminCellAnswersModal from './AdminCellAnswersModal';
import AdminGridStats from './AdminGridStats';

interface AdminCuratePanelProps {
  game: GameId;
  date: string;
}

interface PickerTarget {
  side: 'row' | 'col';
  index: number;
}

interface AnswersModalState {
  rowLabel: string;
  colLabel: string;
  itemIds: string[];
}

export default function AdminCuratePanel({ game, date }: AdminCuratePanelProps) {
  // 403 on any admin fetch means "not an admin" - shown once, blocking the
  // whole panel, rather than three independent partial-failure states for
  // pinned/categories/items.
  const [notAuthorized, setNotAuthorized] = useState(false);

  const [items, setItems] = useState<GridItem[]>([]);
  const [categories, setCategories] = useState<GameCategoriesResponse | null>(null);

  const [pinned, setPinned] = useState<AdminPuzzleResponse | null>(null);
  const [pinnedLoading, setPinnedLoading] = useState(true);

  const [mode, setMode] = useState<'generate' | 'manual'>('generate');

  const [candidates, setCandidates] = useState<AdminPuzzleCandidateResponse[]>([]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const [manualRowIds, setManualRowIds] = useState<(string | null)[]>([null, null, null]);
  const [manualColIds, setManualColIds] = useState<(string | null)[]>([null, null, null]);
  const [evaluation, setEvaluation] = useState<AdminPuzzleEvaluationResponse | null>(null);
  const [evaluateError, setEvaluateError] = useState<string | null>(null);
  // Which exact combo evaluation/evaluateError currently reflect ("rowIds|colIds"),
  // so a stale result from a since-changed combo never renders - see
  // displayedEvaluation/displayedEvaluateError/evaluating below, which all
  // derive from comparing this against the combo currently selected. Kept
  // as a plain comparison instead of clearing evaluation state directly,
  // since that clearing would have to happen synchronously inside an
  // effect body (not allowed - see react-hooks/set-state-in-effect).
  const [evaluatedKey, setEvaluatedKey] = useState<string | null>(null);

  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [answersModal, setAnswersModal] = useState<AnswersModalState | null>(null);

  const [pinning, setPinning] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState(false);

  // Roster + category list are per-game, not per-date - fetched once on
  // game change, not re-fetched every time the date input changes.
  useEffect(() => {
    fetchItems(game).then(setItems).catch(() => setItems([]));
    fetchGameCategories(game)
      .then(setCategories)
      .catch((err) => {
        if (err instanceof AdminApiError && err.status === 403) setNotAuthorized(true);
      });
  }, [game]);

  // Pinned puzzle, candidates, and any in-progress manual build are all
  // scoped to one (game, date) pair - switching either should clear the
  // stale state from whatever date/game was showing before. This is
  // intentionally NOT inside the fetch effect below - React's own guidance
  // for "reset state when a prop changes" is to adjust it during render
  // (a plain condition + setState calls here, not inside useEffect), and
  // reserve the effect purely for the actual async work
  // (https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes).
  const resetKey = `${game}|${date}`;
  const [lastResetKey, setLastResetKey] = useState(resetKey);
  if (lastResetKey !== resetKey) {
    setLastResetKey(resetKey);
    setPinnedLoading(true);
    setCandidates([]);
    setCandidateIndex(0);
    setGenerateError(null);
    setManualRowIds([null, null, null]);
    setManualColIds([null, null, null]);
    setEvaluatedKey(null);
    setPinError(null);
    setPinSuccess(false);
  }

  useEffect(() => {
    fetchPinnedAdminPuzzle(game, date)
      .then(setPinned)
      .catch((err) => {
        if (err instanceof AdminApiError && err.status === 403) setNotAuthorized(true);
        setPinned(null);
      })
      .finally(() => setPinnedLoading(false));
  }, [game, date]);

  const manualRowSelected = manualRowIds.filter((id): id is string => id != null);
  const manualColSelected = manualColIds.filter((id): id is string => id != null);
  const manualComplete = manualRowSelected.length === 3 && manualColSelected.length === 3;
  const manualComboKey = manualComplete ? `${manualRowSelected.join(',')}|${manualColSelected.join(',')}` : null;
  const evaluating = mode === 'manual' && manualComboKey != null && evaluatedKey !== manualComboKey;
  const isFreshEvaluation = manualComboKey != null && evaluatedKey === manualComboKey;
  const displayedEvaluation = isFreshEvaluation ? evaluation : null;
  const displayedEvaluateError = isFreshEvaluation ? evaluateError : null;

  // Live evaluation as the manual-build combo changes - only fires once
  // all 6 headers are set, and re-derives evaluating/displayedEvaluation
  // above by comparing evaluatedKey rather than clearing anything
  // synchronously here. `cancelled` guards against a slower, older combo's
  // response landing AFTER a newer one already resolved and set
  // evaluatedKey correctly - without it, that late response would
  // unconditionally overwrite evaluatedKey back to the stale combo, and
  // since manualComboKey itself wouldn't have changed again, this effect
  // would never re-fire to correct it - stuck showing "Checking..." forever.
  useEffect(() => {
    if (mode !== 'manual' || manualComboKey == null) return;
    const key = manualComboKey;
    let cancelled = false;
    evaluateAdminGrid(game, manualRowSelected, manualColSelected)
      .then((result) => {
        if (cancelled) return;
        setEvaluation(result);
        setEvaluateError(null);
        setEvaluatedKey(key);
      })
      .catch((err) => {
        if (err instanceof AdminApiError && err.status === 403) setNotAuthorized(true);
        if (cancelled) return;
        setEvaluation(null);
        setEvaluateError(err instanceof Error ? err.message : 'Failed to evaluate this combination.');
        setEvaluatedKey(key);
      });
    return () => {
      cancelled = true;
    };
    // manualRowSelected/manualColSelected are recomputed every render, so
    // manualComboKey is what actually stands in for their identity here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, game, manualComboKey]);

  function handleGenerate() {
    setGenerating(true);
    setGenerateError(null);
    fetchAdminCandidates(game, date, 5)
      .then((result) => {
        setCandidates(result);
        setCandidateIndex(0);
      })
      .catch((err) => {
        if (err instanceof AdminApiError && err.status === 403) setNotAuthorized(true);
        setGenerateError(err instanceof Error ? err.message : 'Failed to generate candidates.');
      })
      .finally(() => setGenerating(false));
  }

  function itemsForIds(ids: string[]): GridItem[] {
    const byId = new Map(items.map((item) => [item.id, item]));
    return ids.map((id) => byId.get(id)).filter((item): item is GridItem => item != null);
  }

  function handlePin(request: PinPuzzleRequest) {
    setPinning(true);
    setPinError(null);
    setPinSuccess(false);
    pinAdminPuzzle(game, date, request)
      .then((result) => {
        setPinned(result);
        setPinSuccess(true);
      })
      .catch((err) => {
        if (err instanceof AdminApiError && err.status === 403) setNotAuthorized(true);
        setPinError(err instanceof Error ? err.message : 'Failed to pin this puzzle.');
      })
      .finally(() => setPinning(false));
  }

  function handlePickerSelect(categoryId: string) {
    if (!pickerTarget || !categories) return;
    const allCategories = categories.dimensions.flatMap((d) => d.categories);
    const picked = allCategories.find((c) => c.id === categoryId);
    if (!picked) return;

    if (pickerTarget.side === 'row') {
      setManualRowIds((prev) => prev.map((id, i) => (i === pickerTarget.index ? picked.id : id)));
    } else {
      setManualColIds((prev) => prev.map((id, i) => (i === pickerTarget.index ? picked.id : id)));
    }
    setPickerTarget(null);
  }

  function handleResetManual() {
    setManualRowIds([null, null, null]);
    setManualColIds([null, null, null]);
    setPinError(null);
    setPinSuccess(false);
    // No setEvaluation/setEvaluatedKey call needed - once these ids are
    // null, manualComboKey becomes null too, which makes isFreshEvaluation
    // false and displayedEvaluation/displayedEvaluateError resolve to null
    // on their own (see the derivation above the manual-evaluate effect).
  }

  function categoryOptionsFor(ids: (string | null)[]): (CategoryOption | null)[] {
    if (!categories) return ids.map(() => null);
    const allCategories = categories.dimensions.flatMap((d) => d.categories);
    return ids.map((id) => (id ? (allCategories.find((c) => c.id === id) ?? null) : null));
  }

  if (notAuthorized) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-5 py-4 text-sm text-red-700 dark:text-red-300">
        You're signed in, but this account isn't on the admin allowlist.
      </div>
    );
  }

  const avatarShapeClass = GAMES[game].avatarShapeClass;
  const avatarAspectClass = GAMES[game].avatarAspectClass;
  const avatarBorderClass = GAMES[game].avatarBorderClass;
  const candidate = candidates[candidateIndex] ?? null;

  return (
    // key={resetKey} replays the fade on every date/game switch - tied to
    // the exact same key that already drives the render-phase state reset
    // above, so this never fires independently of a moment where the
    // content genuinely just changed.
    <div key={resetKey} className="flex flex-col gap-10 motion-safe:animate-[page-in_300ms_ease-out]">
      {/* Currently pinned */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">
          Currently pinned — {date}
        </h2>
        {pinnedLoading ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">Loading…</p>
        ) : pinned ? (
          <div className="flex items-center justify-center gap-6">
            <div className="w-40 shrink-0" aria-hidden="true" />
            <AdminPuzzlePreviewGrid
              game={game}
              rowCategories={pinned.rowCategories}
              colCategories={pinned.colCategories}
              cellAnswerCounts={pinned.cellAnswerCounts}
              onCellClick={(cellKey) =>
                setAnswersModal({
                  rowLabel: pinned.rowCategories[Number(cellKey.split('-')[0])].label,
                  colLabel: pinned.colCategories[Number(cellKey.split('-')[1])].label,
                  itemIds: pinned.cellSolutions[cellKey] ?? [],
                })
              }
            />
            <AdminGridStats
              rowCategories={pinned.rowCategories}
              colCategories={pinned.colCategories}
              cellSolutions={pinned.cellSolutions}
            />
          </div>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500">Nothing pinned yet for this date.</p>
        )}
      </div>

      {/* Build a puzzle */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            {mode === 'generate' ? 'Candidates' : 'Build manually'}
          </h2>
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {(['generate', 'manual'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 rounded-md text-sm font-semibold cursor-pointer transition ${
                  mode === m
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/30 dark:text-indigo-200'
                    : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
              >
                {m === 'generate' ? 'Generate Candidates' : 'Build Manually'}
              </button>
            ))}
          </div>
        </div>

        {mode === 'generate' ? (
          <div className="flex flex-col items-center gap-4">
            {candidate ? (
              <>
                <div className="flex items-center justify-center gap-6">
                  {/* One flat row, one uniform gap-6 throughout - AdminGridStats
                      sits immediately beside the grid (not past the › arrow),
                      matching the plain "grid, gap-6, stats" spacing every
                      other admin grid+stats pairing uses. The arrows now flank
                      the whole (grid + stats) unit instead of just the grid,
                      which is what keeps this symmetric: spacer (w-40) on the
                      left balances AdminGridStats' own w-40 on the right, so
                      the grid itself still lands dead center regardless of
                      where the arrows sit. */}
                  <div className="w-40 shrink-0" aria-hidden="true" />

                  <button
                    type="button"
                    aria-label="Previous candidate"
                    disabled={candidateIndex === 0}
                    onClick={() => setCandidateIndex((i) => i - 1)}
                    className="w-9 h-9 shrink-0 rounded-full border border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                  >
                    ‹
                  </button>

                  <AdminPuzzlePreviewGrid
                    game={game}
                    rowCategories={candidate.rowCategories}
                    colCategories={candidate.colCategories}
                    cellAnswerCounts={candidate.cellAnswerCounts}
                    onCellClick={(cellKey) =>
                      setAnswersModal({
                        rowLabel: candidate.rowCategories[Number(cellKey.split('-')[0])].label,
                        colLabel: candidate.colCategories[Number(cellKey.split('-')[1])].label,
                        itemIds: candidate.cellSolutions[cellKey] ?? [],
                      })
                    }
                  />

                  <AdminGridStats
                    rowCategories={candidate.rowCategories}
                    colCategories={candidate.colCategories}
                    cellSolutions={candidate.cellSolutions}
                  />

                  <button
                    type="button"
                    aria-label="Next candidate"
                    disabled={candidateIndex === candidates.length - 1}
                    onClick={() => setCandidateIndex((i) => i + 1)}
                    className="w-9 h-9 shrink-0 rounded-full border border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                  >
                    ›
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-gray-400 dark:text-gray-500">
                    Candidate {candidateIndex + 1} of {candidates.length}
                  </span>
                  <button
                    type="button"
                    disabled={pinning}
                    onClick={() =>
                      handlePin({
                        rowCategories: candidate.rowCategories,
                        colCategories: candidate.colCategories,
                        cellSolutions: candidate.cellSolutions,
                      })
                    }
                    className="px-5 py-2 rounded-full bg-indigo-600 text-white text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {pinning ? 'Pinning…' : 'Pin this one'}
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">No candidates generated yet.</p>
            )}

            <button
              type="button"
              disabled={generating}
              onClick={handleGenerate}
              className="px-4 py-2 rounded-full bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 text-sm font-semibold cursor-pointer disabled:opacity-50"
            >
              {generating ? 'Generating…' : candidates.length > 0 ? '↻ Generate 5 new candidates' : 'Generate 5 candidates'}
            </button>
            {generateError && <p className="text-sm text-red-600 dark:text-red-400">{generateError}</p>}
            {pinError && <p className="text-sm text-red-600 dark:text-red-400">{pinError}</p>}
            {pinSuccess && <p className="text-sm text-green-600 dark:text-green-400">Pinned.</p>}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center justify-center gap-6">
              <div className="w-40 shrink-0" aria-hidden="true" />
              <AdminPuzzlePreviewGrid
                game={game}
                rowCategories={categoryOptionsFor(manualRowIds)}
                colCategories={categoryOptionsFor(manualColIds)}
                cellAnswerCounts={displayedEvaluation?.cellAnswerCounts}
                onHeaderClick={(side, index) => setPickerTarget({ side, index })}
                onCellClick={(cellKey) => {
                  const rowCats = categoryOptionsFor(manualRowIds);
                  const colCats = categoryOptionsFor(manualColIds);
                  const rowLabel = rowCats[Number(cellKey.split('-')[0])]?.label ?? '';
                  const colLabel = colCats[Number(cellKey.split('-')[1])]?.label ?? '';
                  setAnswersModal({ rowLabel, colLabel, itemIds: displayedEvaluation?.cellSolutions[cellKey] ?? [] });
                }}
              />
              <AdminGridStats
                rowCategories={categoryOptionsFor(manualRowIds)}
                colCategories={categoryOptionsFor(manualColIds)}
                cellSolutions={displayedEvaluation?.cellSolutions}
              />
            </div>

            {(manualRowIds.some((id) => id != null) || manualColIds.some((id) => id != null)) && (
              <button
                type="button"
                onClick={handleResetManual}
                className="text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
              >
                ↺ Reset puzzle
              </button>
            )}

            <div className="flex items-center justify-between gap-4 w-full max-w-md">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                {evaluating ? (
                  <span>Checking…</span>
                ) : displayedEvaluation ? (
                  displayedEvaluation.solvable ? (
                    <span className="text-green-600 dark:text-green-400 font-semibold">✓ Solvable</span>
                  ) : (
                    <span className="text-red-600 dark:text-red-400 font-semibold">
                      ✗ Not solvable — no valid full 9-cell assignment exists
                    </span>
                  )
                ) : (
                  <span>Fill in all 6 categories to check solvability</span>
                )}
              </div>
              <button
                type="button"
                disabled={!displayedEvaluation?.solvable || pinning}
                onClick={() =>
                  displayedEvaluation &&
                  handlePin({
                    rowCategories: displayedEvaluation.rowCategories,
                    colCategories: displayedEvaluation.colCategories,
                    cellSolutions: displayedEvaluation.cellSolutions,
                  })
                }
                className="px-5 py-2 rounded-full bg-indigo-600 text-white text-sm font-semibold cursor-pointer disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                {pinning ? 'Pinning…' : 'Pin this puzzle'}
              </button>
            </div>
            {displayedEvaluateError && <p className="text-sm text-red-600 dark:text-red-400">{displayedEvaluateError}</p>}
            {pinError && <p className="text-sm text-red-600 dark:text-red-400">{pinError}</p>}
            {pinSuccess && <p className="text-sm text-green-600 dark:text-green-400">Pinned.</p>}
          </div>
        )}
      </div>

      {pickerTarget && categories && (
        <AdminCategoryPicker
          categories={categories}
          onSelect={handlePickerSelect}
          onClose={() => setPickerTarget(null)}
        />
      )}

      {answersModal && (
        <AdminCellAnswersModal
          rowLabel={answersModal.rowLabel}
          colLabel={answersModal.colLabel}
          answers={itemsForIds(answersModal.itemIds)}
          avatarShapeClass={avatarShapeClass} avatarAspectClass={avatarAspectClass} avatarBorderClass={avatarBorderClass}
          onClose={() => setAnswersModal(null)}
        />
      )}
    </div>
  );
}
