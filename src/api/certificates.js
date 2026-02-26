import api from './axios';

// Templates
export const getTemplates = () =>
  api.get('/certificates/templates').then((r) => r.data);

export const getTemplate = (uuid) =>
  api.get(`/certificates/templates/${uuid}`).then((r) => r.data);

export const createTemplate = (data) =>
  api.post('/certificates/templates', data).then((r) => r.data);

export const updateTemplate = (uuid, data) =>
  api.put(`/certificates/templates/${uuid}`, data).then((r) => r.data);

export const deleteTemplate = (uuid) =>
  api.delete(`/certificates/templates/${uuid}`).then((r) => r.data);

// Certificates
export const getCertificates = (params) =>
  api.get('/certificates', { params }).then((r) => r.data);

export const getCertificate = (uuid) =>
  api.get(`/certificates/${uuid}`).then((r) => r.data);

export const issueCertificate = (data) =>
  api.post('/certificates', data).then((r) => r.data);

export const revokeCertificate = (uuid, data) =>
  api.patch(`/certificates/${uuid}/revoke`, data).then((r) => r.data);

export const verifyCertificate = (certificateId) =>
  api.get(`/certificates/verify/${certificateId}`).then((r) => r.data);
