import { Routes, Route, Outlet } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import PuzzlePage from './pages/PuzzlePage';
import UnlimitedPage from './pages/UnlimitedPage';
import LegalPage from './pages/LegalPage';
import NotFoundPage from './pages/NotFoundPage';

function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-100 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
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
        <Route path="/:game" element={<PuzzlePage />} />
        <Route path="/:game/unlimited" element={<UnlimitedPage />} />
        <Route path="/legal" element={<LegalPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;