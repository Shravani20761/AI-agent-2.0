import { NavLink, Route, Routes } from 'react-router-dom';
import CallRoom from './pages/CallRoom.jsx';
import History from './pages/History.jsx';

function linkClass({ isActive }) {
  return `rounded-full px-3 py-1 text-sm ${isActive ? 'bg-primary text-white' : 'text-ink'}`;
}

export default function App() {
  return (
    <div className="min-h-screen">
      <nav className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <span className="text-sm font-semibold">Seagull · Demo cost</span>
          <div className="flex gap-2">
            <NavLink to="/" end className={linkClass}>Benchmark</NavLink>
            <NavLink to="/history" className={linkClass}>History</NavLink>
          </div>
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<CallRoom />} />
        <Route path="/history" element={<History />} />
      </Routes>
    </div>
  );
}
