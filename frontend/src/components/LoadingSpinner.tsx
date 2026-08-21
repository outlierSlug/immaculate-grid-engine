interface LoadingSpinnerProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<LoadingSpinnerProps['size']>, string> = {
  sm: 'w-5 h-5 border-2',
  md: 'w-8 h-8 border-[3px]',
  lg: 'w-12 h-12 border-4',
};

// One shared spinner instead of ad-hoc "Loading..." text per callsite -
// used anywhere a fetch/generation is in flight (today's puzzle, Unlimited
// categories, the character search list) so a slow network reads as
// "working" rather than a blank/broken page.
export default function LoadingSpinner({ label, size = 'md', className = '' }: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div
        className={`${SIZE_CLASSES[size]} rounded-full border-gray-200 dark:border-gray-700 border-t-indigo-500 dark:border-t-indigo-400 animate-spin`}
        role="status"
        aria-label={label ?? 'Loading'}
      />
      {label && <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>}
    </div>
  );
}
