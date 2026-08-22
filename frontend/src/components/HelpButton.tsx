interface HelpButtonProps {
  onClick: () => void;
  label: string;
}

// Small (i) icon meant to sit beside a page's centered <h1> - opens that
// page's own HelpModal. Deliberately just an icon button (no tooltip like
// the header's icon buttons have) since the click target already reads as
// "more info" next to a title.
export default function HelpButton({ onClick, label }: HelpButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-indigo-600 dark:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-indigo-400 transition cursor-pointer"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
      </svg>
    </button>
  );
}
