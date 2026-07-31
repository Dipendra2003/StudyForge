import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';

interface User {
  id: number;
  username: string;
  email: string;
  fullName?: string;
  role: string;
  emailVerified: boolean;
  isActive: boolean;
  createdAt: string;
  mediaRetentionDays?: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);

  const refreshAuth = async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include', // Send refresh token cookie
      });

      if (response.ok) {
        // Fetch user data after successful refresh
        const userResponse = await fetch('/api/auth/me', {
          credentials: 'include', // Use cookies for auth
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          const user = userData.user;
          
          if (user) {
            setUser(user);
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('[AuthContext] refreshAuth - Error:', error);
      setUser(null);
    }
  };

  const checkAuth = async () => {
    // Prevent multiple simultaneous auth checks
    if (isCheckingAuth) {
      return;
    }

    setIsCheckingAuth(true);
    
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include', // Use cookies for auth
      });

      if (response.ok) {
        const data = await response.json();
        const userData = data.user;
        
        if (userData) {
          setUser(userData);
        } else {
          setUser(null);
        }
      } else {
        // Token invalid, try to refresh
        await refreshAuth();
      }
    } catch (error) {
      console.error('[AuthContext] checkAuth - Error:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
      setIsCheckingAuth(false);
    }
  };

  const login = async (identifier: string, password: string) => {

    
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ identifier, password }),
      credentials: 'include', // Important for cookies
    });

    const result = await response.json();


    if (!response.ok) {
      console.error('[AuthContext] Login failed:', result.message);
      throw new Error(result.message || 'Login failed');
    }

    // Server sets tokens as httpOnly cookies, just get user data
    const userData = result.data?.user || result.user;

    setUser(userData);
  };

  const register = async (username: string, email: string, password: string, fullName: string) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, email, password, fullName }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Registration failed');
    }

    // Don't auto-login after registration, redirect to verify email
    return data;
  };

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      // Clear all session storage items related to navigation
      sessionStorage.removeItem('lastVisitedPage');
      sessionStorage.removeItem('redirectAfterLogin');
      sessionStorage.removeItem('codeGenActiveTab');
      setLocation('/');
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refreshAuth,
    updateUser,
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
