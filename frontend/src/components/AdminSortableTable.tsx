import { useState, type ReactNode } from 'react';

export interface AdminTableColumn<T> {
  key: string;
  label: string;
  // Returns the value sorting compares - numbers sort numerically, strings
  // sort locale-aware. render (if given) is what actually gets displayed;
  // sortValue only ever feeds the comparator.
  sortValue: (row: T) => number | string;
  render?: (row: T) => ReactNode;
  align?: 'left' | 'right';
}

interface AdminSortableTableProps<T> {
  rows: T[];
  columns: AdminTableColumn<T>[];
  rowKey: (row: T) => string;
  defaultSortKey: string;
  defaultSortDir?: 'asc' | 'desc';
}

const ROW_LIMIT_OPTIONS = [10, 25, 50, 100] as const;

// Excel-style: click a header to sort by it (click again to flip
// direction), choose how many rows to show or "All" - used for every
// admin tracking table (characters, categories) instead of a fixed
// top-N bar list, since the whole point of this view is letting the
// admin slice the data however they need to judge freshness.
export default function AdminSortableTable<T>({
  rows,
  columns,
  rowKey,
  defaultSortKey,
  defaultSortDir = 'desc',
}: AdminSortableTableProps<T>) {
  const [sortKey, setSortKey] = useState(defaultSortKey);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultSortDir);
  const [rowLimit, setRowLimit] = useState<number | 'all'>(25);

  const activeColumn = columns.find((c) => c.key === sortKey) ?? columns[0];
  const sorted = [...rows].sort((a, b) => {
    const av = activeColumn.sortValue(a);
    const bv = activeColumn.sortValue(b);
    const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
    return sortDir === 'asc' ? cmp : -cmp;
  });
  const visible = rowLimit === 'all' ? sorted : sorted.slice(0, rowLimit);

  function handleHeaderClick(key: string) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400 dark:text-gray-500">
          Showing {visible.length} of {rows.length}
        </span>
        <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          Show
          <select
            value={rowLimit}
            onChange={(e) => setRowLimit(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-1.5 py-0.5 text-xs cursor-pointer"
          >
            {ROW_LIMIT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
            <option value="all">All</option>
          </select>
        </label>
      </div>

      <div className="overflow-x-auto overflow-y-auto max-h-96 rounded-lg border border-gray-200 dark:border-gray-800">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleHeaderClick(col.key)}
                  className={`px-3 py-2 font-semibold text-gray-500 dark:text-gray-400 cursor-pointer select-none whitespace-nowrap ${
                    col.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                >
                  {col.label}
                  {sortKey === col.key && <span className="ml-1 text-indigo-500">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={rowKey(row)} className="border-t border-gray-100 dark:border-gray-800">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-3 py-1.5 text-gray-700 dark:text-gray-300 tabular-nums ${
                      col.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {col.render ? col.render(row) : String(col.sortValue(row))}
                  </td>
                ))}
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-6 text-center text-gray-400 dark:text-gray-500">
                  No data yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
