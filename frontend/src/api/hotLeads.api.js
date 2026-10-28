import { api } from './client.js';

export const hotLeadsApi = {
  list:   (params = {}) => api.get('/warm-leads?' + new URLSearchParams(params)),
  getById: (id)         => api.get(`/warm-leads/${id}`),
  create: (body)        => api.post('/warm-leads', body),
  update: (id, body)    => api.patch(`/warm-leads/${id}`, body),
};
