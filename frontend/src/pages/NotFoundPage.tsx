import { Link } from 'react-router-dom';
import BrandMark from '../components/BrandMark';

// Catch-all for any URL that doesn't match a real route (typo, stale
// bookmark, bad link) - without this, react-router renders nothing at all
// under the header, which reads as a broken page rather than a wrong URL.
export default function NotFoundPage() {
  return (
    <main className="min-h-[70vh] flex flex-col items-center justify-center gap-5 px-6 text-center motion-safe:animate-[page-in_350ms_ease-out]">
      <BrandMark className="w-14 h-14" />
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">Page not found</h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-sm">
          That page doesn't exist, or the link is out of date.
        </p>
      </div>
      <Link
        to="/"
        className="px-5 py-2.5 rounded-full bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition"
      >
        Back to home
      </Link>
    </main>
  );
}
