import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from './AuthContext';
import { toast } from '@/hooks/use-toast';

export type AdminSection = 'users' | 'content' | 'analytics' | 'monitoring' | 'email';

interface AdminContextType {
  // Admin user info
  isAdmin: boolean;
  
  // Navigation state
  activeSection: AdminSection;
  setActiveSection: (section: AdminSection) => void;
  
  // Global loading states
  isLoading: boolean;
  
  // Error handling
  error: string | null;
  clearError: () => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [activeSection, setActiveSection] = useState<AdminSection>('users');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);

  // Verify admin role on mount
  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      toast({
        title: 'Access Denied',
        description: 'Please log in to access the admin panel.',
        variant: 'destructive',
      });
      setLocation('/');
      return;
    }

    if (user.role !== 'admin') {
      toast({
        title: 'Access Denied',
        description: 'Admin privileges required to access this page.',
        variant: 'destructive',
      });
      setLocation('/');
      return;
    }

    setIsVerifying(false);
  }, [user, authLoading, setLocation]);

  const clearError = () => {
    setError(null);
  };

  const value: AdminContextType = {
    isAdmin: user?.role === 'admin',
    activeSection,
    setActiveSection,
    isLoading: authLoading || isVerifying,
    error,
    clearError,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
