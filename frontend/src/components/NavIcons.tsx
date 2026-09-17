import { useId } from 'react';

interface IconProps {
  className?: string;
}

export function ArchiveIcon({ className = 'w-4 h-4 shrink-0' }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

// Two fanned-out character cards with a silhouette on the front one, after
// Genshin's in-game Character Archive icon. The back card is masked out
// where the front card overlaps it (outline icons have no fill to hide it).
export function CollectionIcon({ className = 'w-4 h-4 shrink-0' }: IconProps) {
  // Unique per instance - the icon renders several times on one page.
  const maskId = `collection-icon-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <defs>
        <mask id={maskId}>
          <rect width="24" height="24" fill="white" />
          <rect x="1.5" y="4.5" width="17" height="20" rx="3.5" fill="black" stroke="none" transform="rotate(-8 10 14.5)" />
        </mask>
      </defs>
      <g mask={`url(#${maskId})`}>
        <rect x="9.5" y="2" width="11" height="15" rx="2" transform="rotate(12 15 9.5)" />
      </g>
      <g transform="rotate(-8 10 14.5)">
        <rect x="4" y="7" width="12" height="15" rx="2" />
        <circle cx="10" cy="12.5" r="2" />
        <path d="M6.75 19.25a3.25 3.25 0 0 1 6.5 0" />
      </g>
    </svg>
  );
}
