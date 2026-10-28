import { api } from './client.js';

export const followUpsApi = {
  list:       (params = {}) => api.get('/follow-ups?' + new URLSearchParams(params)),
  create:     (body)        => api.post('/follow-ups', body),
  complete:   (id, notes)   => api.patch(`/follow-ups/${id}/complete`, { notes }),
  reschedule: (id, dueAt, notes) => api.patch(`/follow-ups/${id}/reschedule`, { dueAt, notes }),
};
