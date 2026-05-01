import apiClient from './axios.js';

export const register = (data) =>
  apiClient.post('/auth/register', data).then((res) => res.data);

export const login = (data) =>
  apiClient.post('/auth/login', data).then((res) => res.data);

export const getMe = () =>
  apiClient.get('/auth/me').then((res) => res.data);
