import api from './axios';

export const getUsers = (params) =>
  api.get('/users', { params }).then((r) => r.data);

export const getUserByUuid = (uuid) =>
  api.get(`/users/${uuid}`).then((r) => r.data);

export const createUser = (data) =>
  api.post('/users', data).then((r) => r.data);

export const updateUser = (uuid, data) =>
  api.put(`/users/${uuid}`, data).then((r) => r.data);

export const toggleUserStatus = (uuid) =>
  api.patch(`/users/${uuid}/status`).then((r) => r.data);

export const exportUsersCsv = (params) =>
  api.get('/users/export', { params, responseType: 'blob' }).then((r) => r.data);
