import { useId } from 'react';

interface BrandMarkProps {
  className?: string;
}

// Original site glyph — a 3x3 grid with one filled cell, echoing the
// puzzle mechanic itself (pick a cell that satisfies its row/column).
// Deliberately neutral vs. both games' own brand colors (indigo/violet).
export default function BrandMark({ className = 'w-8 h-8' }: BrandMarkProps) {
  const gradientId = useId();

  return (
    <svg viewBox="0 0 32 32" className={className} role="img" aria-label="GachaGrid">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${gradientId})`} />
      <g fill="white">
        <rect x="6" y="6" width="5.5" height="5.5" rx="1.4" opacity="0.5" />
        <rect x="13.25" y="6" width="5.5" height="5.5" rx="1.4" opacity="0.5" />
        <rect x="20.5" y="6" width="5.5" height="5.5" rx="1.4" opacity="0.5" />
        <rect x="6" y="13.25" width="5.5" height="5.5" rx="1.4" opacity="0.5" />
        <rect x="13.25" y="13.25" width="5.5" height="5.5" rx="1.4" />
        <rect x="20.5" y="13.25" width="5.5" height="5.5" rx="1.4" opacity="0.5" />
        <rect x="6" y="20.5" width="5.5" height="5.5" rx="1.4" opacity="0.5" />
        <rect x="13.25" y="20.5" width="5.5" height="5.5" rx="1.4" opacity="0.5" />
        <rect x="20.5" y="20.5" width="5.5" height="5.5" rx="1.4" opacity="0.5" />
      </g>
    </svg>
  );
}
