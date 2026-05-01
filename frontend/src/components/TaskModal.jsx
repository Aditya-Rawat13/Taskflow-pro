import { useState } from 'react';
import { useUpdateTaskStatus } from '../hooks/useTasks.js';

const STATUSES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

const STATUS_LABELS = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
};

const PRIORITY_LABELS = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
};

/**
 * TaskModal — shows full task details with an editable status dropdown and save action.
 * Requirements: 7.4
 *
 * @param {{ task: object, projectId: string, onClose: () => void }} props
 */
export default function TaskModal({ task, projectId, onClose }) {
  const [status, setStatus] = useState(task.status);
  const [saveError, setSaveError] = useState('');
  const updateStatus = useUpdateTaskStatus(projectId, task.id);

  const isDirty = status !== task.status;

  const handleSave = async () => {
    if (!isDirty) return;
    setSaveError('');
    try {
      await updateStatus.mutateAsync({ status });
      onClose();
    } catch (err) {
      setSaveError(err?.response?.data?.error || 'Failed to update status.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 pr-4">{task.title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Description */}
          {task.description && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Description
              </p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Priority
              </p>
              <p className="text-sm text-gray-800">
                {PRIORITY_LABELS[task.priority] ?? task.priority}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Due Date
              </p>
              <p className="text-sm text-gray-800">
                {task.dueDate
                  ? new Date(task.dueDate).toLocaleDateString()
                  : '—'}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Assignee
              </p>
              <p className="text-sm text-gray-800">
                {task.assignee ? task.assignee.name : '—'}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Created By
              </p>
              <p className="text-sm text-gray-800">
                {task.createdBy ? task.createdBy.name : '—'}
              </p>
            </div>
          </div>

          {/* Editable status dropdown */}
          <div>
            <label
              htmlFor="task-status"
              className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1"
            >
              Status
            </label>
            <select
              id="task-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          {saveError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {saveError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || updateStatus.isPending}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            {updateStatus.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
