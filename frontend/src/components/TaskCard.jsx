import StatusBadge from './StatusBadge.jsx';

// Priority label and color mapping
const PRIORITY_CLASSES = {
  HIGH: 'text-red-600 bg-red-50',
  MEDIUM: 'text-amber-600 bg-amber-50',
  LOW: 'text-gray-500 bg-gray-100',
};

/**
 * Returns up to 2 uppercase initials from a name string.
 * @param {string} name
 */
function getInitials(name) {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

/**
 * TaskCard — displays task title, StatusBadge, priority badge, and assignee initials.
 * Requirements: 7.3
 *
 * @param {{ task: object, onClick: () => void }} props
 */
export default function TaskCard({ task, onClick }) {
  const priorityClass = PRIORITY_CLASSES[task.priority] ?? PRIORITY_CLASSES.MEDIUM;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-gray-200 p-3 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400"
    >
      {/* Title */}
      <p className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">{task.title}</p>

      {/* Footer row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <StatusBadge status={task.status} />
          {task.priority && (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${priorityClass}`}
            >
              {task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}
            </span>
          )}
        </div>

        {/* Assignee initials avatar */}
        {task.assignee && (
          <div
            title={task.assignee.name}
            className="shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center justify-center"
          >
            {getInitials(task.assignee.name)}
          </div>
        )}
      </div>

      {/* Due date (if present) */}
      {task.dueDate && (
        <p className="mt-2 text-xs text-gray-400">
          Due {new Date(task.dueDate).toLocaleDateString()}
        </p>
      )}
    </button>
  );
}
