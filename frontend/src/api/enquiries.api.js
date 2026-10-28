import { api } from './client.js';

export const enquiriesApi = {
  list:   (params = {}) => api.get('/enquiries?' + new URLSearchParams(params)),
  stats:  ()            => api.get('/enquiries/stats'),
  create: (body)        => api.post('/enquiries', body),
  update: (id, body)    => api.patch(`/enquiries/${id}`, body),
  remove: (id)          => api.delete(`/enquiries/${id}`),
};
