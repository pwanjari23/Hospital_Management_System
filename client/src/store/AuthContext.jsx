import { useState, useEffect, useCallback, useMemo } from 'react';
import { AuthContext } from './authContextBase';
import api, { registerUnauthorizedHandler } from '../services/api';
import { getStoredToken, setStoredToken, clearStoredToken } from '../utils/tokenStorage';

export { AuthContext };

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Logout action: clears local state and storage
  const logout = useCallback(async () => {
    try {
      if (getStoredToken()) {
        await api.post('/auth/logout').catch(() => {
          // Ignore network errors on logout
        });
      }
    } finally {
      clearStoredToken();
      setToken(null);
      setUser(null);
    }
  }, []);

  // Sync with global 401 interceptor
  useEffect(() => {
    registerUnauthorizedHandler(() => {
      clearStoredToken();
      setToken(null);
      setUser(null);
    });
  }, []);

  // Fetch current user if token exists on mount
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      const storedToken = getStoredToken();
      if (!storedToken) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      try {
        const response = await api.get('/auth/me');
        if (isMounted && response.data?.success) {
          setUser(response.data.data);
          setToken(storedToken);
        }
      } catch {
        // Token was invalid or expired
        if (isMounted) {
          clearStoredToken();
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  // Login action: authenticates credentials and sets state
  const login = useCallback(async (email, password, isHospital = false) => {
    const endpoint = isHospital ? '/auth/hospital-login' : '/auth/login';
    const response = await api.post(endpoint, { email, password });
    if (response.data?.success && response.data?.data) {
      const { user: authUser, accessToken } = response.data.data;
      setStoredToken(accessToken);
      setToken(accessToken);
      setUser(authUser);
      return { success: true, user: authUser };
    }
    throw new Error(response.data?.message || 'Authentication failed');
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      loading,
      login,
      logout,
    }),
    [user, token, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
