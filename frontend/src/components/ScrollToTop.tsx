import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// React Router doesn't reset scroll position on navigation the way a full
// page load does - without this, clicking a link while scrolled down (e.g.
// the footer's Fan Content & Privacy link from the bottom of a long page)
// lands on the new page still scrolled to that same pixel offset instead of
// its top. Mounted once inside the router; runs on every pathname change.
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
