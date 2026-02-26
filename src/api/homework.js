import api from './axios';

export const getHomeworkList = (params) =>
  api.get('/homework', { params }).then((r) => r.data);

export const getHomework = (uuid) =>
  api.get(`/homework/${uuid}`).then((r) => r.data);

export const createHomework = (data) =>
  api.post('/homework', data).then((r) => r.data);

export const updateHomework = (uuid, data) =>
  api.put(`/homework/${uuid}`, data).then((r) => r.data);

export const deleteHomework = (uuid) =>
  api.delete(`/homework/${uuid}`).then((r) => r.data);

export const getSubmissions = (params) =>
  api.get('/homework/submissions', { params }).then((r) => r.data);

export const getSubmission = (uuid) =>
  api.get(`/homework/submissions/${uuid}`).then((r) => r.data);

export const reviewSubmission = (uuid, data) =>
  api.patch(`/homework/submissions/${uuid}/review`, data).then((r) => r.data);
