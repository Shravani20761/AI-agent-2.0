import { api } from './client';

export const voicekitApi = {
  getConfig: () => api.get('/voicekit/config'),
  createToken: (roomName, contactName) =>
    api.post('/voicekit/token', {
      roomName,
      identity: `user-${Date.now()}`,
      contactName,
    }),
};
