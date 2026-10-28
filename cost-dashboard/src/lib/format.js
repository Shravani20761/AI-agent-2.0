export function formatInr(value, empty = '—') {
  if (value == null || Number.isNaN(Number(value))) return empty;
  return `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
}

export function formatCount(value) {
  if (value == null) return '—';
  return Number(value).toLocaleString('en-IN');
}

export function formatDuration(totalSeconds) {
  if (totalSeconds == null || Number.isNaN(Number(totalSeconds))) return '—';
  const seconds = Math.max(0, Math.floor(Number(totalSeconds)));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  const clock = `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
  return hours > 0 ? `${hours}:${clock}` : clock;
}

export function formatClock(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-IN', { hour12: false });
}

export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export function modeLabel(mode) {
  if (mode === 'GEMINI_LIVE') return 'Gemini Live';
  if (mode === 'SARVAM_PIPELINE') return 'Sarvam Pipeline';
  return mode || '—';
}

export function argumentPreview(args) {
  if (!args || typeof args !== 'object') return '';
  const preferred = ['course_slug', 'query', 'type', 'name', 'phone'];
  const key = preferred.find((item) => args[item]) || Object.keys(args)[0];
  if (!key) return '';
  const value = String(args[key]);
  return `${key}: ${value.length > 48 ? `${value.slice(0, 45)}…` : value}`;
}

export function resultPreview(result) {
  if (result == null) return '';
  if (typeof result === 'string') return result.slice(0, 140);
  const text = JSON.stringify(result);
  return text.length > 160 ? `${text.slice(0, 157)}…` : text;
}
