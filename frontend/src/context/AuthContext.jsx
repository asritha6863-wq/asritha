import { createContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Seed from localStorage immediately so UI doesn't flash blank,
  // but bootstrap will always overwrite with fresh populated data from getMe
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('erp_user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('erp_token') || null);
  const [loading, setLoading] = useState(true); // true while we check for an existing session

  // On mount, always fetch fresh fully-populated user from server (dept obj, designation obj, etc.)
  useEffect(() => {
    const bootstrap = async () => {
      const t = localStorage.getItem('erp_token');
      if (!t) {
        setLoading(false);
        return;
      }
      setToken(t);
      try {
        const { data } = await authService.getMe();
        // Overwrite any stale localStorage with fresh populated data
        localStorage.setItem('erp_user', JSON.stringify(data.user));
        setUser(data.user);
      } catch (err) {
        localStorage.removeItem('erp_token');
        localStorage.removeItem('erp_user');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await authService.login(email, password);
    localStorage.setItem('erp_token', data.token);
    setToken(data.token);
    // Fetch full populated user (department, designation objects) via getMe
    const { data: meData } = await authService.getMe();
    localStorage.setItem('erp_user', JSON.stringify(meData.user));
    setUser(meData.user);
    return meData.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (err) {
      // Non-fatal: proceed with local logout even if the API call fails
    }
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_user');
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const { data } = await authService.getMe();
    setUser(data.user);
    localStorage.setItem('erp_user', JSON.stringify(data.user));
    return data.user;
  }, []);

  const value = {
    user,
    token,
    isAuthenticated: !!user,
    loading,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
