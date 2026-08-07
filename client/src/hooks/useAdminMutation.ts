import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { ContentType } from './useAdminQuery';
import { fetchWithAuth } from '@/lib/api';

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

// Fetch helper with automatic JWT Authorization token & credentials
async function fetchAdmin<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetchWithAuth(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    } as any,
  } as any);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json().catch(() => ({} as T));
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

export function useCreateContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ type, data }: { type: string; data: any }) =>
      fetchAdmin(`/api/admin/content/${type}`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'content', variables.type] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'content', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['saved-quizzes'] });
      queryClient.invalidateQueries({ queryKey: ['favorite-quizzes'] });
      toast({
        title: 'Content Created!',
        description: 'New study resource successfully published to repository.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Creation Failed',
        description: error.message || 'Failed to create study content. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useSeedQuizzes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      fetchAdmin(`/api/admin/content/quizzes/seed`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'content', 'quizzes'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'content', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['saved-quizzes'] });
      queryClient.invalidateQueries({ queryKey: ['favorite-quizzes'] });
      toast({
        title: 'Sample Quizzes Populated!',
        description: 'Successfully seeded comprehensive proctored evaluation sets into PostgreSQL.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Population Failed',
        description: error.message || 'Failed to populate sample quizzes.',
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
      queryClient.invalidateQueries({ queryKey: ['saved-quizzes'] });
      queryClient.invalidateQueries({ queryKey: ['favorite-quizzes'] });
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

export function useBulkDeleteContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ type, ids }: { type: ContentType; ids: number[] }) => {
      await Promise.all(
        ids.map(id =>
          fetchAdmin(`/api/admin/content/${type}/${id}`, {
            method: 'DELETE',
          })
        )
      );
      return ids.length;
    },
    onSuccess: (count, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'content', variables.type] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'content', 'flagged'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'content', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['saved-quizzes'] });
      queryClient.invalidateQueries({ queryKey: ['favorite-quizzes'] });
      toast({
        title: 'Bulk Deletion Complete',
        description: `Successfully removed ${count} selected assets from the repository and synchronized student feeds.`,
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Bulk Deletion Failed',
        description: error.message || 'Failed to remove some assets. Please try again.',
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
