import { Fragment, useEffect, useMemo, useState } from 'react';
import { demoApi } from '../api/demo.api.js';
import { formatDate, formatDuration, formatInr, modeLabel, argumentPreview, resultPreview, formatClock } from '../lib/format.js';

const FILTERS = [
  { id: '', label: 'All' },
  { id: 'GEMINI_LIVE', label: 'Gemini Live' },
  { id: 'SARVAM_PIPELINE', label: 'Sarvam Pipeline' },
];

export default function History() {
  const [filter, setFilter] = useState('');
  const [calls, setCalls] = useState([]);
  const [sort, setSort] = useState({ key: 'startedAt', direction: 'desc' });
  const [openId, setOpenId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load(nextFilter = filter) {
    setLoading(true);
    setError('');
    try {
      const data = await demoApi.listCalls({ limit: 100, mode: nextFilter || undefined });
      setCalls(data.calls || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(filter);
  }, [filter]);

  const rows = useMemo(() => {
    const copy = [...calls];
    copy.sort((left, right) => {
      const a = left[sort.key];
      const b = right[sort.key];
      const numeric = typeof a === 'number' || typeof b === 'number';
      const result = numeric
        ? (a ?? -1) - (b ?? -1)
        : String(a ?? '').localeCompare(String(b ?? ''));
      return sort.direction === 'asc' ? result : -result;
    });
    return copy;
  }, [calls, sort]);

  function toggleSort(key) {
    setSort((current) => (
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'desc' }
    ));
  }

  async function expand(id) {
    if (openId === id) {
      setOpenId(null);
      setDetail(null);
      return;
    }
    setOpenId(id);
    setDetail(null);
    try {
      const data = await demoApi.getCall(id);
      setDetail(data.call);
    } catch (detailError) {
      setError(detailError.message);
    }
  }

  async function clearHistory() {
    const label = filter ? modeLabel(filter) : 'all demo';
    if (!window.confirm(`Delete ${label} call history? CRM records stay.`)) return;
    try {
      await demoApi.clearHistory(filter || undefined);
      setOpenId(null);
      setDetail(null);
      await load(filter);
    } catch (clearError) {
      setError(clearError.message);
    }
  }

  const columns = [
    ['startedAt', 'Date'],
    ['mode', 'Mode'],
    ['contactName', 'Contact'],
    ['durationSecs', 'Duration'],
    ['totalCostInr', 'Cost'],
    ['costPerMinInr', '₹/min'],
    ['toolCallCount', 'Tool calls'],
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Call history</h1>
          <p className="mt-1 text-sm text-muted">Demo calls only. Phone numbers are masked.</p>
        </div>
        <button type="button" onClick={clearHistory} className="rounded-lg border border-danger/40 px-3 py-2 text-sm text-danger">
          Clear history
        </button>
      </div>
      <div className="mb-4 flex gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.id || 'all'}
            type="button"
            onClick={() => setFilter(item.id)}
            className={`rounded-full px-3 py-1 text-sm ${filter === item.id ? 'bg-primary text-white' : 'bg-white text-ink'}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {error && <p className="mb-3 text-sm text-danger">{error}</p>}
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full min-w-[48rem] text-left">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
              {columns.map(([key, label]) => (
                <th key={key} className="px-3 py-2 font-medium">
                  <button type="button" onClick={() => toggleSort(key)}>{label}</button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-sm text-muted">No demo calls yet.</td>
              </tr>
            )}
            {rows.map((row) => (
              <Fragment key={row.id}>
                <tr
                  onClick={() => expand(row.id)}
                  className="cursor-pointer border-b border-line/70 hover:bg-background"
                >
                  <td className="px-3 py-2 text-sm">{formatDate(row.startedAt)}</td>
                  <td className="px-3 py-2 text-sm">{modeLabel(row.mode)}</td>
                  <td className="px-3 py-2 text-sm">
                    {row.contactName || '—'}
                    <span className="ml-2 text-xs text-muted">{row.contactPhone || ''}</span>
                  </td>
                  <td className="px-3 py-2 text-sm tabular-nums">{formatDuration(row.durationSecs)}</td>
                  <td className="px-3 py-2 text-sm tabular-nums">{formatInr(row.totalCostInr)}</td>
                  <td className="px-3 py-2 text-sm tabular-nums">{formatInr(row.costPerMinInr)}</td>
                  <td className="px-3 py-2 text-sm tabular-nums">{row.toolCallCount ?? 0}</td>
                </tr>
                {openId === row.id && (
                  <tr key={`${row.id}-detail`} className="border-b border-line bg-background">
                    <td colSpan={7} className="px-4 py-3">
                      <div className="text-xs text-muted">{row.status} · {row.roomName}</div>
                      {!detail && <p className="mt-2 text-sm text-muted">Loading tool log…</p>}
                      {detail?.id === row.id && (detail.toolCalls || []).length === 0 && (
                        <p className="mt-2 text-sm text-muted">No tool calls on this call.</p>
                      )}
                      {detail?.id === row.id && (detail.toolCalls || []).map((tool) => (
                        <div key={tool.id} className="mt-2 text-sm">
                          <span className={tool.success ? 'text-secondary' : 'text-danger'}>{formatClock(tool.calledAt)} {tool.toolName}</span>
                          <span className="ml-2 text-xs text-muted">{argumentPreview(tool.arguments)}</span>
                          <div className="font-mono text-xs">{resultPreview(tool.result)}</div>
                        </div>
                      ))}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
