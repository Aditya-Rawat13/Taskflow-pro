import apiClient from './axios.js';

export const getTasks = (projectId, filters = {}) =>
  apiClient.get(`/projects/${projectId}/tasks`, { params: filters }).then((res) => res.data.tasks);

export const createTask = (projectId, data) =>
  apiClient.post(`/projects/${projectId}/tasks`, data).then((res) => res.data.task);

export const getTask = (projectId, taskId) =>
  apiClient.get(`/projects/${projectId}/tasks/${taskId}`).then((res) => res.data.task);

export const updateTask = (projectId, taskId, data) =>
  apiClient.put(`/projects/${projectId}/tasks/${taskId}`, data).then((res) => res.data.task);

export const updateTaskStatus = (projectId, taskId, data) =>
  apiClient.patch(`/projects/${projectId}/tasks/${taskId}/status`, data).then((res) => res.data.task);

export const deleteTask = (projectId, taskId) =>
  apiClient.delete(`/projects/${projectId}/tasks/${taskId}`).then((res) => res.data);
