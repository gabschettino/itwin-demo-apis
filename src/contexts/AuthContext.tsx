import React, { useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { authService } from '../services/AuthService';
import { AuthContext } from './AuthContext.types';
import type { AuthContextType } from './AuthContext.types';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuthStatus = useCallback(async () => {
    try {
      const authenticated = await authService.isSignedIn();
      setIsAuthenticated(authenticated);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
    }
  }, []);

  const initializeAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      // The signIn method now handles both callback and initial sign-in
      await authService.signIn();
      await checkAuthStatus();
    } catch (error) {
      console.error('Error during auth initialization:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, [checkAuthStatus]);

  useEffect(() => {
    // Automatically attempt to sign in when the component mounts
    initializeAuth();
  }, [initializeAuth]);

  const signIn = async () => {
    try {
      setIsLoading(true);
      await authService.signIn();
      await checkAuthStatus();
    } catch (error) {
      console.error('Sign in error:', error);
      setIsLoading(false);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      await authService.signOut();
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getMe = async () => {
    return await authService.getMe();
  };

  const getAccessToken = async () => {
    return await authService.getAccessToken();
  };

  const getAuthClient = () => {
    return authService;
  };

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    signIn,
    signOut,
    getMe,
    getAccessToken,
    getAuthClient,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Re-export context and types for consumers importing from '../contexts/AuthContext'
export { AuthContext } from './AuthContext.types';
export type { AuthContextType } from './AuthContext.types';
