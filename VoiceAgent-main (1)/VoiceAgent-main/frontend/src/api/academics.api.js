import { api } from './client.js';

const qs = (params = {}) => {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null));
  const s = new URLSearchParams(clean).toString();
  return s ? `?${s}` : '';
};

export const academicsApi = {
  // Timetable
  listTimetable:  (params = {}) => api.get('/academics/timetable' + qs(params)),
  saveTimetable:  (body)        => api.post('/academics/timetable', body),
  deleteTimetable:(id)          => api.delete(`/academics/timetable/${id}`),

  // Teacher availability
  listAvailability:  (params = {}) => api.get('/academics/availability' + qs(params)),
  setAvailability:   (body)        => api.post('/academics/availability', body),
  deleteAvailability:(id)          => api.delete(`/academics/availability/${id}`),

  // Test schedule
  listTests:  (params = {}) => api.get('/academics/tests' + qs(params)),
  createTest: (body)        => api.post('/academics/tests', body),
  updateTest: (id, body)    => api.patch(`/academics/tests/${id}`, body),
  deleteTest: (id)          => api.delete(`/academics/tests/${id}`),

  // FAQ
  listFaqs:  (params = {}) => api.get('/academics/faqs' + qs(params)),
  createFaq: (body)        => api.post('/academics/faqs', body),
  updateFaq: (id, body)    => api.patch(`/academics/faqs/${id}`, body),
  deleteFaq: (id)          => api.delete(`/academics/faqs/${id}`),
};
