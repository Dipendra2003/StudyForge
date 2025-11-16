import { useState, useCallback } from 'react';
import { handleApiRequest, showErrorToast, showSuccessToast } from '@/lib/errorHandler';

interface UseApiOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: unknown) => void;
  successMessage?: string;
  errorTitle?: string;
  showErrorToast?: boolean;
  showSuccessToast?: boolean;
}

export function useApi<T = any, P = any>(
  apiFunction: (params: P) => Promise<T>,
  options: UseApiOptions<T> = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  const execute = useCallback(
    async (params: P) => {
      setLoading(true);
      setError(null);

      try {
        const result = await handleApiRequest(
          () => apiFunction(params),
          {
            showErrorToast: options.showErrorToast ?? true,
            errorTitle: options.errorTitle,
          }
        );

        setData(result);

        if (options.successMessage && (options.showSuccessToast ?? true)) {
          showSuccessToast(options.successMessage);
        }

        if (options.onSuccess) {
          options.onSuccess(result);
        }

        return result;
      } catch (err) {
        setError(err);

        if (options.onError) {
          options.onError(err);
        }

        throw err;
      } finally {
        setLoading(false);
      }
    },
    [apiFunction, options]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    error,
    loading,
    execute,
    reset,
  };
}

// Hook for simple fetch requests
export function useFetch<T = any>(url: string, options: RequestInit = {}) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await handleApiRequest(
        async () => {
          // Always include credentials for authenticated requests
          const fetchOptions: RequestInit = {
            ...options,
            credentials: 'include',
          };
          
          const response = await fetch(url, fetchOptions);
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({
              message: `HTTP ${response.status}: ${response.statusText}`
            }));
            throw errorData;
          }

          return await response.json();
        },
        { showErrorToast: true }
      );

      setData(result);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [url, options]);

  return {
    data,
    error,
    loading,
    refetch: fetchData,
  };
}
