import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, setAuthToken, clearAuthToken, getAuthToken } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is logged in on app start
  useEffect(() => {
    const initializeAuth = async () => {
      const token = getAuthToken();
      console.log('AuthContext initializing, token:', token ? 'exists' : 'none');
      if (token) {
        try {
          const response = await authAPI.getCurrentUser();
          console.log('Current user response:', response);
          setUser(response.user);
        } catch (error) {
          console.error('Failed to get current user:', error);
          clearAuthToken();
        }
      }
      setLoading(false);
      console.log('AuthContext initialization complete, user:', user ? 'authenticated' : 'not authenticated');
    };

    initializeAuth();
  }, []);

  const login = async (credentials) => {
    try {
      console.log('Login attempt with credentials:', { email: credentials.email, password: '***' });
      setError(null);
      setLoading(true);
      
      const response = await authAPI.login(credentials);
      console.log('Login response:', response);
      const { token, user } = response;
      
      setAuthToken(token);
      setUser(user);
      console.log('User set after login:', user);
      
      return { success: true, user };
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await authAPI.register(userData);
      const { token, user } = response;
      
      setAuthToken(token);
      setUser(user);
      
      return { success: true, user };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearAuthToken();
    setUser(null);
    setError(null);
  };

  const updateProfile = async (profileData) => {
    try {
      setError(null);
      const response = await authAPI.updateProfile(profileData);
      setUser(response.user);
      return { success: true, user: response.user };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  const changePassword = async (passwordData) => {
    try {
      setError(null);
      await authAPI.changePassword(passwordData);
      return { success: true };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;