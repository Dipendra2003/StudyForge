import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';

async function fetchAdmin(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
}

// Admin Security Mutations
export function useResetUserPassword() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (userId: number) =>
      fetchAdmin(`/api/admin/security/reset-password/${userId}`, {
        method: 'POST',
      }),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Password reset successfully. Temporary password sent to user.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Reset Failed',
        description: error.message || 'Failed to reset password. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useSendSecurityAlert() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (userId: number) =>
      fetchAdmin(`/api/admin/security/send-alert/${userId}`, {
        method: 'POST',
      }),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Security alert sent to user.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed',
        description: error.message || 'Failed to send security alert.',
        variant: 'destructive',
      });
    },
  });
}

export function useBulkSuspendUsers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (userIds: number[]) =>
      fetchAdmin('/api/admin/security/bulk-suspend', {
        method: 'POST',
        body: JSON.stringify({ userIds }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast({
        title: 'Success',
        description: 'Users suspended successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Bulk Suspend Failed',
        description: error.message || 'Failed to suspend users.',
        variant: 'destructive',
      });
    },
  });
}

export function useBulkActivateUsers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (userIds: number[]) =>
      fetchAdmin('/api/admin/security/bulk-activate', {
        method: 'POST',
        body: JSON.stringify({ userIds }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast({
        title: 'Success',
        description: 'Users activated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Bulk Activate Failed',
        description: error.message || 'Failed to activate users.',
        variant: 'destructive',
      });
    },
  });
}

export function useBulkDeleteUsers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (userIds: number[]) =>
      fetchAdmin('/api/admin/security/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ userIds }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast({
        title: 'Success',
        description: 'Users deleted successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Bulk Delete Failed',
        description: error.message || 'Failed to delete users.',
        variant: 'destructive',
      });
    },
  });
}

// User's own security mutations
export function useChangeEmail() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ newEmail, password }: { newEmail: string; password: string }) =>
      fetchAdmin('/api/user/security/change-email', {
        method: 'POST',
        body: JSON.stringify({ newEmail, password }),
      }),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Verification email sent. Please check your new email address.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed',
        description: error.message || 'Failed to initiate email change.',
        variant: 'destructive',
      });
    },
  });
}

export function useVerifyEmailChange() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ token, otp }: { token: string; otp: string }) =>
      fetchAdmin('/api/user/security/verify-email-change', {
        method: 'POST',
        body: JSON.stringify({ token, otp }),
      }),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Email changed successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed',
        description: error.message || 'Failed to verify email change.',
        variant: 'destructive',
      });
    },
  });
}

export function useSetBackupEmail() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ backupEmail, password }: { backupEmail: string; password: string }) =>
      fetchAdmin('/api/user/security/set-backup-email', {
        method: 'POST',
        body: JSON.stringify({ backupEmail, password }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'security', 'recovery-options'] });
      toast({
        title: 'Success',
        description: 'Backup email set successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed',
        description: error.message || 'Failed to set backup email.',
        variant: 'destructive',
      });
    },
  });
}

export function useSetSecurityQuestions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ 
      password, 
      question1, 
      answer1, 
      question2, 
      answer2 
    }: { 
      password: string; 
      question1: string; 
      answer1: string; 
      question2: string; 
      answer2: string; 
    }) =>
      fetchAdmin('/api/user/security/set-security-questions', {
        method: 'POST',
        body: JSON.stringify({ password, question1, answer1, question2, answer2 }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'security', 'recovery-options'] });
      toast({
        title: 'Success',
        description: 'Security questions set successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed',
        description: error.message || 'Failed to set security questions.',
        variant: 'destructive',
      });
    },
  });
}
