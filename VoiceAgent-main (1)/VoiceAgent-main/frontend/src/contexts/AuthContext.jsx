import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/auth.api.js';

const AuthContext = createContext();

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { initAuth(); }, []);

  const initAuth = async () => {
    try {
      const session = JSON.parse(localStorage.getItem('voicecrm_session') || '{}');
      if (!session.token) return;
      const data = await authApi.me();
      setUser(data.user);
    } catch {
      localStorage.removeItem('voicecrm_session');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const data = await authApi.login(email, password);
      localStorage.setItem('voicecrm_session', JSON.stringify({ token: data.token }));
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || 'Invalid credentials' };
    }
  };

  const logout = async () => {
    localStorage.removeItem('voicecrm_session');
    localStorage.removeItem('voicecrm_user');
    setUser(null);
    return { success: true };
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
