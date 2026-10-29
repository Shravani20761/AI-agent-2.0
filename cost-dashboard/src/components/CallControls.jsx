import { useEffect } from 'react';

const LABELS = {
  IDLE: 'Idle',
  CONNECTING: 'Connecting',
  WAITING: 'Waiting for agent',
  IN_CALL: 'In call',
  ENDED: 'Ended',
};

export default function CallControls({
  status,
  contact,
  onContact,
  onStart,
  onEnd,
  onMicPress,
  muted,
  audioBlocked,
  onEnableAudio,
  error,
}) {
  const active = status === 'CONNECTING' || status === 'WAITING' || status === 'IN_CALL';
  const inCall = status === 'IN_CALL';

  // Hold Space to talk — ignored when typing in a field, ignored on key repeat.
  useEffect(() => {
    if (!inCall) return;
    const isTyping = () => {
      const el = document.activeElement;
      return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
    };
    const down = (e) => {
      if (e.code === 'Space' && !e.repeat && !isTyping()) {
        e.preventDefault();
        onMicPress(true);
      }
    };
    const up = (e) => {
      if (e.code === 'Space' && !isTyping()) {
        e.preventDefault();
        onMicPress(false);
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [inCall, onMicPress]);

  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Call</h2>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
          status === 'IN_CALL' ? 'bg-secondary/15 text-secondary' : 'bg-background text-muted'
        }`}
        >
          {LABELS[status] || status}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-xs text-muted">
          Name
          <input
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm text-ink"
            value={contact.name}
            disabled={active}
            onChange={(e) => onContact({ ...contact, name: e.target.value })}
          />
        </label>
        <label className="text-xs text-muted">
          Phone
          <input
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm text-ink"
            value={contact.phone}
            disabled={active}
            onChange={(e) => onContact({ ...contact, phone: e.target.value })}
          />
        </label>
        <label className="text-xs text-muted">
          Course
          <input
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm text-ink"
            value={contact.course}
            disabled={active}
            onChange={(e) => onContact({ ...contact, course: e.target.value })}
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {!active && (
          <button
            type="button"
            onClick={onStart}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            Start call
          </button>
        )}

        {active && (
          <>
            {audioBlocked && (
              <button
                type="button"
                onClick={onEnableAudio}
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400"
              >
                Tap to enable sound
              </button>
            )}

            {inCall && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onPointerDown={(e) => { e.preventDefault(); onMicPress(true); }}
                  onPointerUp={(e) => { e.preventDefault(); onMicPress(false); }}
                  onPointerLeave={() => !muted && onMicPress(false)}
                  onPointerCancel={() => onMicPress(false)}
                  className={`select-none rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${
                    !muted
                      ? 'bg-secondary text-white shadow-md shadow-secondary/30'
                      : 'border border-line bg-surface hover:border-secondary/50'
                  }`}
                >
                  {!muted ? 'Listening — release' : 'Hold to talk'}
                </button>
                <span className="text-xs text-muted">or hold Space</span>
              </div>
            )}

            <button
              type="button"
              onClick={onEnd}
              className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white"
            >
              End call
            </button>
          </>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </section>
  );
}
