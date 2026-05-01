import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getMembers,
  addMember,
  removeMember,
} from '../api/project.api.js';

// Query key factories
const projectKeys = {
  all: ['projects'],
  detail: (id) => ['projects', id],
  members: (id) => ['projects', id, 'members'],
};

/**
 * Fetch the list of projects the authenticated user belongs to.
 * Requirements: 2.2, 7.1
 */
export function useProjects() {
  return useQuery({
    queryKey: projectKeys.all,
    queryFn: getProjects,
  });
}

/**
 * Fetch a single project by ID (includes members and task summary).
 * Requirements: 2.3
 * @param {string} projectId
 */
export function useProject(projectId) {
  return useQuery({
    queryKey: projectKeys.detail(projectId),
    queryFn: () => getProject(projectId),
    enabled: Boolean(projectId),
  });
}

/**
 * Fetch the member list for a project.
 * Requirements: 3.6
 * @param {string} projectId
 */
export function useMembers(projectId) {
  return useQuery({
    queryKey: projectKeys.members(projectId),
    queryFn: () => getMembers(projectId),
    enabled: Boolean(projectId),
  });
}

/**
 * Mutation: create a new project.
 * Requirements: 2.1
 */
export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

/**
 * Mutation: update a project (Admin only).
 * Requirements: 2.5
 * @param {string} projectId
 */
export function useUpdateProject(projectId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => updateProject(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

/**
 * Mutation: delete a project (Admin only).
 * Requirements: 2.7
 * @param {string} projectId
 */
export function useDeleteProject(projectId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      queryClient.removeQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}

/**
 * Mutation: add a member to a project (Admin only).
 * Requirements: 3.1
 * @param {string} projectId
 */
export function useAddMember(projectId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => addMember(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.members(projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}

/**
 * Mutation: remove a member from a project (Admin only).
 * Requirements: 3.4
 * @param {string} projectId
 */
export function useRemoveMember(projectId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId) => removeMember(projectId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.members(projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}
