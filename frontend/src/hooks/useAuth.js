import { useAuth as useAuthContext } from '../context/AuthContext.jsx';

/**
 * Convenience hook that exposes the AuthContext value.
 * Returns: { user, token, isAuthenticated, isLoading, login, logout }
 */
export function useAuth() {
  return useAuthContext();
}

export default useAuth;
