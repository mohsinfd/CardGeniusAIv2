import { useState, useCallback } from 'react';
import { ApiError, parseApiError, getUserFriendlyErrorMessage } from '../utils/errorHandling';

interface UseApiErrorHandlerResult {
  error: ApiError | null;
  isError: boolean;
  errorMessage: string;
  setError: (error: unknown) => void;
  clearError: () => void;
  handleError: (error: unknown) => void;
}

/**
 * Hook for handling API errors in React components
 * @param onError Optional callback for when errors occur
 * @returns Object with error state and handler functions
 */
export function useApiErrorHandler(
  onError?: (error: ApiError) => void
): UseApiErrorHandlerResult {
  const [error, setErrorState] = useState<ApiError | null>(null);

  // Set error with proper parsing
  const setError = useCallback((err: unknown) => {
    const parsedError = parseApiError(err);
    setErrorState(parsedError);
    if (onError) {
      onError(parsedError);
    }
    // Optionally log to monitoring/analytics service here
    console.error('[API Error]', parsedError);
  }, [onError]);

  // Clear error state
  const clearError = useCallback(() => {
    setErrorState(null);
  }, []);

  // Handle error with proper parsing and return boolean indicating if handled
  const handleError = useCallback((err: unknown) => {
    setError(err);
  }, [setError]);

  // Generate user-friendly error message
  const errorMessage = error ? getUserFriendlyErrorMessage(error) : '';

  return {
    error,
    isError: !!error,
    errorMessage,
    setError,
    clearError,
    handleError
  };
}

/**
 * Higher-order function to wrap async API calls with error handling
 * @param apiCall The API call function to wrap
 * @param errorHandler The error handler from useApiErrorHandler
 * @returns A function that calls the API and handles errors
 */
export function withErrorHandling<T, Args extends any[]>(
  apiCall: (...args: Args) => Promise<T>,
  { handleError, clearError }: Pick<UseApiErrorHandlerResult, 'handleError' | 'clearError'>
): (...args: Args) => Promise<T | null> {
  return async (...args: Args) => {
    try {
      clearError();
      return await apiCall(...args);
    } catch (error) {
      handleError(error);
      return null;
    }
  };
} 