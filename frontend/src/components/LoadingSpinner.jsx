export default function LoadingSpinner({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div
      role="status"
      aria-label="Loading"
      className={`${sizeClasses[size] ?? sizeClasses.md} rounded-full border-gray-200 border-t-indigo-600 animate-spin ${className}`}
    />
  );
}
