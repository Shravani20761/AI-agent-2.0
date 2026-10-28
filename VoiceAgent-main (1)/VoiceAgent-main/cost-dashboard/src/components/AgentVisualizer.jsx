const BAR_CONFIG = [
  { maxH: 28, delay: '0ms' },
  { maxH: 44, delay: '120ms' },
  { maxH: 56, delay: '60ms' },
  { maxH: 40, delay: '180ms' },
  { maxH: 32, delay: '30ms' },
  { maxH: 52, delay: '90ms' },
  { maxH: 36, delay: '150ms' },
];

const STYLE = `
@keyframes bar-wave {
  0%, 100% { height: 4px; }
  50%       { height: var(--bar-max-h); }
}
.bar-animate {
  animation: bar-wave 700ms ease-in-out infinite;
}
`;

export default function AgentVisualizer({ speaking, status }) {
  const isActive = status === 'IN_CALL';

  return (
    <>
      <style>{STYLE}</style>
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface px-6 py-5">
        {/* dot + label */}
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full transition-colors duration-300 ${
              speaking ? 'bg-secondary shadow-[0_0_6px_2px_rgba(34,197,94,0.5)]' : isActive ? 'bg-yellow-400' : 'bg-muted/40'
            }`}
          />
          <span className="text-xs font-semibold tracking-widest text-muted">
            PRIYA
          </span>
        </div>

        {/* waveform bars */}
        <div className="flex h-14 items-end gap-1">
          {BAR_CONFIG.map((bar, i) => (
            <div
              key={i}
              className={`w-1.5 rounded-full transition-colors duration-300 ${speaking ? 'bg-secondary bar-animate' : 'bg-line'}`}
              style={{
                '--bar-max-h': `${bar.maxH}px`,
                animationDelay: bar.delay,
                height: speaking ? undefined : '4px',
              }}
            />
          ))}
        </div>

        {/* status text */}
        <p className={`text-xs font-medium transition-colors duration-300 ${
          speaking ? 'text-secondary' : isActive ? 'text-yellow-500' : 'text-muted/60'
        }`}>
          {speaking ? 'Speaking…' : isActive ? 'Listening' : status === 'WAITING' ? 'Waiting for agent' : status === 'CONNECTING' ? 'Connecting…' : 'Idle'}
        </p>
      </div>
    </>
  );
}
