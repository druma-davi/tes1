import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@shared/schema';
import { loginUser, registerUser, googleLogin, getCurrentUser, logoutUser } from '@/lib/authApi';
import { queryClient } from '@/lib/queryClient';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<User>;
  register: (username: string, email: string, password: string) => Promise<User>;
  googleLogin: (credential: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in
  useEffect(() => {
    async function loadUser() {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Failed to load user:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, []);

  // Login function
  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const user = await loginUser(username, password);
      setUser(user);
      queryClient.invalidateQueries(); // Invalidate all queries to refetch with auth
      return user;
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (username: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const user = await registerUser(username, email, password);
      setUser(user);
      queryClient.invalidateQueries(); // Invalidate all queries to refetch with auth
      return user;
    } finally {
      setIsLoading(false);
    }
  };

  // Google login function
  const handleGoogleLogin = async (credential: string) => {
    setIsLoading(true);
    try {
      const user = await googleLogin(credential);
      setUser(user);
      queryClient.invalidateQueries(); // Invalidate all queries to refetch with auth
      return user;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    setIsLoading(true);
    try {
      await logoutUser();
      setUser(null);
      queryClient.invalidateQueries(); // Invalidate all queries to refetch without auth
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    isLoading,
    login,
    register,
    googleLogin: handleGoogleLogin,
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
