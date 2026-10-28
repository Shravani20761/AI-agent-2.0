import { BENCHMARK_CALLS } from '../constants/rates.js';
import { formatDuration, formatInr, modeLabel } from '../lib/format.js';

const MODES = ['GEMINI_LIVE', 'SARVAM_PIPELINE'];

function Cell({ children }) {
  return <td className="px-3 py-2 text-sm tabular-nums">{children}</td>;
}

export default function CostComparisonTable({ summary, error }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Benchmark</h2>
        <span className="text-xs text-muted">Completed calls only. Unpriced calls stay out of the money averages.</span>
      </div>
      {error && <p className="mb-3 text-sm text-danger">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] text-left">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
              <th className="px-3 py-2 font-medium">Metric</th>
              {MODES.map((mode) => {
                const row = summary?.[mode];
                const done = (row?.completedCallCount || 0) >= BENCHMARK_CALLS;
                return (
                  <th key={mode} className="px-3 py-2 font-medium">
                    {modeLabel(mode)}
                    {done && <span className="ml-2 text-secondary">Benchmark complete</span>}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-line/70">
              <Cell>Calls completed</Cell>
              {MODES.map((mode) => {
                const count = summary?.[mode]?.completedCallCount || 0;
                const width = Math.min(100, (count / BENCHMARK_CALLS) * 100);
                return (
                  <td key={mode} className="px-3 py-2">
                    <div className="text-sm tabular-nums">{count}/{BENCHMARK_CALLS}</div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-background">
                      <div className="h-full bg-primary" style={{ width: `${width}%` }} />
                    </div>
                  </td>
                );
              })}
            </tr>
            {[
              ['Avg ₹/min', (row) => formatInr(row?.avgCostPerMin)],
              ['Avg cost/call', (row) => formatInr(row?.avgTotalCost)],
              ['Avg duration', (row) => formatDuration(row?.avgDurationSecs)],
              ['Total spent', (row) => formatInr(row?.totalCostInr)],
              ['Failed', (row) => row?.failedCallCount || 0],
            ].map(([label, render]) => (
              <tr key={label} className="border-b border-line/70">
                <Cell>{label}</Cell>
                {MODES.map((mode) => <Cell key={mode}>{render(summary?.[mode])}</Cell>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
