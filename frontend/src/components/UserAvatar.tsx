import { useState } from 'react';

interface UserAvatarProps {
  avatarUrl: string | null;
  displayName: string;
  // Tailwind size classes, e.g. "w-8 h-8" - varies per call site (Header's
  // small icon vs Profile's large portrait vs the inline pick marker).
  sizeClass: string;
  textSizeClass?: string;
  alt?: string;
}

// Google's avatar photo URLs occasionally fail to load in the browser even
// though the URL itself is valid (observed: Google's CDN can 429 an <img>
// request depending on the page's Origin, independent of anything this app
// controls) - falling back to the initials badge on a load error, not just
// when avatarUrl is absent, keeps a real photo failure from rendering as a
// broken-image icon instead of this same fallback every other missing-photo
// case already uses.
export default function UserAvatar({ avatarUrl, displayName, sizeClass, textSizeClass = 'text-sm', alt = '' }: UserAvatarProps) {
  const [failed, setFailed] = useState(false);

  if (avatarUrl && !failed) {
    return (
      <img
        src={avatarUrl}
        alt={alt}
        className={`${sizeClass} rounded-full object-cover shrink-0`}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span
      className={`flex items-center justify-center ${sizeClass} rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-500/30 dark:text-indigo-200 font-semibold ${textSizeClass} shrink-0`}
      aria-label={alt || displayName}
    >
      {displayName.charAt(0).toUpperCase()}
    </span>
  );
}
