import { createContext } from 'react';

export interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  getMe: () => Promise<any>;
  getAccessToken: () => Promise<string | null>;
  getAuthClient: () => any;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
