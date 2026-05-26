import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user on mount if token exists
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('codesync_token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data);
        } catch (error) {
          console.error('Failed to load user with token:', error);
          // Token is invalid/expired
          localStorage.removeItem('codesync_token');
          setUser(null);
        }
      }
      setLoading(false);
    };

    loadUser();
  }, []);

  // Register user
  const register = async (username, email, password, avatar) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        username,
        email,
        password,
        avatar,
      });
      localStorage.setItem('codesync_token', res.data.token);
      setUser({
        _id: res.data._id,
        username: res.data.username,
        email: res.data.email,
        avatar: res.data.avatar,
      });
      setLoading(false);
      return { success: true };
    } catch (error) {
      setLoading(false);
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed',
      };
    }
  };

  // Login user
  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('codesync_token', res.data.token);
      setUser({
        _id: res.data._id,
        username: res.data.username,
        email: res.data.email,
        avatar: res.data.avatar,
      });
      setLoading(false);
      return { success: true };
    } catch (error) {
      setLoading(false);
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed',
      };
    }
  };

  // Logout user
  const logout = () => {
    localStorage.removeItem('codesync_token');
    setUser(null);
  };

  // Update user avatar
  const changeAvatar = async (avatarName) => {
    try {
      const res = await api.put('/auth/avatar', { avatar: avatarName });
      setUser((prev) => ({
        ...prev,
        avatar: res.data.avatar,
      }));
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update avatar',
      };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        register,
        login,
        logout,
        changeAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
