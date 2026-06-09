import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { BACKEND_URL } from '../config';
import { setupAxiosInterceptors, setUnauthorizedHandler } from '../api/setupAxios';

const AuthContext = createContext(null);

setupAxiosInterceptors();

const storedToken = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
if (storedToken) {
  axios.defaults.headers.common.Authorization = `Bearer ${storedToken}`;
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
    });
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/profile/me`);
        if (cancelled) return;
        const profile = res.data;
        localStorage.setItem('user', JSON.stringify(profile));
        setUser(profile);
      } catch (err) {
        if (cancelled) return;
        if (err.response?.status === 401) {
          logout();
        } else {
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, logout]);

  const login = async (email, password) => {
    const res = await axios.post(`${BACKEND_URL}/api/auth/login`, { email, password });
    const { token: t, user: u } = res.data;
    localStorage.setItem('token', t);
    localStorage.setItem('user', JSON.stringify(u));
    axios.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    setToken(t);
    setUser(u);
    return u;
  };

  const register = async (username, email, password, phone, surname) => {
    const res = await axios.post(`${BACKEND_URL}/api/auth/register`, {
      username,
      email,
      password,
      phone: phone || undefined,
      surname: surname || undefined,
    });
    const { token: t, user: u } = res.data;
    localStorage.setItem('token', t);
    localStorage.setItem('user', JSON.stringify(u));
    axios.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    setToken(t);
    setUser(u);
    return u;
  };

  const updateSession = (updatedUser, newToken) => {
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
    if (newToken) {
      localStorage.setItem('token', newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      setToken(newToken);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, updateSession, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
