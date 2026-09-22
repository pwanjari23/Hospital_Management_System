import { useContext } from 'react';
import { AuthContext } from '../store/authContextBase';

/**
 * Custom hook to access authentication context
 * @returns {{ user: Object|null, token: string|null, isAuthenticated: boolean, loading: boolean, login: Function, logout: Function }}
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default useAuth;
