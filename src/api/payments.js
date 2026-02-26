import api from './axios';

/* ------------------------------------------------------------------ */
/*  Plans                                                              */
/* ------------------------------------------------------------------ */

export const getPlans = () =>
  api.get('/payments/plans').then((r) => r.data);

export const createPlan = (data) =>
  api.post('/payments/plans', data).then((r) => r.data);

export const updatePlan = (uuid, data) =>
  api.put(`/payments/plans/${uuid}`, data).then((r) => r.data);

export const togglePlanStatus = (uuid) =>
  api.patch(`/payments/plans/${uuid}/status`).then((r) => r.data);

/* ------------------------------------------------------------------ */
/*  Transactions                                                       */
/* ------------------------------------------------------------------ */

export const getTransactions = (params) =>
  api.get('/payments/transactions', { params }).then((r) => r.data);

export const getTransaction = (uuid) =>
  api.get(`/payments/transactions/${uuid}`).then((r) => r.data);

export const createTransaction = (data) =>
  api.post('/payments/transactions', data).then((r) => r.data);

export const approveTransaction = (uuid) =>
  api.patch(`/payments/transactions/${uuid}/approve`).then((r) => r.data);

export const rejectTransaction = (uuid) =>
  api.patch(`/payments/transactions/${uuid}/reject`).then((r) => r.data);

export const exportTransactionsCsv = (params) =>
  api.get('/payments/transactions/export', { params, responseType: 'blob' }).then((r) => r.data);
