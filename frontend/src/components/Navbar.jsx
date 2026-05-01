import { useAuth } from '../context/AuthContext.jsx';

function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="fixed top-0 left-64 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-30">
      {/* Left: app name */}
      <span className="text-lg font-bold text-indigo-600">TaskFlow Pro</span>

      {/* Right: avatar + name + logout */}
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-semibold text-sm flex items-center justify-center select-none"
          title={user?.name}
        >
          {getInitials(user?.name)}
        </div>
        <span className="text-sm font-medium text-gray-700">{user?.name}</span>
        <button
          onClick={logout}
          className="text-sm text-gray-500 hover:text-red-500 transition-colors"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
