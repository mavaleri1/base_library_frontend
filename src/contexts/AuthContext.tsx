import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { api } from '../services/api';
import type { User } from '../types';
import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/clerk-react';


interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  logout: async () => {},
  refreshUser: async () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { isLoaded, isSignedIn, getToken, signOut } = useClerkAuth();
  const { user: clerkUser } = useClerkUser();

  const refreshUser = useCallback(async () => {
    if (!isSignedIn) {
      setUser(null);
      return;
    }
    try {
      const userData = await api.getCurrentUser();
      setUser({
        ...userData,
        email: clerkUser?.primaryEmailAddress?.emailAddress,
        name: clerkUser?.fullName || clerkUser?.username || userData.name,
        avatarUrl: clerkUser?.imageUrl,
      });
      try {
        await api.initializePromptConfigUser();
      } catch {
        // Don't block auth if prompt-config-service is unavailable
      }
    } catch (error) {
      setUser(null);
    }
  }, [clerkUser, isSignedIn]);

  useEffect(() => {
    const initAuth = async () => {
      if (!isLoaded) {
        return;
      }

      if (isSignedIn) {
        api.setTokenProvider(async () => await getToken());
        await refreshUser();
      } else {
        api.clearTokenProvider();
        setUser(null);
      }
      setIsLoading(false);
    };

    initAuth();
  }, [getToken, isLoaded, isSignedIn, refreshUser]);

  const logout = async () => {
    try {
      await signOut();
    } catch (error) {
    } finally {
      setUser(null);
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

