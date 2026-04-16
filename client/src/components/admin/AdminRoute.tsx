import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import LoadingSpinner from '@/components/LoadingSpinner';

interface AdminRouteProps {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Wait for auth to finish loading
    if (isLoading) {
      return;
    }

    // Check if user is authenticated
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to access the admin panel.',
        variant: 'destructive',
      });
      setLocation('/');
      return;
    }

    // Check if user has admin role
    if (user.role !== 'admin') {
      toast({
        title: 'Access Denied',
        description: 'Admin privileges required to access this page.',
        variant: 'destructive',
      });
      setLocation('/');
      return;
    }
  }, [user, isLoading, setLocation]);

  // Show loading spinner during authentication check
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Don't render anything if not authenticated or not admin
  if (!user || user.role !== 'admin') {
    return null;
  }

  // Render children if user is admin
  return <>{children}</>;
}
