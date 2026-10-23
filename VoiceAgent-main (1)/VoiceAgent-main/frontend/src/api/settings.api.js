import { api } from './client.js';

export const settingsApi = {
  get:    () => api.get('/settings'),
  update: (body) => api.patch('/settings', body),
  clearDb: () => api.post('/settings/clear-db', { confirm: 'CLEAR' }),
};
