/**
 * API utility functions for making authenticated requests
 */
import { refreshAuthToken } from "./auth-refresh";

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

/**
 * Make an authenticated API request with automatic token inclusion
 */
export async function fetchWithAuth(url: string, options: FetchOptions = {}): Promise<Response> {
  const token = localStorage.getItem('accessToken');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Always include cookies for refresh token
  });

  // Handle 401 by attempting to refresh the token and retrying
  if (response.status === 401 && !url.includes('/api/auth/')) {
    const refreshSuccess = await refreshAuthToken();

    if (refreshSuccess) {
      // Retry the original request (new cookie will be included automatically)
      response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });
    } else {
      console.error('Authentication expired, please log in again.');
    }
  }

  return response;
}

/**
 * Make an authenticated GET request
 */
export async function apiGet(url: string): Promise<Response> {
  return fetchWithAuth(url, { method: 'GET' });
}

/**
 * Make an authenticated POST request
 */
export async function apiPost(url: string, data?: any): Promise<Response> {
  return fetchWithAuth(url, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * Make an authenticated PUT request
 */
export async function apiPut(url: string, data?: any): Promise<Response> {
  return fetchWithAuth(url, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * Make an authenticated DELETE request
 */
export async function apiDelete(url: string): Promise<Response> {
  return fetchWithAuth(url, { method: 'DELETE' });
}

/**
 * Make an authenticated PATCH request
 */
export async function apiPatch(url: string, data?: any): Promise<Response> {
  return fetchWithAuth(url, {
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * Quiz API functions
 */

export interface MotivationRequest {
  isCorrect?: boolean;
  streak?: number;
  score?: number;
  totalQuestions?: number;
  questionsAnswered?: number;
  type?: 'answer' | 'periodic';
}

export interface MotivationResponse {
  success: boolean;
  motivation: string;
}

/**
 * Generate motivational feedback based on performance
 */
export async function generateMotivation(data: MotivationRequest): Promise<string> {
  const response = await apiPost('/api/quiz/motivation', data);
  
  if (!response.ok) {
    throw new Error('Failed to generate motivation');
  }
  
  const result: MotivationResponse = await response.json();
  return result.motivation;
}
