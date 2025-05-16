import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { CardRecommendation as CardGeniusCardRecommendation } from '@/types/cardgenius';
import ErrorBoundary from './ErrorBoundary';
import CardResultsError from './CardResultsError';
import { useApiErrorHandler } from '../hooks/useApiErrorHandler';
import { withRetry } from '../utils/errorHandling';

interface CardResultsDisplayProps {
  recommendations: CardGeniusCardRecommendation[];
  onRestart: () => void; // Function to switch back to chat view
  onRetry?: () => Promise<void>; // Function to retry loading recommendations
  isLoading?: boolean;
}

export const CardResultsDisplayWithErrorHandling: React.FC<CardResultsDisplayProps> = ({ 
  recommendations,
  onRestart,
  onRetry,
  isLoading = false
}) => {
  // Error handling
  const { 
    error, 
    isError, 
    handleError, 
    clearError,
    errorMessage
  } = useApiErrorHandler();

  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  // Handle retry with exponential backoff
  const handleRetry = useCallback(async () => {
    if (!onRetry) return;
    
    setIsRetrying(true);
    try {
      clearError();
      // Use withRetry utility to automatically handle retries with backoff
      await withRetry(
        onRetry,
        Math.min(retryCount, 2), // Limit retry attempts
        1000, // Start with 1 second delay
        5000  // Max 5 second delay
      );
      setRetryCount(0); // Reset count on success
    } catch (err) {
      handleError(err);
      setRetryCount(prev => prev + 1);
    } finally {
      setIsRetrying(false);
    }
  }, [onRetry, retryCount, clearError, handleError]);

  // Error view
  if (isError) {
    return (
      <CardResultsError
        error={error}
        errorType={
          error?.code === 'NETWORK_ERROR' ? 'network' : 
          error?.status === 404 ? 'data' :
          error?.status && error.status >= 500 ? 'api' : 'general'
        }
        onRetry={handleRetry}
        onRestart={onRestart}
      />
    );
  }

  // Loading state
  if (isLoading || isRetrying) {
    return (
      <div className="loading-container p-4 bg-gray-800 text-white rounded-lg mt-4 flex flex-col items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-lg text-gray-300">{isRetrying ? 'Retrying...' : 'Loading your card recommendations...'}</p>
      </div>
    );
  }

  // Basic Card component (can be moved to its own file later)
  const Card = ({ card }: { card: CardGeniusCardRecommendation }) => (
    <div className="bg-gray-700 rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow flex flex-col justify-between">
      <div>
        <img
          src={card.image}
          alt={card.card_name}
          className="w-24 h-16 object-contain mx-auto mb-3 rounded bg-white p-1"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'https://via.placeholder.com/96x64?text=No+Image'; // Placeholder
          }}
        />
        <h3 className="text-lg font-semibold text-white truncate mb-2 text-center">
          {card.card_name}
        </h3>
        <div className="text-center mb-3">
          <p className="text-sm text-gray-300">
            Savings: <span className="font-medium text-green-400">₹{card.total_savings_yearly?.toLocaleString() || 'N/A'} / year</span>
          </p>
          <p className="text-xs text-gray-400">
            Joining Fee: ₹{card.joining_fees || '0'}
          </p>
        </div>
        {/* Placeholder for Key Benefits */}
        <div className="text-xs text-gray-400 mt-2 border-t border-gray-600 pt-2">
          <p className="font-medium mb-1 text-gray-300">Key Benefit:</p>
          <p>• {card.product_usps?.[0]?.header || 'Benefit info unavailable'}</p>
        </div>
      </div>
      {/* Placeholder for Buttons */}
      <div className="mt-4 flex space-x-2">
        <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-1 px-2 rounded transition-colors">
          Details
        </button>
        {card.ck_store_url && (
          <a
            href={card.ck_store_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm py-1 px-2 rounded transition-colors text-center"
          >
            Apply Now
          </a>
        )}
      </div>
    </div>
  );

  // Empty state
  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="empty-state p-6 bg-gray-800 text-white rounded-lg mt-4 text-center">
        <svg className="h-16 w-16 text-gray-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <h3 className="text-xl font-medium mb-2">No Card Recommendations Found</h3>
        <p className="text-gray-400 mb-4">We couldn't find cards that match your spending profile. Try adjusting your information.</p>
        <button
          onClick={onRestart}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
        >
          Restart Search
        </button>
      </div>
    );
  }

  // Main results view
  return (
    <ErrorBoundary
      fallback={
        <CardResultsError 
          errorType="general"
          onRetry={handleRetry}
          onRestart={onRestart}
        />
      }
    >
      <div className="results-container p-4 bg-gray-800 text-white rounded-lg mt-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Your Top Card Recommendations</h2>
          <button 
            onClick={() => {
              console.log('Restart Search button clicked in results view');
              // Add visual feedback
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
            className="bg-gray-600 hover:bg-gray-700 text-white text-sm font-bold py-2 px-3 rounded"
          >
            &larr; Restart Search
          </button>
        </div>

        {/* Card Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {recommendations.map((card) => (
            <Card key={card.id} card={card} />
          ))}
        </div>
      </div>
    </ErrorBoundary>
  );
}; 