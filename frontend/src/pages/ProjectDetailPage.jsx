import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useProject, useMembers, useAddMember, useRemoveMember } from '../hooks/useProjects.js';
import { useTasks } from '../hooks/useTasks.js';
import Navbar from '../components/Navbar.jsx';
import Sidebar from '../components/Sidebar.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import MemberBadge from '../components/MemberBadge.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

function AddMemberModal({ projectId, onClose }) {
  const [form, setForm] = useState({ email: '', role: 'MEMBER' });
  const [error, setError] = useState('');
  const addMember = useAddMember(projectId);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await addMember.mutateAsync({ email: form.email, role: form.role });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to add member.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Add Member</h2>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
            <label htmlFor="member-email" className="text-sm font-medium text-gray-700 mb-1 block">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="member-email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="teammate@example.com"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="member-role" className="text-sm font-medium text-gray-700 mb-1 block">
              Role
            </label>
            <select
              id="member-role"
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg px-4 py-2 text-sm">
              Cancel
            </button>
            <button type="submit" disabled={addMember.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50">
              {addMember.isPending ? 'Adding…' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TasksTab({ projectId }) {
  const { data: tasks, isLoading, isError } = useTasks(projectId);

  if (isLoading) return <div className="flex justify-center py-12"><LoadingSpinner /></div>;
  if (isError) return <p className="text-sm text-red-600 py-4">Failed to load tasks.</p>;

  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3">✅</div>
        <p className="text-gray-500 font-medium">No tasks yet</p>
        <p className="text-gray-400 text-sm mt-1">Open the board to add tasks</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
      {tasks.map((task) => (
        <div key={task.id} className="flex items-center justify-between px-4 py-3 gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
            {task.assignee && (
              <p className="text-xs text-gray-400 mt-0.5">Assigned to {task.assignee.name}</p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-gray-400 capitalize">{task.priority?.toLowerCase()}</span>
            <StatusBadge status={task.status} />
          </div>
        </div>
      ))}
    </div>
  );
}

function MembersTab({ projectId, project, isAdmin }) {
  const { data: members, isLoading, isError } = useMembers(projectId);
  const removeMember = useRemoveMember(projectId);
  const [showAddModal, setShowAddModal] = useState(false);
  const [removeError, setRemoveError] = useState('');

  const handleRemove = async (memberId) => {
    setRemoveError('');
    try {
      await removeMember.mutateAsync(memberId);
    } catch (err) {
      setRemoveError(err?.response?.data?.error || 'Failed to remove member.');
    }
  };

  if (isLoading) return <div className="flex justify-center py-12"><LoadingSpinner /></div>;
  if (isError) return <p className="text-sm text-red-600 py-4">Failed to load members.</p>;

  return (
    <div>
      {isAdmin && (
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
          >
            + Add Member
          </button>
        </div>
      )}

      {removeError && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {removeError}
        </div>
      )}

      {(!members || members.length === 0) ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">👥</div>
          <p className="text-gray-500 font-medium">No members yet</p>
          <p className="text-gray-400 text-sm mt-1">Add teammates to collaborate</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {members.map((member) => {
            const isOwner = member.userId === project?.ownerId;
            return (
              <div key={member.id} className="flex items-center justify-between px-4 py-3 gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{member.user?.name ?? member.name}</p>
                  <p className="text-xs text-gray-400">{member.user?.email ?? member.email}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <MemberBadge role={member.role} />
                  {isAdmin && !isOwner && (
                    <button
                      onClick={() => handleRemove(member.id)}
                      disabled={removeMember.isPending}
                      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAddModal && (
        <AddMemberModal projectId={projectId} onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id: projectId } = useParams();
  const { user } = useAuth();
  const { data: project, isLoading, isError } = useProject(projectId);
  const [activeTab, setActiveTab] = useState('tasks');

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  if (isError) {
    return <div className="flex h-screen items-center justify-center text-red-600">Failed to load project.</div>;
  }

  const currentMember = project?.members?.find((m) => m.userId === user?.id);
  const isAdmin = currentMember?.role === 'ADMIN';

  const tabs = [
    { key: 'tasks', label: 'Tasks' },
    { key: 'members', label: 'Members' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Navbar />
      <main className="ml-64 pt-16 p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{project?.name}</h1>
            {project?.description && (
              <p className="text-sm text-gray-500 mt-1">{project.description}</p>
            )}
          </div>
          <Link
            to={`/projects/${projectId}/board`}
            className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
          >
            View Board
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium cursor-pointer -mb-px border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'text-indigo-600 border-indigo-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'tasks' && <TasksTab projectId={projectId} />}
        {activeTab === 'members' && <MembersTab projectId={projectId} project={project} isAdmin={isAdmin} />}
      </main>
    </div>
  );
}
