import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useProject, useMembers } from '../hooks/useProjects.js';
import { useTasks, useCreateTask } from '../hooks/useTasks.js';
import Navbar from '../components/Navbar.jsx';
import Sidebar from '../components/Sidebar.jsx';
import TaskCard from '../components/TaskCard.jsx';
import TaskModal from '../components/TaskModal.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

const COLUMNS = [
  { status: 'TODO', label: 'To Do', headerClass: 'bg-gray-100 text-gray-600' },
  { status: 'IN_PROGRESS', label: 'In Progress', headerClass: 'bg-blue-50 text-blue-700' },
  { status: 'IN_REVIEW', label: 'In Review', headerClass: 'bg-amber-50 text-amber-700' },
  { status: 'DONE', label: 'Done', headerClass: 'bg-green-50 text-green-700' },
];

function AddTaskModal({ projectId, members, onClose }) {
  const [form, setForm] = useState({ title: '', description: '', assigneeId: '', priority: 'MEDIUM', dueDate: '' });
  const [error, setError] = useState('');
  const createTask = useCreateTask(projectId);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const payload = {
      title: form.title,
      ...(form.description && { description: form.description }),
      ...(form.assigneeId && { assigneeId: form.assigneeId }),
      priority: form.priority,
      ...(form.dueDate && { dueDate: new Date(form.dueDate).toISOString() }),
    };
    try {
      await createTask.mutateAsync(payload);
      onClose();
    } catch (err) {
      const apiError = err?.response?.data;
      setError(apiError?.details?.join(', ') || apiError?.error || 'Failed to create task.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Add Task</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none" aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div>
            <label htmlFor="task-title" className="text-sm font-medium text-gray-700 mb-1 block">Title <span className="text-red-500">*</span></label>
            <input id="task-title" name="title" type="text" required value={form.title} onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Task title" />
          </div>

          <div>
            <label htmlFor="task-description" className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
            <textarea id="task-description" name="description" rows={3} value={form.description} onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Optional description" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="task-assignee" className="text-sm font-medium text-gray-700 mb-1 block">Assignee</label>
              <select id="task-assignee" name="assigneeId" value={form.assigneeId} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Unassigned</option>
                {(members ?? []).map((m) => (
                  <option key={m.userId} value={m.userId}>{m.user?.name ?? m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="task-priority" className="text-sm font-medium text-gray-700 mb-1 block">Priority</label>
              <select id="task-priority" name="priority" value={form.priority} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="task-due" className="text-sm font-medium text-gray-700 mb-1 block">Due Date</label>
            <input id="task-due" name="dueDate" type="date" value={form.dueDate} onChange={handleChange}
              min={new Date().toISOString().split('T')[0]}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg px-4 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={createTask.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50">
              {createTask.isPending ? 'Creating…' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function KanbanColumn({ column, tasks, onCardClick }) {
  return (
    <div className="flex flex-col flex-1 min-w-0">
      <div className={`rounded-t-lg px-4 py-3 font-semibold text-sm flex items-center justify-between ${column.headerClass}`}>
        <span>{column.label}</span>
        <span className="text-xs font-medium opacity-60">{tasks.length}</span>
      </div>
      <div className="bg-gray-50 rounded-b-lg p-3 min-h-64 space-y-3 flex-1">
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-8 text-xs text-gray-400">
            No tasks
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => onCardClick(task)} />
          ))
        )}
      </div>
    </div>
  );
}

export default function TaskBoardPage() {
  const { id: projectId } = useParams();
  const { user } = useAuth();

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: members } = useMembers(projectId);
  const { data: tasks, isLoading: tasksLoading, isError } = useTasks(projectId);

  const [selectedTask, setSelectedTask] = useState(null);
  const [showAddTask, setShowAddTask] = useState(false);

  const isLoading = projectLoading || tasksLoading;
  const currentMember = project?.members?.find((m) => m.userId === user?.id);
  const isAdmin = currentMember?.role === 'ADMIN';

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  if (isError) {
    return <div className="flex h-screen items-center justify-center text-red-600">Failed to load tasks.</div>;
  }

  const tasksByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.status] = (tasks ?? []).filter((t) => t.status === col.status);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Navbar />
      <main className="ml-64 pt-16 p-8 flex flex-col" style={{ height: '100vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Link to={`/projects/${projectId}`} className="text-sm text-gray-500 hover:text-gray-800">
              ← {project?.name ?? 'Project'}
            </Link>
            <span className="text-gray-300">/</span>
            <h1 className="text-xl font-bold text-gray-800 truncate">Board</h1>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowAddTask(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
            >
              + Add Task
            </button>
          )}
        </div>

        {/* Kanban board */}
        <div className="flex gap-4 flex-1 overflow-x-auto pb-4">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.status}
              column={col}
              tasks={tasksByStatus[col.status]}
              onCardClick={setSelectedTask}
            />
          ))}
        </div>
      </main>

      {selectedTask && (
        <TaskModal task={selectedTask} projectId={projectId} onClose={() => setSelectedTask(null)} />
      )}
      {showAddTask && (
        <AddTaskModal projectId={projectId} members={members} onClose={() => setShowAddTask(false)} />
      )}
    </div>
  );
}
