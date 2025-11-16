import * as React from "react";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

// Error types
export interface ApiError {
  message: string;
  code?: string;
  errors?: Array<{ field: string; message: string }>;
  stack?: string;
  retryable?: boolean;
}

// Error codes and their user-friendly messages
export const ERROR_MESSAGES: Record<string, { title: string; message: string; suggestion?: string }> = {
  // Network errors
  NETWORK_ERROR: {
    title: "Connection Issue",
    message: "Unable to connect to the server",
    suggestion: "Check your internet connection and try again"
  },
  TIMEOUT: {
    title: "Request Timeout",
    message: "The request took too long to complete",
    suggestion: "Please try again in a moment"
  },
  
  // Authentication errors
  UNAUTHORIZED: {
    title: "Authentication Required",
    message: "You need to be logged in to perform this action",
    suggestion: "Please log in and try again"
  },
  INVALID_CREDENTIALS: {
    title: "Invalid Credentials",
    message: "The email or password you entered is incorrect",
    suggestion: "Please check your credentials and try again"
  },
  SESSION_EXPIRED: {
    title: "Session Expired",
    message: "Your session has expired",
    suggestion: "Please log in again to continue"
  },
  
  // Authorization errors
  FORBIDDEN: {
    title: "Access Denied",
    message: "You don't have permission to access this resource",
    suggestion: "Contact support if you believe this is an error"
  },
  
  // Resource errors
  NOT_FOUND: {
    title: "Not Found",
    message: "The requested resource could not be found",
    suggestion: "Please check the URL or try refreshing the page"
  },
  RESOURCE_DELETED: {
    title: "Resource Deleted",
    message: "This resource has been deleted",
    suggestion: "Please refresh the page to see updated content"
  },
  
  // Validation errors
  VALIDATION_ERROR: {
    title: "Invalid Input",
    message: "Please check your input and try again",
    suggestion: "Make sure all required fields are filled correctly"
  },
  DUPLICATE_ENTRY: {
    title: "Duplicate Entry",
    message: "This entry already exists",
    suggestion: "Please use a different value"
  },
  
  // AI Service errors
  AI_SERVICE_ERROR: {
    title: "AI Service Unavailable",
    message: "The AI service is temporarily unavailable",
    suggestion: "Please try again in a few moments"
  },
  RATE_LIMIT_EXCEEDED: {
    title: "Too Many Requests",
    message: "You've made too many requests",
    suggestion: "Please wait a moment before trying again"
  },
  CONTENT_TOO_LONG: {
    title: "Content Too Long",
    message: "The content exceeds the maximum length",
    suggestion: "Please shorten your input and try again"
  },
  GENERATION_FAILED: {
    title: "Generation Failed",
    message: "Failed to generate content",
    suggestion: "Please try again with different input"
  },
  
  // Server errors
  SERVER_ERROR: {
    title: "Server Error",
    message: "Something went wrong on our end",
    suggestion: "We're working on it. Please try again later"
  },
  DATABASE_ERROR: {
    title: "Database Error",
    message: "Unable to access the database",
    suggestion: "Please try again in a moment"
  },
  
  // Default
  UNKNOWN_ERROR: {
    title: "Unexpected Error",
    message: "An unexpected error occurred",
    suggestion: "Please try again or contact support if the issue persists"
  }
};

// Map HTTP status codes to error codes
function getErrorCodeFromStatus(status: number): string {
  switch (status) {
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 429:
      return 'RATE_LIMIT_EXCEEDED';
    case 500:
    case 502:
    case 503:
      return 'SERVER_ERROR';
    case 504:
      return 'TIMEOUT';
    default:
      return 'UNKNOWN_ERROR';
  }
}

// Extract error code from error object
export function getErrorCode(error: unknown): string {
  if (error && typeof error === 'object') {
    if ('code' in error && typeof error.code === 'string') {
      return error.code;
    }
    if ('status' in error && typeof error.status === 'number') {
      return getErrorCodeFromStatus(error.status);
    }
  }
  
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return 'NETWORK_ERROR';
  }
  
  return 'UNKNOWN_ERROR';
}

