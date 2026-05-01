import { useQuery } from '@tanstack/react-query';
import { getDashboard } from '../api/dashboard.api.js';

/**
 * Fetch the authenticated user's dashboard data.
 * Returns: { myTasks, overdueTasks, stats, recentProjects }
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */
export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
  });
}

export default useDashboard;
