async function request(path, options = {}) {
  const response = await fetch(path, {
    method: options.method || 'GET',
    headers: options.body ? { 'content-type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    const offline = response.status >= 500 && !data.error;
    const error = new Error(
      data.error
      || (offline
        ? 'The demo API on port 3001 did not respond. Start the backend, then reload this page.'
        : `Request failed (${response.status})`),
    );
    error.status = response.status;
    throw error;
  }
  return data;
}

function query(params) {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value != null && value !== '') search.set(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : '';
}

export const demoApi = {
  getConfig: () => request('/api/demo/config'),
  setMode: (mode) => request('/api/demo/mode', { method: 'POST', body: { mode } }),
  startCall: (body) => request('/api/demo/call/start', { method: 'POST', body }),
  endCall: (id) => request(`/api/demo/call/${id}/end`, { method: 'POST', body: {} }),
  listCalls: (params) => request(`/api/demo/calls${query(params)}`),
  getCall: (id) => request(`/api/demo/calls/${id}`),
  getSummary: () => request('/api/demo/summary'),
  clearHistory: (mode) => request('/api/demo/calls', {
    method: 'DELETE',
    body: { confirm: 'DELETE_DEMO_HISTORY', ...(mode ? { mode } : {}) },
  }),
};
