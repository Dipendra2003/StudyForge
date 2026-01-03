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

  console.log('[AuthProvider] Render - user:', user, 'isLoading:', isLoading, 'isAuthenticated:', !!user);

  const refreshAuth = async () => {
    try {
      console.log('[AuthContext] refreshAuth - Attempting to refresh token');
      
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include', // Send refresh token cookie
      });

      console.log('[AuthContext] refreshAuth - Response status:', response.status);

      if (response.ok) {
        console.log('[AuthContext] refreshAuth - Token refreshed successfully');
        
        // Fetch user data after successful refresh
        const userResponse = await fetch('/api/auth/me', {
          credentials: 'include', // Use cookies for auth
        });

        console.log('[AuthContext] refreshAuth - User fetch status:', userResponse.status);

        if (userResponse.ok) {
          const userData = await userResponse.json();
          console.log('[AuthContext] refreshAuth - User data:', userData);
          
          const user = userData.user;
          
          if (user) {
            setUser(user);
          } else {
            console.error('[AuthContext] refreshAuth - No user data in response!');
            setUser(null);
          }
        } else {
          console.log('[AuthContext] refreshAuth - User fetch failed, clearing auth');
          setUser(null);
        }
      } else {
        console.log('[AuthContext] refreshAuth - Refresh failed, clearing auth');
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
      console.log('[AuthContext] checkAuth - Already checking auth, skipping');
      return;
    }

    setIsCheckingAuth(true);
    
    try {
      console.log('[AuthContext] checkAuth - Calling /api/auth/me');
      const response = await fetch('/api/auth/me', {
        credentials: 'include', // Use cookies for auth
      });

      console.log('[AuthContext] checkAuth - Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('[AuthContext] checkAuth - Response data:', data);
        
        const userData = data.user;
        console.log('[AuthContext] checkAuth - Setting user:', userData);
        
        if (userData) {
          setUser(userData);
        } else {
          console.error('[AuthContext] checkAuth - No user data in response!');
          setUser(null);
        }
      } else {
        console.log('[AuthContext] checkAuth - Response not OK, trying to refresh token');
        // Token invalid, try to refresh
        await refreshAuth();
      }
    } catch (error) {
      console.error('[AuthContext] checkAuth - Error:', error);
      setUser(null);
    } finally {
      console.log('[AuthContext] checkAuth - Setting isLoading to false');
      setIsLoading(false);
      setIsCheckingAuth(false);
    }
  };

  const login = async (identifier: string, password: string) => {
    console.log('[AuthContext] login - Starting login for:', identifier);
    
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username: identifier, password }),
      credentials: 'include', // Important for cookies
    });

    const result = await response.json();
    console.log('[AuthContext] login - Response:', result);

    if (!response.ok) {
      console.error('[AuthContext] login - Login failed:', result.message);
      throw new Error(result.message || 'Login failed');
    }

    // Server sets tokens as httpOnly cookies, just get user data
    const user = result.user;
    
    console.log('[AuthContext] login - User data received:', user);
    
    setUser(user);
    
    console.log('[AuthContext] login - User set, tokens in cookies');
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
    console.log('[AuthProvider] useEffect - Calling checkAuth on mount');
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
      setLocation('/login');
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
