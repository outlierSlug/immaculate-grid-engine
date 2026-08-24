import { Routes, Route, Outlet } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import HomePage from './pages/HomePage';
import PuzzlePage from './pages/PuzzlePage';
import UnlimitedPage from './pages/UnlimitedPage';
import ArchiveListPage from './pages/ArchiveListPage';
import ProfilePage from './pages/ProfilePage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import LegalPage from './pages/LegalPage';
import NotFoundPage from './pages/NotFoundPage';
import AdminPage from './pages/AdminPage';

function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-100 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <ScrollToTop />
      <Header />
      {/* flex-1 pins Footer to the viewport bottom on short pages (e.g. the
          puzzle grid) while still letting it fall after content that's
          taller than the viewport (e.g. HomePage's own min-h-screen). */}
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        {/* No nav link anywhere points here - admin-only, reached by a
            bookmarked URL. Static path so it out-ranks the /:game param
            route regardless of declaration order. */}
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/:game" element={<PuzzlePage />} />
        <Route path="/:game/unlimited" element={<UnlimitedPage />} />
        <Route path="/:game/archive" element={<ArchiveListPage />} />
        {/* Reuses PuzzlePage itself (via the optional :date param) rather
            than a separate component - see PuzzlePage's isArchive branch. */}
        <Route path="/:game/archive/:date" element={<PuzzlePage />} />
        <Route path="/legal" element={<LegalPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;