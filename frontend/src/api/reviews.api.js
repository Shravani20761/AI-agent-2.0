import { api } from './client.js';

export const reviewsApi = {
  list:        (params = {}) => api.get('/reviews?' + new URLSearchParams(params)),
  create:      (body)        => api.post('/reviews', body),
  markReceived:(id)          => api.patch(`/reviews/${id}/received`, {}),
};
