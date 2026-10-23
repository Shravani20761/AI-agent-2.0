import { api } from './client.js';

export const studentsApi = {
  list:        (params = {}) => api.get('/students?' + new URLSearchParams(params)),
  getById:     (id)          => api.get(`/students/${id}`),
  update:      (id, body)    => api.patch(`/students/${id}`, body),
  create:      (body)        => api.post('/students', body),
  bulkImport:  (rows)        => api.post('/students/bulk', rows),
  assignBatch: (id, batchId) => api.patch(`/students/${id}/batch`, { batchId }),
  courses:     ()            => api.get('/courses'),
  batches:     (courseId)    => api.get('/courses/batches' + (courseId ? `?courseId=${courseId}` : '')),
};
