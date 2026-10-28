import { useEffect, useRef } from 'react';
import { argumentPreview, formatClock, resultPreview } from '../lib/format.js';

export default function ToolCallFeed({ toolCalls }) {
  const endRef = useRef(null);
  const rows = toolCalls || [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [rows.length]);

  return (
    <section className="flex h-full min-h-72 flex-col rounded-2xl border border-line bg-surface p-4">
      <h2 className="text-sm font-semibold">Tool calls</h2>
      <div className="mt-3 flex-1 space-y-3 overflow-y-auto pr-1">
        {rows.length === 0 && (
          <p className="text-sm text-muted">No tool calls yet. They appear here after Priya uses the CRM.</p>
        )}
        {rows.map((row) => (
          <article key={row.id} className="border-l-2 border-line pl-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className={`text-sm font-semibold ${row.success ? 'text-secondary' : 'text-danger'}`}>
                {row.toolName}
              </span>
              <time className="text-[11px] text-muted">{formatClock(row.calledAt)}</time>
            </div>
            {argumentPreview(row.arguments) && (
              <p className="mt-1 text-xs text-muted">{argumentPreview(row.arguments)}</p>
            )}
            <p className="mt-1 break-words font-mono text-xs text-ink">{resultPreview(row.result) || '—'}</p>
          </article>
        ))}
        <div ref={endRef} />
      </div>
    </section>
  );
}
