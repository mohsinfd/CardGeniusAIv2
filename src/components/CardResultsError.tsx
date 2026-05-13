import React from 'react';

interface CardResultsErrorProps {
  error?: Error | null;
  errorType?: 'api' | 'network' | 'data' | 'general';
  onRetry: () => void;
  onRestart?: () => void;
}

/**
 * Specialized error component for the card results page
 * Provides context-specific error messages and actions
 */
const CardResultsError: React.FC<CardResultsErrorProps> = ({
  error,
  errorType = 'general',
  onRetry,
  onRestart
}) => {
  // Error message mapping based on error type
  const errorMessages = {
    api: 'We couldn\'t retrieve card recommendations at the moment.',
    network: 'Network error: Please check your internet connection.',
    data: 'We couldn\'t process your spending information correctly.',
    general: 'Something went wrong while finding your card recommendations.'
  };

  // Error actions and guidance based on error type
  const errorGuidance = {
    api: 'Our recommendation service might be experiencing issues. Try again in a moment.',
    network: 'Check your internet connection and try again.',
    data: 'Please restart the search with more specific spending information.',
    general: 'You can try again or restart your search with different information.'
  };

  return (
    <div className="bg-gray-800 border-l-4 border-yellow-500 p-6 rounded-lg shadow-md text-white max-w-4xl mx-auto my-8">
      <div className="flex flex-col md:flex-row items-start md:items-center">
        <div className="flex-shrink-0 text-yellow-400 mr-4 mb-4 md:mb-0">
          <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-yellow-300 mb-2">
            {errorMessages[errorType]}
          </h2>
          <p className="text-gray-300 mb-4">
            {errorGuidance[errorType]}
          </p>
          {error && error.message && (
            <div className="bg-gray-700 p-3 rounded mb-4 text-sm text-gray-300 border border-gray-600">
              <span className="font-medium text-yellow-400">Error details: </span>
              {error.message}
            </div>
          )}
          <div className="flex flex-wrap gap-3 mt-4">
            <button
              onClick={onRetry}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Try Again
            </button>
            {onRestart && (
              <button
                onClick={() => {
                  // Create a visual feedback for the click
                  const target = document.activeElement as HTMLElement;
                  if (target) {
                    const originalBg = target.style.backgroundColor;
                    target.style.backgroundColor = '#4B5563'; // darker gray
                    setTimeout(() => {
                      target.style.backgroundColor = originalBg;
                    }, 200);
                  }
                  onRestart();
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Restart Search
              </button>
            )}
            <a
              href="/"
              className="bg-transparent border border-gray-500 hover:border-gray-400 text-gray-300 hover:text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Return Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardResultsError; 