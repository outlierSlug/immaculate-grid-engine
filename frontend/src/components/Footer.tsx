import { Link } from 'react-router-dom';

interface FooterLink {
  label: string;
  to?: string;
  href?: string;
}

// Array-driven so a Discord invite / contact link can be added later as a
// one-line entry, without touching the render logic below.
// TODO: add a "Contact" entry once there's a form endpoint (e.g. Formspree)
// to send bug reports/feedback to - no email address is exposed publicly.
const FOOTER_LINKS: FooterLink[] = [
  { label: 'GitHub', href: 'https://github.com/outlierSlug/immaculate-grid-engine' },
  { label: 'X/Twitter', href: 'https://x.com/GachaGridDev' },
  { label: 'Fan Content & Privacy', to: '/legal' },
];

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-5 flex flex-col items-center gap-2 text-center">
        <nav className="flex items-center gap-2.5">
          {FOOTER_LINKS.map((link, i) => (
            <span key={link.label} className="flex items-center gap-2.5">
              {i > 0 && (
                <span className="text-gray-300 dark:text-gray-700 text-xs" aria-hidden="true">
                  &middot;
                </span>
              )}
              {link.to ? (
                <Link
                  to={link.to}
                  className="text-sm font-medium text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition"
                >
                  {link.label}
                </a>
              )}
            </span>
          ))}
        </nav>
        <p className="text-xs text-gray-400 dark:text-gray-600">
          GachaGrid &copy; {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}
