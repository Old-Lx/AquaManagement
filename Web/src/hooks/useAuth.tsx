import React, { useState, useEffect, useCallback, useContext, createContext } from 'react';
import { loginUser, AuthResponse, LoginError } from '@/lib/auth';

interface User {
  username: string;
  token: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}



const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sin persistencia de sesión para evitar problemas en iframes de preview

  const login = useCallback(async (username: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response: AuthResponse = await loginUser(username, password);
      const userData: User = { username: response.username, token: response.token };
      setUser(userData);
      // NO guardar en localStorage para que la sesión no persista
    } catch (err) {
      const loginError = err as LoginError;
      setError(loginError.message || 'Authentication failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextValue = {
    user,
    isLoading,
    error,
    login,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
