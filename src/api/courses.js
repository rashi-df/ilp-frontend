import api from './axios';

// Courses
export const getCourses = (params) =>
  api.get('/courses', { params }).then((r) => r.data);

export const getCourseByUuid = (uuid, params) =>
  api.get(`/courses/${uuid}`, { params }).then((r) => r.data);

export const createCourse = (data) =>
  api.post('/courses', data).then((r) => r.data);

export const updateCourse = (uuid, data) =>
  api.put(`/courses/${uuid}`, data).then((r) => r.data);

export const deleteCourse = (uuid) =>
  api.delete(`/courses/${uuid}`).then((r) => r.data);

export const togglePublish = (uuid) =>
  api.patch(`/courses/${uuid}/publish`).then((r) => r.data);

// Modules
export const getModules = (courseUuid) =>
  api.get(`/modules/course/${courseUuid}`).then((r) => r.data);

export const createModule = (data) =>
  api.post('/modules', data).then((r) => r.data);

export const updateModule = (uuid, data) =>
  api.put(`/modules/${uuid}`, data).then((r) => r.data);

export const deleteModule = (uuid) =>
  api.delete(`/modules/${uuid}`).then((r) => r.data);

export const reorderModules = (data) =>
  api.patch('/modules/reorder', data).then((r) => r.data);

// Lessons
export const getAllLessons = () =>
  api.get('/lessons').then((r) => r.data);

export const getLessons = (moduleUuid) =>
  api.get(`/lessons/module/${moduleUuid}`).then((r) => r.data);

export const createLesson = (data) =>
  api.post('/lessons', data).then((r) => r.data);

export const updateLesson = (uuid, data) =>
  api.put(`/lessons/${uuid}`, data).then((r) => r.data);

export const deleteLesson = (uuid) =>
  api.delete(`/lessons/${uuid}`).then((r) => r.data);
