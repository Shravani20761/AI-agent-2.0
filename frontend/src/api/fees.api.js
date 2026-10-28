import { api } from './client.js';

export const feesApi = {
  list:          (params = {}) => api.get('/fees?' + new URLSearchParams(params)),
  getStats:      ()            => api.get('/fees/stats'),
  getByStudent:  (studentId)   => api.get(`/fees/student/${studentId}`),
  createFeePlan: (body)        => api.post('/fees/plan', body),
  recordPayment: (body)        => api.post('/fees/payment', body),
};
