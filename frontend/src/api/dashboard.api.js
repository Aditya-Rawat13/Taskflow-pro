import apiClient from './axios.js';

// Dashboard returns { myTasks, overdueTasks, stats, recentProjects } directly
export const getDashboard = () =>
  apiClient.get('/dashboard').then((res) => res.data);
