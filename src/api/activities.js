import api from './axios';

/* ------------------------------------------------------------------ */
/*  Quizzes                                                            */
/* ------------------------------------------------------------------ */

export const getQuizzes = (params) =>
  api.get('/activities/quizzes', { params }).then((r) => r.data);

export const getQuizByUuid = (uuid) =>
  api.get(`/activities/quizzes/${uuid}`).then((r) => r.data);

export const createQuiz = (data) =>
  api.post('/activities/quizzes', data).then((r) => r.data);

export const updateQuiz = (uuid, data) =>
  api.put(`/activities/quizzes/${uuid}`, data).then((r) => r.data);

export const deleteQuiz = (uuid) =>
  api.delete(`/activities/quizzes/${uuid}`).then((r) => r.data);

/* ------------------------------------------------------------------ */
/*  Flashcard Sets                                                     */
/* ------------------------------------------------------------------ */

export const getFlashcardSets = (params) =>
  api.get('/activities/flashcards', { params }).then((r) => r.data);

export const getFlashcardSetByUuid = (uuid) =>
  api.get(`/activities/flashcards/${uuid}`).then((r) => r.data);

export const createFlashcardSet = (data) =>
  api.post('/activities/flashcards', data).then((r) => r.data);

export const updateFlashcardSet = (uuid, data) =>
  api.put(`/activities/flashcards/${uuid}`, data).then((r) => r.data);

export const deleteFlashcardSet = (uuid) =>
  api.delete(`/activities/flashcards/${uuid}`).then((r) => r.data);

/* ------------------------------------------------------------------ */
/*  Drag & Drop Activities                                             */
/* ------------------------------------------------------------------ */

export const getDragDropActivities = (params) =>
  api.get('/activities/dragdrop', { params }).then((r) => r.data);

export const getDragDropActivityByUuid = (uuid) =>
  api.get(`/activities/dragdrop/${uuid}`).then((r) => r.data);

export const createDragDropActivity = (data) =>
  api.post('/activities/dragdrop', data).then((r) => r.data);

export const updateDragDropActivity = (uuid, data) =>
  api.put(`/activities/dragdrop/${uuid}`, data).then((r) => r.data);

export const deleteDragDropActivity = (uuid) =>
  api.delete(`/activities/dragdrop/${uuid}`).then((r) => r.data);
