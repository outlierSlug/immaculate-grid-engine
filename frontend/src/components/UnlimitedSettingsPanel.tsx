import { useEffect, useState } from 'react';
import type { CategoryOption, GameCategoriesResponse } from '../types/puzzle';

export interface UnlimitedSettings {
  excludedCategoryIds: string[];
  allowSingleAnswers: boolean;
  showTimer: boolean;
  unlimitedGuesses: boolean;
  softLockGuard: boolean;
}

export const DEFAULT_UNLIMITED_SETTINGS: UnlimitedSettings = {
  excludedCategoryIds: [],
  allowSingleAnswers: true,
  showTimer: false,
  unlimitedGuesses: true,
  softLockGuard: true,
};

interface UnlimitedSettingsPanelProps {
  variant: 'inline' | 'modal';
  settings: UnlimitedSettings;
  onChange: (settings: UnlimitedSettings) => void;
  categories: GameCategoriesResponse | null;
  onClose?: () => void; // required for the modal variant
}

function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((existing) => existing !== id) : [...ids, id];
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition cursor-pointer ${
        checked ? 'bg-red-600' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

interface DimensionOverlayProps {
  dimensionLabel: string;
  categories: CategoryOption[];
  excludedCategoryIds: string[];
  onToggleCategory: (categoryId: string) => void;
  onToggleAll: (selectAll: boolean) => void;
  onClose: () => void;
}

// A focused detail view for one dimension's values. Opened by clicking a
// dimension chip; the chip itself never includes/excludes anything — only
// the checkboxes (and the All shortcut) here do.
function DimensionOverlay({
  dimensionLabel,
  categories,
  excludedCategoryIds,
  onToggleCategory,
  onToggleAll,
  onClose,
}: DimensionOverlayProps) {
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const allSelected = categories.every((cat) => !excludedCategoryIds.includes(cat.id));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-60" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-lg w-80 max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
          <h3 className="font-bold capitalize">{dimensionLabel}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 cursor-pointer text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-700">All</span>
          <ToggleSwitch checked={allSelected} onChange={onToggleAll} />
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-3 grid grid-cols-2 gap-x-3 gap-y-2">
          {categories.map((cat) => (
            <label key={cat.id} className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={!excludedCategoryIds.includes(cat.id)}
                onChange={() => onToggleCategory(cat.id)}
              />
              {cat.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function UnlimitedSettingsPanel({
  variant,
  settings,
  onChange,
  categories,
  onClose,
}: UnlimitedSettingsPanelProps) {
  const [expandedDimension, setExpandedDimension] = useState<string | null>(null);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose?.();
    }
    if (variant === 'modal') {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [variant, onClose]);

  const expandedDimensionData = categories?.dimensions.find((d) => d.dimension === expandedDimension) ?? null;

  const panel = (
    <div
      className="bg-white rounded-xl shadow-lg w-full max-w-md flex flex-col max-h-[80vh]"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative px-5 pt-5 pb-3 border-b border-gray-100">
        <h2 className="font-bold text-lg text-center">Settings</h2>
        {variant === 'modal' && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 cursor-pointer text-lg leading-none"
          >
            ✕
          </button>
        )}
      </div>

      <div className="overflow-y-auto flex-1">
        <div className="flex items-center justify-center gap-6 flex-wrap px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Unlimited Guesses</span>
            <ToggleSwitch
              checked={settings.unlimitedGuesses}
              onChange={(value) => onChange({ ...settings, unlimitedGuesses: value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Soft Lock Guard</span>
            <ToggleSwitch
              checked={settings.softLockGuard}
              onChange={(value) => onChange({ ...settings, softLockGuard: value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Allow Single Answers</span>
            <ToggleSwitch
              checked={settings.allowSingleAnswers}
              onChange={(value) => onChange({ ...settings, allowSingleAnswers: value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Show Timer</span>
            <ToggleSwitch
              checked={settings.showTimer}
              onChange={(value) => onChange({ ...settings, showTimer: value })}
            />
          </div>
        </div>

        <div className="px-5 py-4">
          {!categories && <p className="text-sm text-gray-400 text-center">Loading categories...</p>}

          <div className="flex flex-wrap justify-center gap-2">
            {categories?.dimensions.map((dim) => {
              const total = dim.categories.length;
              const remaining = dim.categories.filter((c) => !settings.excludedCategoryIds.includes(c.id)).length;

              return (
                <button
                  key={dim.dimension}
                  type="button"
                  onClick={() => setExpandedDimension(dim.dimension)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition cursor-pointer ${
                    remaining === 0
                      ? 'border-gray-300 text-gray-400 hover:bg-gray-50'
                      : 'border-red-400 text-red-600 hover:bg-red-50'
                  }`}
                >
                  <span className="capitalize">{dim.dimension.replace(/_/g, ' ')}</span>
                  {remaining < total && (
                    <span className="text-xs font-normal">
                      ({remaining}/{total})
                    </span>
                  )}
                  <span className="text-xs">▾</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {variant === 'inline' ? (
        <div className="flex justify-center px-4">{panel}</div>
      ) : (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center pt-16 z-50" onClick={onClose}>
          {panel}
        </div>
      )}

      {expandedDimensionData && (
        <DimensionOverlay
          dimensionLabel={expandedDimensionData.dimension.replace(/_/g, ' ')}
          categories={expandedDimensionData.categories}
          excludedCategoryIds={settings.excludedCategoryIds}
          onToggleCategory={(categoryId) =>
            onChange({ ...settings, excludedCategoryIds: toggleId(settings.excludedCategoryIds, categoryId) })
          }
          onToggleAll={(selectAll) => {
            const ids = expandedDimensionData.categories.map((c) => c.id);
            onChange({
              ...settings,
              excludedCategoryIds: selectAll
                ? settings.excludedCategoryIds.filter((id) => !ids.includes(id))
                : Array.from(new Set([...settings.excludedCategoryIds, ...ids])),
            });
          }}
          onClose={() => setExpandedDimension(null)}
        />
      )}
    </>
  );
}
