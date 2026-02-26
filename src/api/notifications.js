import api from './axios';

export const getNotifications = (params) =>
  api.get('/notifications', { params }).then((r) => r.data);

export const getNotification = (uuid) =>
  api.get(`/notifications/${uuid}`).then((r) => r.data);

export const createNotification = (data) =>
  api.post('/notifications', data).then((r) => r.data);

export const updateNotification = (uuid, data) =>
  api.put(`/notifications/${uuid}`, data).then((r) => r.data);

export const deleteNotification = (uuid) =>
  api.delete(`/notifications/${uuid}`).then((r) => r.data);

export const sendNotification = (uuid) =>
  api.patch(`/notifications/${uuid}/send`).then((r) => r.data);
