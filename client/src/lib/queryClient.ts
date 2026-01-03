import { QueryClient } from "@tanstack/react-query";

interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  data?: any;
  body?: any; // Add body option for direct body passing
  params?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { method = "GET", data, body, params, headers = {} } = options;

  // Build query string for GET requests
  let url = endpoint;
  if (params) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });
    const queryString = queryParams.toString();
    if (queryString) {
      url = `${url}${url.includes("?") ? "&" : "?"}${queryString}`;
    }
  }

  // Get authentication token
  const token = localStorage.getItem('accessToken');

  // Setup request options
  const requestOptions: RequestInit = {
    method,
    headers: {
      ...headers,
    },
    credentials: "include",
  };

  // Add Authorization header if token exists
  if (token) {
    requestOptions.headers = {
      'Authorization': `Bearer ${token}`,
      ...requestOptions.headers,
    };
  }

  // Add body for non-GET requests
  if (method !== "GET") {
    if (body !== undefined) {
      // Use body directly if provided (e.g., FormData)
      requestOptions.body = body;
      // Don't set Content-Type for FormData - browser will set it with boundary
      if (!(body instanceof FormData)) {
        requestOptions.headers = {
          "Content-Type": "application/json",
          ...requestOptions.headers,
        };
      }
    } else if (data !== undefined) {
      // Otherwise use data and stringify it
      requestOptions.body = JSON.stringify(data);
      requestOptions.headers = {
        "Content-Type": "application/json",
        ...requestOptions.headers,
      };
    }
  } else {
    // For GET requests, always set Content-Type
    requestOptions.headers = {
      "Content-Type": "application/json",
      ...requestOptions.headers,
    };
  }

  // Make the request
  const response = await fetch(url, requestOptions);

  // Handle errors
  if (!response.ok) {
    let errorMessage: string;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || `API request failed with status ${response.status}`;
    } catch (e) {
      errorMessage = `API request failed with status ${response.status}`;
    }
    throw new Error(errorMessage);
  }

  // Return the data
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }
  
  return response.text() as unknown as T;
}

// Utility functions for common operations
export const apiGet = <T>(endpoint: string, options?: Omit<ApiRequestOptions, "method">) => 
  apiRequest<T>(endpoint, { ...options, method: "GET" });

export const apiPost = <T>(endpoint: string, data?: any, options?: Omit<ApiRequestOptions, "method" | "data">) => 
  apiRequest<T>(endpoint, { ...options, method: "POST", data });

export const apiPut = <T>(endpoint: string, data?: any, options?: Omit<ApiRequestOptions, "method" | "data">) => 
  apiRequest<T>(endpoint, { ...options, method: "PUT", data });

export const apiPatch = <T>(endpoint: string, data?: any, options?: Omit<ApiRequestOptions, "method" | "data">) => 
  apiRequest<T>(endpoint, { ...options, method: "PATCH", data });

export const apiDelete = <T>(endpoint: string, options?: Omit<ApiRequestOptions, "method">) => 
  apiRequest<T>(endpoint, { ...options, method: "DELETE" });

// Export a pre-configured QueryClient instance
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default queryClient;