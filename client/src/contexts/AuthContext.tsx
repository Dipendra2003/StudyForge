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
        const data = await response.json();
        // The refresh endpoint now returns user data directly, avoiding extra /api/auth/me round-trip
        const userData = data.data?.user;
        if (userData) {
          setUser(userData);
          localStorage.setItem('sf_has_session', 'true');
        } else {
          // Fallback: fetch user data separately if not included in refresh response
          const userResponse = await fetch('/api/auth/me', {
            credentials: 'include',
          });
          if (userResponse.ok) {
            const meData = await userResponse.json();
            setUser(meData.user || null);
            if (meData.user) {
              localStorage.setItem('sf_has_session', 'true');
            } else {
              localStorage.removeItem('sf_has_session');
            }
          } else {
            setUser(null);
            localStorage.removeItem('sf_has_session');
          }
        }
      } else {
        setUser(null);
        localStorage.removeItem('sf_has_session');
      }
    } catch (error) {
      setUser(null);
      localStorage.removeItem('sf_has_session');
    }
  };

  const checkAuth = async () => {
    // Prevent multiple simultaneous auth checks
    if (isCheckingAuth) {
      return;
    }

    // Skip unnecessary 401 calls on public pages if there is no session hint
    const hasSessionHint = typeof window !== 'undefined' && localStorage.getItem('sf_has_session') === 'true';
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
    const isPublicPath = ['/', '', '/about', '/pricing', '/help', '/contact', '/privacy-policy', '/terms', '/login', '/register', '/forgot-password', '/reset-password', '/verify-email'].includes(currentPath);

    if (!hasSessionHint && isPublicPath) {
      setUser(null);
      setIsLoading(false);
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
          localStorage.setItem('sf_has_session', 'true');
        } else {
          setUser(null);
          localStorage.removeItem('sf_has_session');
        }
      } else {
        // Token invalid, try to refresh
        await refreshAuth();
      }
    } catch (error) {
      setUser(null);
      localStorage.removeItem('sf_has_session');
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
      throw new Error(result.message || 'Login failed');
    }

    // Server sets tokens as httpOnly cookies, just get user data
    const userData = result.data?.user || result.user;

    setUser(userData);
    localStorage.setItem('sf_has_session', 'true');
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

    } finally {
      setUser(null);
      localStorage.removeItem('sf_has_session');
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
