import api from './axios';

export const getStats = () =>
  api.get('/dashboard/stats').then((r) => r.data);

export const getRecentEnrollments = () =>
  api.get('/dashboard/recent-enrollments').then((r) => r.data);

export const getRecentActivity = () =>
  api.get('/dashboard/recent-activity').then((r) => r.data);
