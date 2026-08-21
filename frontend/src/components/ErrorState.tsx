interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

// Pairs with LoadingSpinner - anywhere a fetch can fail, it should land
// here instead of leaving the previous (loading, or blank) state up
// forever with no way out. onRetry is optional since some callers (e.g. a
// fire-and-forget stats refresh) don't have a meaningful retry action.
export default function ErrorState({ message, onRetry, className = '' }: ErrorStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 text-center ${className}`}>
      <svg
        className="w-6 h-6 text-red-500 dark:text-red-400 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
      <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer"
        >
          Try again
        </button>
      )}
    </div>
  );
}
