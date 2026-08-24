import { useEffect, useState, type ReactNode } from 'react';
import { fetchAdminTracking, AdminApiError } from '../api/client';
import type { GameId } from '../config/games';
import type {
  AdminTrackingResponse,
  TrackingWindow,
  CharacterAppearance,
  CategoryAppearance,
  DimensionPairing,
} from '../types/puzzle';
import AdminSortableTable, { type AdminTableColumn } from './AdminSortableTable';

interface AdminTrackingPanelProps {
  game: GameId;
}

export default function AdminTrackingPanel({ game }: AdminTrackingPanelProps) {
  const [notAuthorized, setNotAuthorized] = useState(false);
  const [tracking, setTracking] = useState<AdminTrackingResponse | null>(null);
  // Which game `tracking` currently reflects, so "loading" is derived by
  // comparison instead of a separate boolean that would need a synchronous
  // setState(true) at the top of the effect (not allowed - see
  // react-hooks/set-state-in-effect; same pattern as AdminCuratePanel's
  // pinnedLoading).
  const [trackingFor, setTrackingFor] = useState<string | null>(null);
  const loading = trackingFor !== game;
  const [windowKey, setWindowKey] = useState<'allTime' | 'trailing30Days'>('allTime');

  useEffect(() => {
    fetchAdminTracking(game)
      .then((result) => {
        setTracking(result);
        setTrackingFor(game);
      })
      .catch((err) => {
        if (err instanceof AdminApiError && err.status === 403) setNotAuthorized(true);
        setTracking(null);
        setTrackingFor(game);
      });
  }, [game]);

  if (notAuthorized) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-5 py-4 text-sm text-red-700 dark:text-red-300">
        You're signed in, but this account isn't on the admin allowlist.
      </div>
    );
  }

  if (loading) {
    return <p className="text-sm text-gray-400 dark:text-gray-500">Loading…</p>;
  }

  if (!tracking) {
    return <p className="text-sm text-gray-400 dark:text-gray-500">No tracking data available.</p>;
  }

  const active: TrackingWindow = tracking[windowKey];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {(['allTime', 'trailing30Days'] as const).map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWindowKey(w)}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold cursor-pointer transition ${
                windowKey === w
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/30 dark:text-indigo-200'
                  : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              {w === 'allTime' ? 'All-time' : 'Trailing 30 days'}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
          {active.windowStart} through {active.windowEnd} · {active.puzzleCount} eligible Daily puzzles
        </span>
      </div>

      <CharacterAppearanceSection characters={active.characters} />
      <CategoryAppearanceSection categories={active.categories} />
      <DimensionPairingSection pairings={active.pairings} />
    </div>
  );
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
      <h2 className="text-sm font-bold mb-0.5">{title}</h2>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">{subtitle}</p>
      {children}
    </div>
  );
}

const CHARACTER_COLUMNS: AdminTableColumn<CharacterAppearance>[] = [
  { key: 'displayName', label: 'Character', sortValue: (c) => c.displayName },
  { key: 'appearances', label: 'Appearances', sortValue: (c) => c.appearances, align: 'right' },
  {
    key: 'appearanceRatePct',
    label: 'Rate',
    sortValue: (c) => c.appearanceRatePct,
    render: (c) => `${c.appearanceRatePct.toFixed(1)}%`,
    align: 'right',
  },
  {
    key: 'lastAppearanceDate',
    label: 'Last appeared',
    sortValue: (c) => c.lastAppearanceDate ?? '',
    render: (c) => c.lastAppearanceDate ?? 'Never',
  },
  {
    key: 'daysSinceLastAppearance',
    label: 'Days since',
    sortValue: (c) => c.daysSinceLastAppearance ?? Number.MAX_SAFE_INTEGER,
    render: (c) => c.daysSinceLastAppearance ?? '—',
    align: 'right',
  },
];

