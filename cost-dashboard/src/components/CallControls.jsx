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
  onMute,
  muted,
  error,
}) {
  const active = status === 'CONNECTING' || status === 'WAITING' || status === 'IN_CALL';

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
            onChange={(event) => onContact({ ...contact, name: event.target.value })}
          />
        </label>
        <label className="text-xs text-muted">
          Phone
          <input
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm text-ink"
            value={contact.phone}
            disabled={active}
            onChange={(event) => onContact({ ...contact, phone: event.target.value })}
          />
        </label>
        <label className="text-xs text-muted">
          Course
          <input
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm text-ink"
            value={contact.course}
            disabled={active}
            onChange={(event) => onContact({ ...contact, course: event.target.value })}
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
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
            <button
              type="button"
              onClick={onMute}
              className="rounded-lg border border-line px-4 py-2 text-sm font-semibold"
            >
              {muted ? 'Unmute' : 'Mute'}
            </button>
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
