import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';
import { fetchWithAuth } from '@/lib/api';

async function fetchAdmin(url: string, options: RequestInit = {}) {
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
    return {};
  }

  return response.json().catch(() => ({}));
}

// Admin Security Mutations
export function useResetUserPassword() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (userId: number) =>
      fetchAdmin(`/api/admin/security/reset-password/${userId}`, {
        method: 'POST',
      }),
    onSuccess: (data: any) => {
      const tempPass = data?.data?.tempPassword;
      toast({
        title: 'Password Reset Successful',
        description: tempPass ? `Temporary password generated: ${tempPass}` : 'Password reset successfully. Temporary password sent to user.',
        duration: 10000,
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
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: number | { userId: number; alertType?: string; message?: string; severity?: string }) => {
      const userId = typeof params === 'number' ? params : params.userId;
      const body = typeof params === 'number' ? undefined : JSON.stringify({
        alertType: params.alertType,
        message: params.message,
        severity: params.severity,
      });
      return fetchAdmin(`/api/admin/security/send-alert/${userId}`, {
        method: 'POST',
        body,
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'suspicious-activity'] });
      toast({
        title: 'Security Alert Transmitted',
        description: data?.message || 'Security alert transmitted and recorded to audit file.',
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