function CharacterAppearanceSection({ characters }: { characters: CharacterAppearance[] }) {
  return (
    <SectionCard title="Character appearances" subtitle="Sortable - defaults to rarest first">
      <AdminSortableTable
        rows={characters}
        columns={CHARACTER_COLUMNS}
        rowKey={(c) => c.itemId}
        defaultSortKey="appearances"
        defaultSortDir="asc"
      />
    </SectionCard>
  );
}

const CATEGORY_COLUMNS: AdminTableColumn<CategoryAppearance>[] = [
  { key: 'dimension', label: 'Dimension', sortValue: (c) => c.dimension, render: (c) => c.dimension.replace(/_/g, ' ') },
  { key: 'label', label: 'Category', sortValue: (c) => c.label },
  { key: 'appearances', label: 'Appearances', sortValue: (c) => c.appearances, align: 'right' },
  {
    key: 'appearanceRatePct',
    label: 'Rate',
    sortValue: (c) => c.appearanceRatePct,
    render: (c) => `${c.appearanceRatePct.toFixed(1)}%`,
    align: 'right',
  },
  {
    key: 'lastAppearanceDate',
    label: 'Last appeared',
    sortValue: (c) => c.lastAppearanceDate ?? '',
    render: (c) => c.lastAppearanceDate ?? 'Never',
  },
  {
    key: 'daysSinceLastAppearance',
    label: 'Days since',
    sortValue: (c) => c.daysSinceLastAppearance ?? Number.MAX_SAFE_INTEGER,
    render: (c) => c.daysSinceLastAppearance ?? '—',
    align: 'right',
  },
];

function CategoryAppearanceSection({ categories }: { categories: CategoryAppearance[] }) {
  return (
    <SectionCard title="Category appearances" subtitle="Sortable - click Dimension to group by it">
      <AdminSortableTable
        rows={categories}
        columns={CATEGORY_COLUMNS}
        rowKey={(c) => c.categoryId}
        defaultSortKey="dimension"
        defaultSortDir="asc"
      />
    </SectionCard>
  );
}

function DimensionPairingSection({ pairings }: { pairings: DimensionPairing[] }) {
  const dimensions = [...new Set(pairings.flatMap((p) => [p.dimensionA, p.dimensionB]))].sort();
  const max = Math.max(1, ...pairings.map((p) => p.appearances));
  const lookup = new Map(pairings.map((p) => [`${[p.dimensionA, p.dimensionB].sort().join('|')}`, p.appearances]));

  // No a === b special-casing - GridGenerator never puts two categories of
  // the same dimension on both sides, but a manually-pinned puzzle has no
  // such restriction (e.g. row rarity:5, col rarity:4), and the backend
  // genuinely tracks that as a real "rarity|rarity" pairing when it happens.
  // Forcing the diagonal to N/A would silently hide that real data.
  function valueFor(a: string, b: string): number {
    return lookup.get([a, b].sort().join('|')) ?? 0;
  }

  return (
    <SectionCard title="Dimension pairings" subtitle="How often each pair of dimensions has faced off">
      {dimensions.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">No data yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse">
            <thead>
              <tr>
                <th className="p-1.5" />
                {dimensions.map((d) => (
                  <th key={d} className="p-1.5 font-semibold text-gray-400 dark:text-gray-500 capitalize whitespace-nowrap">
                    {d.replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dimensions.map((rowDim) => (
                <tr key={rowDim}>
                  <th className="p-1.5 text-right font-semibold text-gray-400 dark:text-gray-500 capitalize whitespace-nowrap">
                    {rowDim.replace(/_/g, ' ')}
                  </th>
                  {dimensions.map((colDim) => {
                    const value = valueFor(rowDim, colDim);
                    const intensity = value / max;
                    return (
                      <td key={colDim} className="p-1.5 text-center tabular-nums">
                        <span
                          className="inline-flex items-center justify-center w-9 h-7 rounded-md font-semibold"
                          style={{
                            backgroundColor: `rgba(99, 102, 241, ${0.08 + intensity * 0.42})`,
                            color: intensity > 0.45 ? '#312e81' : '#4338ca',
                          }}
                        >
                          {value}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
