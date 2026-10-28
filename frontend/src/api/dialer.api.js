import { api } from './client.js';

export const dialerApi = {
  status:    ()       => api.get('/dialer/status'),
  control:   (action) => api.post('/dialer/control', { action }),
  queue:     (jobs)   => api.post('/dialer/queue', jobs),
  listQueue: (params = {}) => api.get('/dialer/queue?' + new URLSearchParams(params)),
  workflows: ()       => api.get('/dialer/workflows'),
  triggerColdCall:   (body) => api.post('/dialer/trigger/cold-call', body),
  triggerFollowUp:   (body) => api.post('/dialer/trigger/hot-lead', body),
  triggerAdmission:  (body) => api.post('/dialer/trigger/admission', body),
  triggerFeeRecovery:(body) => api.post('/dialer/trigger/fee-recovery', body),
  triggerEngagement: (body) => api.post('/dialer/trigger/engagement', body),
  triggerReview:     (body) => api.post('/dialer/trigger/review', body),
};
