import { Routes, Route, Outlet } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import PuzzlePage from './pages/PuzzlePage';

function Layout() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <Outlet />
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/:game" element={<PuzzlePage />} />
      </Route>
    </Routes>
  );
}

export default App;