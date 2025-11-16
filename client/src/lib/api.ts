/**
 * Authenticated fetch wrapper for API calls
 * Automatically includes credentials (httpOnly cookies) and handles 401 responses
 */

export interface AuthenticatedFetchOptions extends RequestInit {
  // Allow overriding default options
}

/**
 * Wrapper around fetch that automatically includes credentials and handles authentication errors
 * @param url - The URL to fetch
 * @param options - Fetch options (credentials: 'include' is added automatically)
 * @returns Promise with the fetch response
 */
export async function authenticatedFetch(
  url: string,
  options: AuthenticatedFetchOptions = {}
): Promise<Response> {
  // Merge options with defaults
  const fetchOptions: RequestInit = {
    ...options,
    credentials: 'include', // Always include httpOnly cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, fetchOptions);

    // Handle token refresh automatically - backend middleware handles this
    // If still 401 after refresh attempt, user needs to log in again
    if (response.status === 401) {
      // Check if we're not already on the login page to avoid redirect loop
      if (!window.location.pathname.includes('/login')) {
        // Store the current path to redirect back after login
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
        
        // Redirect to login
        window.location.href = '/login';
      }
    }

    return response;
  } catch (error) {
    // Handle network errors
    throw error;
  }
}

/**
 * Helper function for GET requests
 */
export async function authenticatedGet<T = any>(url: string): Promise<T> {
  const response = await authenticatedFetch(url, { method: 'GET' });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      message: `HTTP ${response.status}: ${response.statusText}`
    }));
    throw errorData;
  }
  
  return response.json();
}

/**
 * Helper function for POST requests
 */
export async function authenticatedPost<T = any>(
  url: string,
  data?: any
): Promise<T> {
  const response = await authenticatedFetch(url, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      message: `HTTP ${response.status}: ${response.statusText}`
    }));
    throw errorData;
  }
  
  return response.json();
}

/**
 * Helper function for PATCH requests
 */
export async function authenticatedPatch<T = any>(
  url: string,
  data?: any
): Promise<T> {
  const response = await authenticatedFetch(url, {
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      message: `HTTP ${response.status}: ${response.statusText}`
    }));
    throw errorData;
  }
  
  return response.json();
}

/**
 * Helper function for PUT requests
 */
export async function authenticatedPut<T = any>(
  url: string,
  data?: any
): Promise<T> {
  const response = await authenticatedFetch(url, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      message: `HTTP ${response.status}: ${response.statusText}`
    }));
    throw errorData;
  }
  
  return response.json();
}

/**
 * Helper function for DELETE requests
 */
export async function authenticatedDelete<T = any>(url: string): Promise<T> {
  const response = await authenticatedFetch(url, { method: 'DELETE' });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      message: `HTTP ${response.status}: ${response.statusText}`
    }));
    throw errorData;
  }
  
  return response.json();
}
