import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTasks,
  getTask,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
} from '../api/task.api.js';

// Query key factories
const taskKeys = {
  all: (projectId) => ['projects', projectId, 'tasks'],
  detail: (projectId, taskId) => ['projects', projectId, 'tasks', taskId],
  filtered: (projectId, filters) => ['projects', projectId, 'tasks', filters],
};

/**
 * Fetch the task list for a project, with optional filters.
 * Requirements: 4.8, 7.3
 * @param {string} projectId
 * @param {{ status?: string, priority?: string, assigneeId?: string }} [filters]
 */
export function useTasks(projectId, filters = {}) {
  return useQuery({
    queryKey: taskKeys.filtered(projectId, filters),
    queryFn: () => getTasks(projectId, filters),
    enabled: Boolean(projectId),
  });
}

/**
 * Fetch a single task by ID.
 * Requirements: 4.1
 * @param {string} projectId
 * @param {string} taskId
 */
export function useTask(projectId, taskId) {
  return useQuery({
    queryKey: taskKeys.detail(projectId, taskId),
    queryFn: () => getTask(projectId, taskId),
    enabled: Boolean(projectId) && Boolean(taskId),
  });
}

/**
 * Mutation: create a task in a project (Admin only).
 * Requirements: 4.1, 4.3
 * @param {string} projectId
 */
export function useCreateTask(projectId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => createTask(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all(projectId) });
      // Also invalidate project detail so task summary counts refresh
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
    },
  });
}

/**
 * Mutation: update a task's fields (Admin only).
 * Requirements: 4.4
 * @param {string} projectId
 * @param {string} taskId
 */
export function useUpdateTask(projectId, taskId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => updateTask(projectId, taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all(projectId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(projectId, taskId) });
    },
  });
}

/**
 * Mutation: update a task's status (Admin or assignee).
 * Requirements: 4.5
 * @param {string} projectId
 * @param {string} taskId
 */
export function useUpdateTaskStatus(projectId, taskId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => updateTaskStatus(projectId, taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all(projectId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(projectId, taskId) });
      // Refresh dashboard since stats may change
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/**
 * Mutation: delete a task (Admin only).
 * Requirements: 4.7
 * @param {string} projectId
 * @param {string} taskId
 */
export function useDeleteTask(projectId, taskId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteTask(projectId, taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all(projectId) });
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
    },
  });
}
