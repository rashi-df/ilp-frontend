import api from './axios';

export const getVideos = (params) =>
  api.get('/videos', { params }).then((r) => r.data);

export const getVideo = (uuid) =>
  api.get(`/videos/${uuid}`).then((r) => r.data);

export const getUploadCredentials = (data) =>
  api.post('/videos/upload', data).then((r) => r.data);

export const confirmUpload = (uuid, data) =>
  api.patch(`/videos/${uuid}/confirm`, data).then((r) => r.data);

export const updateVideo = (uuid, data) =>
  api.put(`/videos/${uuid}`, data).then((r) => r.data);

export const deleteVideo = (uuid) =>
  api.delete(`/videos/${uuid}`).then((r) => r.data);

export const getVideoOtp = (uuid) =>
  api.get(`/videos/${uuid}/otp`).then((r) => r.data);

export const linkVideoToLesson = (uuid, data) =>
  api.patch(`/videos/${uuid}/link`, data).then((r) => r.data);
