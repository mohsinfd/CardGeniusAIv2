/**
 * Error handling utilities for API calls
 */

export interface ApiError extends Error {
  status?: number;
  code?: string;
  retryable?: boolean;
}

/**
 * Parses an API error from various error types
 * @param error - The error object from a catch block
 * @returns A standardized ApiError object
 */
export function parseApiError(error: unknown): ApiError {
  if (error instanceof Error) {
    const apiError: ApiError = error;
    
    // Check if it's an Axios error with response
    if ('response' in error && error.response) {
      const response = (error as any).response;
      apiError.status = response.status;
      apiError.message = response.data?.message || response.statusText || error.message;
      apiError.code = response.data?.code;
      
      // Determine if error is retryable based on status code
      apiError.retryable = isRetryableStatusCode(apiError.status);
    } 
    // Check if it's a network error
    else if ('request' in error && (error as any).request) {
      apiError.message = 'Network error: Unable to connect to the server';
      apiError.code = 'NETWORK_ERROR';
      apiError.retryable = true;
    }
    
    return apiError;
  }
  
  // If it's not an Error instance, create a new one
  return {
    name: 'ApiError',
    message: typeof error === 'string' ? error : 'An unknown error occurred',
    retryable: true
  };
}

/**
 * Determines if a status code indicates a retryable error
 * @param statusCode - HTTP status code
 * @returns Whether the error is retryable
 */
function isRetryableStatusCode(statusCode?: number): boolean {
  if (!statusCode) return true;
  
  // 5xx errors are server errors and usually retryable
  // 408 is request timeout
  // 429 is too many requests (should retry after backoff)
  return (
    statusCode >= 500 || 
    statusCode === 408 || 
    statusCode === 429
  );
}

/**
 * Implements exponential backoff for retrying failed requests
 * @param fn - The async function to retry
 * @param retries - Maximum number of retries
 * @param initialDelay - Initial delay in ms before first retry
 * @param maxDelay - Maximum delay in ms
 * @returns Promise resolving to the function result or throwing the last error
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  initialDelay = 1000,
  maxDelay = 10000
): Promise<T> {
  let lastError: Error | undefined;
  let delay = initialDelay;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't wait on the last attempt
      if (attempt === retries) break;
      
      // Parse error to check if it's retryable
      const apiError = parseApiError(error);
      if (!apiError.retryable) throw apiError;
      
      // Calculate delay with exponential backoff and jitter
      const jitter = Math.random() * 0.3 + 0.85; // Random between 0.85-1.15
      delay = Math.min(delay * 2 * jitter, maxDelay);
      
      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Creates a user-friendly error message based on API error
 * @param error - The API error
 * @returns A user-friendly error message
 */
export function getUserFriendlyErrorMessage(error: ApiError): string {
  switch (error.code) {
    case 'NETWORK_ERROR':
      return 'Unable to connect to the server. Please check your internet connection.';
    case 'TIMEOUT':
      return 'The request took too long to complete. Please try again.';
    case 'UNAUTHORIZED':
    case 'FORBIDDEN':
      return 'You don\'t have permission to perform this action.';
    case 'NOT_FOUND':
      return 'The requested resource was not found.';
    case 'RATE_LIMITED':
      return 'Too many requests. Please try again in a moment.';
    case 'VALIDATION_ERROR':
      return 'There was a problem with the provided information.';
    case 'SERVER_ERROR':
      return 'Our server encountered an error. We\'ve been notified and are working on it.';
    default:
      if (error.status === 400) return 'The request contains invalid data.';
      if (error.status === 401) return 'Please log in to continue.';
      if (error.status === 403) return 'You don\'t have permission to access this.';
      if (error.status === 404) return 'The requested information could not be found.';
      if (error.status === 429) return 'Too many requests. Please try again later.';
      if (error.status && error.status >= 500) return 'Our server is having issues. Please try again later.';
      
      return error.message || 'An unexpected error occurred. Please try again.';
  }
} 