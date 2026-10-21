import React, { createContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null); // null | 'network'

  // Load and validate user session on mount
  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('codesync_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      setAuthError(null);
      return;
    }

    setLoading(true);
    setAuthError(null);

    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
      setAuthError(null);

      // Sync valid credentials with Android Native widget bridge
      if (window.CodeSyncNative?.syncAuth) {
        try {
          localStorage.setItem('codesync_in_app', 'true');
        } catch (e) {}
        window.CodeSyncNative.syncAuth(token, res.data._id, res.data.username);
      }
    } catch (error) {
      const status = error.response?.status;

      // Only treat explicit 401/403 as invalid or expired session
      if (status === 401 || status === 403) {
        console.warn('Session expired or unauthorized. Clearing stored credentials.');
        localStorage.removeItem('codesync_token');
        if (window.CodeSyncNative?.logout) {
          try {
            window.CodeSyncNative.logout();
          } catch (e) {}
        }
        setUser(null);
        setAuthError(null);
      } else {
        // Network timeout, offline, 5xx server gateway error:
        // PRESERVE the token so transient network drops do not log the user out!
        console.warn('Temporary network/server error while validating session. Preserving local credentials:', error.message);
        setAuthError('network');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Listen for global 401 events from Axios response interceptor
  useEffect(() => {
    const handleUnauthorized = () => {
      localStorage.removeItem('codesync_token');
      if (window.CodeSyncNative?.logout) {
        try {
          window.CodeSyncNative.logout();
        } catch (e) {}
      }
      setUser(null);
      setAuthError(null);
    };

    window.addEventListener('codesync_auth_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('codesync_auth_unauthorized', handleUnauthorized);
  }, []);

  // Register user
  const register = async (username, email, password, avatar) => {
    setLoading(true);
    setAuthError(null);
    try {
      const res = await api.post('/auth/register', {
        username,
        email,
        password,
        avatar,
      });
      localStorage.setItem('codesync_token', res.data.token);
      const userData = {
        _id: res.data._id,
        username: res.data.username,
        email: res.data.email,
        avatar: res.data.avatar,
      };
      setUser(userData);
      if (window.CodeSyncNative?.syncAuth) {
        try {
          localStorage.setItem('codesync_in_app', 'true');
        } catch (e) {}
        window.CodeSyncNative.syncAuth(res.data.token, res.data._id, res.data.username);
      }
      setLoading(false);
      return { success: true };
    } catch (error) {
      setLoading(false);
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed. Please try again.',
      };
    }
  };

  // Login user
  const login = async (email, password) => {
    setLoading(true);
    setAuthError(null);
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('codesync_token', res.data.token);
      const userData = {
        _id: res.data._id,
        username: res.data.username,
        email: res.data.email,
        avatar: res.data.avatar,
      };
      setUser(userData);
      if (window.CodeSyncNative?.syncAuth) {
        try {
          localStorage.setItem('codesync_in_app', 'true');
        } catch (e) {}
        window.CodeSyncNative.syncAuth(res.data.token, res.data._id, res.data.username);
      }
      setLoading(false);
      return { success: true };
    } catch (error) {
      setLoading(false);
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed. Please check your credentials.',
      };
    }
  };

  // Logout user
  const logout = useCallback(() => {
    localStorage.removeItem('codesync_token');
    if (window.CodeSyncNative?.logout) {
      try {
        window.CodeSyncNative.logout();
      } catch (e) {}
    }
    setUser(null);
    setAuthError(null);
  }, []);

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
        authError,
        retryAuth: loadUser,
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

export default AuthContext;
