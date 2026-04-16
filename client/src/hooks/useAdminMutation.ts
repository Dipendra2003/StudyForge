import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { ContentType } from './useAdminQuery';

// Types
interface UserUpdates {
  fullName?: string;
  email?: string;
  role?: 'user' | 'admin';
}

interface ContentUpdates {
  [key: string]: any;
}

interface MessageStatusUpdate {
  status: 'pending' | 'read' | 'resolved';
}

// Fetch helper with credentials
async function fetchAdmin<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
}

// User Management Mutations
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, updates }: { userId: number; updates: UserUpdates }) =>
      fetchAdmin(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast({
        title: 'Success',
        description: 'User updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update user. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useSuspendUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) =>
      fetchAdmin(`/api/admin/users/${userId}/suspend`, {
        method: 'PATCH',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast({
        title: 'Success',
        description: 'User suspended successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Suspension Failed',
        description: error.message || 'Failed to suspend user. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useActivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) =>
      fetchAdmin(`/api/admin/users/${userId}/activate`, {
        method: 'PATCH',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast({
        title: 'Success',
        description: 'User activated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Activation Failed',
        description: error.message || 'Failed to activate user. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) =>
      fetchAdmin(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast({
        title: 'Success',
        description: 'User deleted successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Deletion Failed',
        description: error.message || 'Failed to delete user. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

// Content Management Mutations
export function useUpdateContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      type,
      id,
      updates,
    }: {
      type: ContentType;
      id: number;
      updates: ContentUpdates;
    }) =>
      fetchAdmin(`/api/admin/content/${type}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'content', variables.type] });
      toast({
        title: 'Success',
        description: 'Content updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update content. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ type, id }: { type: ContentType; id: number }) =>
      fetchAdmin(`/api/admin/content/${type}/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'content', variables.type] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'content', 'flagged'] });
      toast({
        title: 'Success',
        description: 'Content deleted successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Deletion Failed',
        description: error.message || 'Failed to delete content. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

// Email Management Mutations
export function useUpdateMessageStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: MessageStatusUpdate['status'] }) =>
      fetchAdmin(`/api/admin/messages/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'messages'] });
      toast({
        title: 'Success',
        description: 'Message status updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update message status. Please try again.',
        variant: 'destructive',
      });
    },
  });
}
