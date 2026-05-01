const ROLE_CLASSES = {
  ADMIN: 'bg-indigo-100 text-indigo-700',
  MEMBER: 'bg-gray-100 text-gray-600',
};

export default function MemberBadge({ role }) {
  const colorClass = ROLE_CLASSES[role] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {role}
    </span>
  );
}
