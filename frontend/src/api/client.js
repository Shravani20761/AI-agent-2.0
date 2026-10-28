const RAW_BASE = import.meta.env.VITE_API_URL || '';
// Always talk to /api/* on the backend. If VITE_API_URL ends with /api, strip it;
// otherwise append it. This makes both "http://localhost:3001" and "/api" work
// without any caller having to think about the prefix.
const API_PREFIX = '/api';
const BASE = (() => {
  if (!RAW_BASE) return API_PREFIX;
  if (RAW_BASE.endsWith(API_PREFIX)) return RAW_BASE;
  return RAW_BASE.replace(/\/$/, '') + API_PREFIX;
})();

function getToken() {
  try {
    return JSON.parse(localStorage.getItem('voicecrm_session') || '{}').token || null;
  } catch {
    return null;
  }
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  const data = await res.json();
  if (res.status === 401) {
    // On the login endpoint, throw so the caller can show the error.
    // On protected routes, clear session and redirect.
    if (path === '/auth/login') {
      throw new Error(data.error || 'Invalid credentials');
    }
    localStorage.removeItem('voicecrm_session');
    localStorage.removeItem('voicecrm_user');
    window.location.href = '/login';
    return;
  }
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  get:    (path)         => request(path),
  post:   (path, body)   => request(path, { method: 'POST',   body: JSON.stringify(body) }),
  patch:  (path, body)   => request(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: (path)         => request(path, { method: 'DELETE' }),
};
