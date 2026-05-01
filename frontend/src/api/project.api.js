import apiClient from './axios.js';

export const getProjects = () =>
  apiClient.get('/projects').then((res) => res.data.projects);

export const createProject = (data) =>
  apiClient.post('/projects', data).then((res) => res.data.project);

export const getProject = (projectId) =>
  apiClient.get(`/projects/${projectId}`).then((res) => res.data.project);

export const updateProject = (projectId, data) =>
  apiClient.put(`/projects/${projectId}`, data).then((res) => res.data.project);

export const deleteProject = (projectId) =>
  apiClient.delete(`/projects/${projectId}`).then((res) => res.data);

export const getMembers = (projectId) =>
  apiClient.get(`/projects/${projectId}/members`).then((res) => res.data.members);

export const addMember = (projectId, data) =>
  apiClient.post(`/projects/${projectId}/members`, data).then((res) => res.data.member);

export const removeMember = (projectId, memberId) =>
  apiClient.delete(`/projects/${projectId}/members/${memberId}`).then((res) => res.data);
