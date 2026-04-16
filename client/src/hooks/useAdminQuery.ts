import { useQuery, UseQueryOptions } from '@tanstack/react-query';

// Types
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ContentQueryOptions extends PaginationOptions {
  search?: string;
  userId?: number;
  category?: string;
  startDate?: string;
  endDate?: string;
}

export interface LogQueryOptions extends PaginationOptions {
  startDate?: string;
  endDate?: string;
  userId?: number;
  action?: string;
  status?: string;
}

export type ContentType = 'quizzes' | 'flashcards' | 'documents' | 'questions';
export type LogType = 'security' | 'email' | 'errors' | 'api-usage';

// Helper function to build query string
function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

// Fetch helper with credentials
async function fetchAdmin<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
}

// User Management Hooks
export function useUsers(options: PaginationOptions = {}) {
  const queryString = buildQueryString(options);
  
  return useQuery({
    queryKey: ['admin', 'users', options],
    queryFn: () => fetchAdmin(`/api/admin/users${queryString}`),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

export function useUserSearch(query: string, options: PaginationOptions = {}) {
  const queryString = buildQueryString({ ...options, q: query });
  
  return useQuery({
    queryKey: ['admin', 'users', 'search', query, options],
    queryFn: () => fetchAdmin(`/api/admin/users/search${queryString}`),
    staleTime: 1 * 60 * 1000, // 1 minute
    enabled: query.length > 0,
  });
}

export function useUserActivity(userId: number) {
  return useQuery({
    queryKey: ['admin', 'users', userId, 'activity'],
    queryFn: () => fetchAdmin(`/api/admin/users/${userId}/activity`),
    staleTime: 1 * 60 * 1000, // 1 minute
    enabled: !!userId,
  });
}

// Content Management Hooks
export function useContent(type: ContentType, options: ContentQueryOptions = {}) {
  const queryString = buildQueryString(options);
  
  return useQuery({
    queryKey: ['admin', 'content', type, options],
    queryFn: () => fetchAdmin(`/api/admin/content/${type}${queryString}`),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

export function useFlaggedContent() {
  return useQuery({
    queryKey: ['admin', 'content', 'flagged'],
    queryFn: () => fetchAdmin('/api/admin/content/flagged'),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// Analytics Hooks
export function useAnalytics(metric: string, params: Record<string, any> = {}) {
  const queryString = buildQueryString(params);
  
  return useQuery({
    queryKey: ['admin', 'analytics', metric, params],
    queryFn: () => fetchAdmin(`/api/admin/analytics/${metric}${queryString}`),
    staleTime: 5 * 60 * 1000, // 5 minutes for analytics
  });
}

export function useTotalUsers() {
  return useAnalytics('users/total');
}

export function useActiveUsers(days: number = 30) {
  return useAnalytics('users/active', { days });
}

export function useUserGrowth(period: 'day' | 'week' | 'month' = 'week') {
  return useAnalytics('users/growth', { period });
}

export function useTotalQuizAttempts() {
  return useAnalytics('quizzes/total');
}

export function useAverageQuizScore() {
  return useAnalytics('quizzes/score');
}

export function useAIUsageStats() {
  return useAnalytics('ai/usage');
}

export function usePopularCategories(limit: number = 10) {
  return useAnalytics('categories', { limit });
}

export function useContentStats() {
  return useAnalytics('content');
}

// System Monitoring Hooks
export function useLogs(type: LogType, options: LogQueryOptions = {}) {
  const queryString = buildQueryString(options);
  
  return useQuery({
    queryKey: ['admin', 'logs', type, options],
    queryFn: () => fetchAdmin(`/api/admin/logs/${type}${queryString}`),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

export function useSecurityLogs(options: LogQueryOptions = {}) {
  return useLogs('security', options);
}

export function useEmailLogs(options: LogQueryOptions = {}) {
  return useLogs('email', options);
}

export function useErrorLogs(options: LogQueryOptions = {}) {
  return useLogs('errors', options);
}

export function useAPIUsageLogs(options: LogQueryOptions = {}) {
  return useLogs('api-usage', options);
}

export function useAIQuota() {
  return useQuery({
    queryKey: ['admin', 'system', 'ai-quota'],
    queryFn: () => fetchAdmin('/api/admin/system/ai-quota'),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// Email Management Hooks
export function useMessages(options: PaginationOptions & { status?: string } = {}) {
  const queryString = buildQueryString(options);
  
  return useQuery({
    queryKey: ['admin', 'messages', options],
    queryFn: () => fetchAdmin(`/api/admin/messages${queryString}`),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

export function useMessage(id: number) {
  return useQuery({
    queryKey: ['admin', 'messages', id],
    queryFn: () => fetchAdmin(`/api/admin/messages/${id}`),
    staleTime: 1 * 60 * 1000, // 1 minute
    enabled: !!id,
  });
}


// Security Management Hooks
export function useUserLoginHistory(userId: number) {
  return useQuery({
    queryKey: ['admin', 'security', 'login-history', userId],
    queryFn: () => fetchAdmin(`/api/admin/security/login-history/${userId}`),
    staleTime: 1 * 60 * 1000, // 1 minute
    enabled: !!userId,
  });
}

export function useSuspiciousActivity(userId: number) {
  return useQuery({
    queryKey: ['admin', 'security', 'suspicious-activity', userId],
    queryFn: () => fetchAdmin(`/api/admin/security/suspicious-activity/${userId}`),
    staleTime: 1 * 60 * 1000, // 1 minute
    enabled: !!userId,
  });
}

// User's own security hooks
export function useMyLoginHistory() {
  return useQuery({
    queryKey: ['user', 'security', 'login-history'],
    queryFn: () => fetchAdmin('/api/user/security/login-history'),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

export function useRecoveryOptions() {
  return useQuery({
    queryKey: ['user', 'security', 'recovery-options'],
    queryFn: () => fetchAdmin('/api/user/security/recovery-options'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
