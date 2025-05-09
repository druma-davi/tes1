import { createContext, useContext, ReactNode } from 'react';
import { User } from '@shared/schema';
import { getCurrentUser } from '@/lib/authApi';
import { queryClient } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Use React Query to manage the user state
  const { data: user, isLoading } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
  });

  // Logout function redirects to Replit's logout endpoint
  const logout = () => {
    window.location.href = '/api/logout';
  };

  const value = {
    user: user || null,
    isLoading,
    isAuthenticated: !!user,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
