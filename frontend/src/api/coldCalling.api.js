import { api } from './client.js';

export const coldCallingApi = {
  list:            (params = {}) => api.get('/cold-calls?' + new URLSearchParams(params)),
  stats:           ()            => api.get('/cold-calls/stats'),
  logCall:         (body)        => api.post('/cold-calls', body),
  listContacts:    (params = {}) => api.get('/cold-calls/contacts?' + new URLSearchParams(params)),
  importContacts:  (body)        => api.post('/cold-calls/import', body),
};
