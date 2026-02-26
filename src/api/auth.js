import api from './axios';

export const loginApi = (credentials) =>
  api.post('/auth/login', credentials).then((r) => r.data);

export const refreshApi = (refreshToken) =>
  api.post('/auth/refresh', { refreshToken }).then((r) => r.data);

export const logoutApi = () =>
  api.post('/auth/logout').then((r) => r.data);

export const getMeApi = () =>
  api.get('/auth/me').then((r) => r.data);
