interface CategoryChipProps {
  label: string;
}

// Rough element -> color mapping, expand as needed.
// Falls back to a neutral gray for non-element categories (region, rarity, weapon).
const ELEMENT_COLORS: Record<string, string> = {
  Pyro: 'bg-red-100 text-red-800 border-red-300',
  Hydro: 'bg-blue-100 text-blue-800 border-blue-300',
  Anemo: 'bg-teal-100 text-teal-800 border-teal-300',
  Electro: 'bg-purple-100 text-purple-800 border-purple-300',
  Dendro: 'bg-green-100 text-green-800 border-green-300',
  Cryo: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  Geo: 'bg-amber-100 text-amber-800 border-amber-300',
};

export default function CategoryChip({ label }: CategoryChipProps) {
  const colorClasses = ELEMENT_COLORS[label] ?? 'bg-gray-100 text-gray-800 border-gray-300';

  return (
    <div
      className={`inline-flex items-center justify-center px-4 py-2 rounded-full border font-bold text-sm ${colorClasses}`}
    >
      {label}
    </div>
  );
}