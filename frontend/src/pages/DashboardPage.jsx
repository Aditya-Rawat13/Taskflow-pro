import { Link } from 'react-router-dom';
import { useDashboard } from '../hooks/useDashboard.js';
import Navbar from '../components/Navbar.jsx';
import Sidebar from '../components/Sidebar.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const STAT_CARDS = [
  { key: 'totalProjects', label: 'Total Projects', accent: 'border-indigo-500' },
  { key: 'totalTasks', label: 'Total Tasks', accent: 'border-blue-500' },
  { key: 'completedTasks', label: 'Completed', accent: 'border-green-500' },
  { key: 'inProgressTasks', label: 'In Progress', accent: 'border-amber-500' },
];

export default function DashboardPage() {
  const { data, isLoading, isError } = useDashboard();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-screen items-center justify-center text-red-600">
        Failed to load dashboard. Please refresh.
      </div>
    );
  }

  const { myTasks = [], overdueTasks = [], stats = {}, recentProjects = [] } = data ?? {};

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Navbar />
      <main className="ml-64 pt-16 p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {STAT_CARDS.map(({ key, label, accent }) => (
            <div key={key} className={`bg-white rounded-xl border border-gray-200 shadow-sm p-5 border-l-4 ${accent}`}>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
              <p className="text-3xl font-bold text-gray-800">{stats[key] ?? 0}</p>
            </div>
          ))}
        </div>

        {/* My Tasks */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">My Tasks</h2>
          {myTasks.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-gray-500 font-medium">No tasks assigned yet</p>
              <p className="text-gray-400 text-sm mt-1">Tasks assigned to you will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myTasks.map((task) => (
                <div key={task.id} className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{task.project?.name ?? 'Unknown project'}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={task.status} />
                    <span className="text-xs text-gray-400">{formatDate(task.dueDate)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Overdue Tasks */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            Overdue Tasks
          </h2>
          {overdueTasks.length === 0 ? (
            <p className="text-sm text-gray-400 py-4">No overdue tasks</p>
          ) : (
            <div className="space-y-2">
              {overdueTasks.map((task) => (
                <div key={task.id} className="bg-white rounded-lg border border-gray-200 border-l-4 border-l-red-400 p-4 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{task.project?.name ?? 'Unknown project'}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={task.status} />
                    <span className="text-xs text-red-400 font-medium">Due {formatDate(task.dueDate)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent Projects */}
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Recent Projects</h2>
          {recentProjects.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">📁</div>
              <p className="text-gray-500 font-medium">No recent projects</p>
              <p className="text-gray-400 text-sm mt-1">Projects you're part of will appear here</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {recentProjects.map((project) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <p className="font-semibold text-gray-800 mb-1 truncate">{project.name}</p>
                  {project.description && (
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">{project.description}</p>
                  )}
                  <p className="text-xs text-gray-400">Updated {formatDate(project.updatedAt)}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
