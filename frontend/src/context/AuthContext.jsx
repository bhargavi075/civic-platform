import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('civic_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/auth/me`);
      setUser(data.user);
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const { data } = await axios.post(`${API_BASE}/auth/login`, { email, password });
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('civic_token', data.token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    return data.user;
  };

  const register = async (name, email, password) => {
    const { data } = await axios.post(`${API_BASE}/auth/register`, { name, email, password, role: 'citizen' });
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('civic_token', data.token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    return data.user;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('civic_token');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