// Get user-friendly error details
export function getErrorDetails(error: unknown): { title: string; message: string; suggestion?: string } {
  const errorCode = getErrorCode(error);
  const errorDetails = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.UNKNOWN_ERROR;
  
  // If there's a custom message in the error, use it
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return {
      ...errorDetails,
      message: error.message
    };
  }
  
  return errorDetails;
}

// Extract error message from various error types
export function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === 'object') {
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }
    
    if ('error' in error && typeof error.error === 'string') {
      return error.error;
    }
  }

  return 'An unexpected error occurred';
}

// Check if error is retryable
export function isRetryableError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    if ('retryable' in error && typeof error.retryable === 'boolean') {
      return error.retryable;
    }
    
    if ('status' in error && typeof error.status === 'number') {
      const status = error.status;
      // Retry on server errors and rate limits
      return status === 429 || status >= 500;
    }
    
    if ('code' in error && typeof error.code === 'string') {
      const retryableCodes = ['NETWORK_ERROR', 'TIMEOUT', 'RATE_LIMIT_EXCEEDED', 'SERVER_ERROR', 'AI_SERVICE_ERROR'];
      return retryableCodes.includes(error.code);
    }
  }
  
  // Network errors are retryable
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }
  
  return false;
}

// Format validation errors
export function formatValidationErrors(errors?: Array<{ field: string; message: string }>): string {
  if (!errors || errors.length === 0) {
    return '';
  }

  return errors.map(err => `${err.field}: ${err.message}`).join(', ');
}

// Display error toast notification with retry option
export function showErrorToast(
  error: unknown, 
  options?: {
    title?: string;
    onRetry?: () => void;
  }
) {
  const errorDetails = getErrorDetails(error);
  const canRetry = isRetryableError(error);
  
  // Check if it's an API error with validation errors
  if (error && typeof error === 'object' && 'errors' in error) {
    const apiError = error as ApiError;
    const validationMessage = formatValidationErrors(apiError.errors);
    
    toast({
      variant: "destructive",
      title: options?.title || errorDetails.title,
      description: validationMessage || errorDetails.message,
    });
    return;
  }
  
  const description = errorDetails.suggestion 
    ? `${errorDetails.message}. ${errorDetails.suggestion}`
    : errorDetails.message;
  
  const toastConfig: any = {
    variant: "destructive",
    title: options?.title || errorDetails.title,
    description,
  };
  
  if (canRetry && options?.onRetry) {
    toastConfig.action = React.createElement(
      ToastAction,
      { altText: "Try again", onClick: options.onRetry },
      "Try Again"
    );
  }
  
  toast(toastConfig);
}

// Display success toast notification with icon
export function showSuccessToast(
  message: string, 
  options?: {
    title?: string;
    duration?: number;
    action?: any;
  }
) {
  const toastConfig: any = {
    title: options?.title || "Success",
    description: message,
    className: "border-green-500/50 bg-green-50 dark:bg-green-950",
  };
  
  if (options?.duration) {
    toastConfig.duration = options.duration;
  }
  
  if (options?.action) {
    toastConfig.action = options.action;
  }
  
  toast(toastConfig);
}

// Display info toast notification
export function showInfoToast(message: string, title = "Info") {
  toast({
    title,
    description: message,
  });
}

// Handle API errors with retry logic
export async function handleApiRequest<T>(
  requestFn: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    showErrorToast?: boolean;
    errorTitle?: string;
    onRetry?: () => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 2,
    retryDelay = 1000,
    showErrorToast: shouldShowErrorToast = true,
    errorTitle,
    onRetry
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      
      // Check if error is retryable
      if (!isRetryableError(error)) {
        break;
      }

      // Wait before retrying (except on last attempt)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }
  }

  // Show error toast if enabled
  if (shouldShowErrorToast) {
    showErrorToast(lastError, {
      title: errorTitle,
      onRetry
    });
  }

  throw lastError;
}

// Fetch wrapper with error handling
export async function fetchWithErrorHandling<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    // Always include credentials for authenticated requests
    const fetchOptions: RequestInit = {
      ...options,
      credentials: 'include',
    };
    
    const response = await fetch(url, fetchOptions);

    // Handle non-OK responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`
      }));

      throw {
        status: response.status,
        ...errorData
      };
    }

    return await response.json();
  } catch (error) {
    // Re-throw with additional context
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error. Please check your connection.');
    }
    throw error;
  }
}
