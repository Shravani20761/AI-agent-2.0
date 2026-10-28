import { api } from './client.js';

export const admissionsApi = {
  getPipeline:  ()             => api.get('/admissions'),
  getStats:     ()             => api.get('/admissions/stats'),
  getById:      (id)           => api.get(`/admissions/${id}`),
  create:       (body)         => api.post('/admissions', body),
  advanceStage: (id, body)     => api.patch(`/admissions/${id}/stage`, body),
  recordDemoOutcome: (body)    => api.post('/admissions/demo-outcome', body),
};
