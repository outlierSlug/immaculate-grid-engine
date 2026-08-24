import type { CategoryOption } from '../types/puzzle';

// This component's own fixed width (matches its root's `w-40` class below) -
// exported so a sibling that needs to balance around it in a calc() (see
// AdminHistoryPanel) has one source of truth instead of a second hardcoded
// "10rem" that could silently drift out of sync.
export const STATS_WIDTH = '10rem';

interface AdminGridStatsProps {
  rowCategories: (CategoryOption | null)[];
  colCategories: (CategoryOption | null)[];
  // undefined -> nothing to compute yet (e.g. Build Manually before all 6
  // categories are chosen).
  cellSolutions?: Record<string, string[]>;
}

// Every number here is derived purely from data the caller already has
// (cellSolutions/rowCategories/colCategories) - no separate backend call,
// this is just a different read of the same response used to render the
// grid itself. Meant to sit beside a candidate/pinned/manual-build grid so
// the admin has a quick, comparable signal for "is this one actually a
// good pick" beyond eyeballing 9 individual counts.
export default function AdminGridStats({ rowCategories, colCategories, cellSolutions }: AdminGridStatsProps) {
  if (!cellSolutions) {
    return (
      <div className="w-40 shrink-0 text-xs text-gray-400 dark:text-gray-500">
        Stats appear once every cell has an answer.
      </div>
    );
  }

  const counts = Object.values(cellSolutions).map((answers) => answers.length);
  const uniqueCharacters = new Set(Object.values(cellSolutions).flat()).size;
  const totalSlots = counts.reduce((sum, n) => sum + n, 0);
  const minCell = counts.length > 0 ? Math.min(...counts) : 0;
  const maxCell = counts.length > 0 ? Math.max(...counts) : 0;
  const avgCell = counts.length > 0 ? totalSlots / counts.length : 0;

  const dimensions = [
    ...new Set(
      [...rowCategories, ...colCategories]
        .filter((c): c is CategoryOption => c != null)
        .map((c) => c.id.split(':')[0])
    ),
  ];

  return (
    <div className="w-40 shrink-0 flex flex-col gap-3">
      <Stat label="Unique characters" value={uniqueCharacters} />
      <Stat label="Total answer slots" value={totalSlots} />
      <Stat label="Thinnest cell" value={minCell} warn={minCell <= 1} />
      <Stat label="Widest cell" value={maxCell} />
      <Stat label="Avg per cell" value={avgCell.toFixed(1)} />
      {dimensions.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1">Dimensions</div>
          <div className="flex flex-wrap gap-1">
            {dimensions.map((d) => (
              <span
                key={d}
                className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 capitalize"
              >
                {d.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div>
      <div className="text-xs text-gray-400 dark:text-gray-500">{label}</div>
      <div
        className={`text-lg font-bold tabular-nums ${
          warn ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-100'
        }`}
      >
        {value}
      </div>
    </div>
  );
}
