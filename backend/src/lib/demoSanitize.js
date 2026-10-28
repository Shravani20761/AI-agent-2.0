const SECRET_KEY = /api[_-]?key|secret|password|token|authorization|credential/i;
const PHONE_KEY = /phone|mobile/i;
const EMAIL_KEY = /email/i;

function maskPhone(value) {
  const digits = String(value).replace(/\D/g, '');
  if (digits.length < 4) return '[redacted]';
  return `***${digits.slice(-2)}`;
}

function maskEmail(value) {
  const text = String(value);
  const at = text.indexOf('@');
  if (at < 1) return '[redacted]';
  return `${text[0]}***${text.slice(at)}`;
}

function redact(value, depth) {
  if (depth > 6) return '[truncated]';
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => redact(item, depth + 1));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      if (SECRET_KEY.test(key)) out[key] = '[redacted]';
      else if (PHONE_KEY.test(key)) out[key] = maskPhone(item);
      else if (EMAIL_KEY.test(key)) out[key] = maskEmail(item);
      else out[key] = redact(item, depth + 1);
    }
    return out;
  }
  if (typeof value === 'string' && value.length > 500) return `${value.slice(0, 500)}…`;
  return value;
}

export function sanitizePayload(value) {
  const clean = redact(value ?? {}, 0);
  if (JSON.stringify(clean).length > 16_000) {
    const error = new Error('Tool payload exceeds 16KB after redaction');
    error.status = 413;
    return { error };
  }
  return { value: clean };
}
