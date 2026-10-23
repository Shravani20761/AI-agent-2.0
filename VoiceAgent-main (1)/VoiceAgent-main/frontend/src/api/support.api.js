import { api } from './client.js';

export const supportApi = {
  list:    (params = {}) => api.get('/support?' + new URLSearchParams(params)),
  create:  (body)        => api.post('/support', body),
  resolve: (id, notes)   => api.patch(`/support/${id}/resolve`, { notes }),
  assign:  (id, userId)  => api.patch(`/support/${id}/assign`, { userId }),
  callLogs:(params = {}) => api.get('/support/call-logs?' + new URLSearchParams(params)),
};
