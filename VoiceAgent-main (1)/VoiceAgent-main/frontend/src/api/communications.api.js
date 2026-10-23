import { api } from './client.js';

export const communicationsApi = {
  list:    (params = {}) => api.get('/communications?' + new URLSearchParams(params)),
  addNote: (body)        => api.post('/communications', body),
};
