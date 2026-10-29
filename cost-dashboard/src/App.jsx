import { useState } from 'react';
import { NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import CallRoom from './pages/CallRoom.jsx';
import History from './pages/History.jsx';
import { demoApi } from './api/demo.api.js';

function linkClass({ isActive }) {
  return `rounded-full px-3 py-1 text-sm ${isActive ? 'bg-primary text-white' : 'text-ink'}`;
}

function ResetButton({ onReset }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleReset() {
    if (!window.confirm('Reset all demo data? This deletes all call history and cannot be undone.')) return;
    setBusy(true);
    setError('');
    try {
      await demoApi.clearHistory();
      onReset();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-danger">{error}</span>}
      <button
        type="button"
        onClick={handleReset}
        disabled={busy}
        className="rounded-lg border border-danger/40 px-3 py-1.5 text-sm text-danger hover:bg-danger/5 disabled:opacity-50"
      >
        {busy ? 'Resetting…' : 'Reset data'}
      </button>
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const [resetKey, setResetKey] = useState(0);

  function handleReset() {
    setResetKey((k) => k + 1);
    navigate('/');
  }

  return (
    <div className="min-h-screen">
      <nav className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <span className="text-sm font-semibold">Seagull · Demo cost</span>
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <NavLink to="/" end className={linkClass}>Benchmark</NavLink>
              <NavLink to="/history" className={linkClass}>History</NavLink>
            </div>
            <div className="h-4 w-px bg-line" />
            <ResetButton onReset={handleReset} />
          </div>
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<CallRoom key={resetKey} />} />
        <Route path="/history" element={<History key={resetKey} />} />
      </Routes>
    </div>
  );
}
