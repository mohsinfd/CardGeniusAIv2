'use client';

import React, { useState } from 'react';
import { CardResultsDisplayWithErrorHandling } from '../../components/CardResultsDisplayWithErrorHandling';
import ErrorBoundary from '../../components/ErrorBoundary';

// Sample card data for testing
const sampleCards = [
  {
    id: '1',
    card_name: 'Test Rewards Platinum',
    image: 'https://via.placeholder.com/300x200?text=Test+Card',
    total_savings_yearly: 25000,
    joining_fees: 1000,
    product_usps: [
      { header: '10% cashback on dining' }
    ],
    ck_store_url: 'https://example.com/apply'
  },
  {
    id: '2',
    card_name: 'Test Travel Gold',
    image: 'https://via.placeholder.com/300x200?text=Travel+Card',
    total_savings_yearly: 35000,
    joining_fees: 2500,
    product_usps: [
      { header: 'Free airport lounge access' }
    ],
    ck_store_url: 'https://example.com/apply'
  }
];

// Delay function for simulating API delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const TestErrorHandlingPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [cards, setCards] = useState<any[]>([]);
  const [errorScenario, setErrorScenario] = useState<string | null>(null);
  
  // Function to simulate loading cards with success
  const loadCardsSuccess = async () => {
    setIsLoading(true);
    await delay(2000); // Simulate API delay
    setCards(sampleCards);
    setIsLoading(false);
  };
  
  // Function to simulate empty results
  const loadCardsEmpty = async () => {
    setIsLoading(true);
    await delay(1500);
    setCards([]);
    setIsLoading(false);
  };
  
  // Function to simulate a network error
  const loadCardsNetworkError = async () => {
    setIsLoading(true);
    await delay(1000);
    setIsLoading(false);
    throw new Error('Network error: Unable to connect to the server');
  };
  
  // Function to simulate API error
  const loadCardsApiError = async () => {
    setIsLoading(true);
    await delay(1500);
    setIsLoading(false);
    const error: any = new Error('API Error: Server responded with 500 error');
    error.status = 500;
    throw error;
  };
  
  // Function to simulate data validation error
  const loadCardsDataError = async () => {
    setIsLoading(true);
    await delay(1200);
    setIsLoading(false);
    const error: any = new Error('Invalid data format received from API');
    error.status = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  };
  
  // Function to handle retry based on error scenario
  const handleRetry = async () => {
    if (errorScenario === 'network') {
      return loadCardsNetworkError();
    } else if (errorScenario === 'api') {
      return loadCardsApiError();
    } else if (errorScenario === 'data') {
      return loadCardsDataError();
    } else {
      return loadCardsSuccess();
    }
  };
  
  // Function to handle loading cards based on selected scenario
  const handleLoadCards = async (scenario: string) => {
    setErrorScenario(scenario);
    setCards([]);
    
    try {
      if (scenario === 'success') {
        await loadCardsSuccess();
      } else if (scenario === 'empty') {
        await loadCardsEmpty();
      } else if (scenario === 'network') {
        await loadCardsNetworkError();
      } else if (scenario === 'api') {
        await loadCardsApiError();
      } else if (scenario === 'data') {
        await loadCardsDataError();
      }
    } catch (error) {
      console.error('Error in test scenario:', error);
      // The error will be handled by the CardResultsDisplayWithErrorHandling component
    }
  };
  
  // Function to reset the demo
  const handleRestart = () => {
    console.log('Restart button clicked - resetting state');
    
    // Add a visual feedback indicator for restart
    const feedbackElement = document.createElement('div');
    feedbackElement.textContent = 'Restarting...';
    feedbackElement.style.position = 'fixed';
    feedbackElement.style.top = '20px';
    feedbackElement.style.right = '20px';
    feedbackElement.style.backgroundColor = 'rgba(0,0,0,0.7)';
    feedbackElement.style.color = 'white';
    feedbackElement.style.padding = '10px 20px';
    feedbackElement.style.borderRadius = '4px';
    feedbackElement.style.zIndex = '1000';
    document.body.appendChild(feedbackElement);
    
    // Reset all states
    setCards([]);
    setErrorScenario(null);
    setIsLoading(false);
    
    // Remove feedback after a short delay
    setTimeout(() => {
      document.body.removeChild(feedbackElement);
    }, 1500);
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Error Handling Test Page</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Test Scenarios</h2>
        <p className="text-gray-600 mb-4">
          Select a scenario to test different error handling cases:
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          <button
            onClick={() => handleLoadCards('success')}
            className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded"
          >
            Success Scenario
          </button>
          
          <button
            onClick={() => handleLoadCards('empty')}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
          >
            Empty Results
          </button>
          
          <button
            onClick={() => handleLoadCards('network')}
            className="bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded"
          >
            Network Error
          </button>
          
          <button
            onClick={() => handleLoadCards('api')}
            className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded"
          >
            API Error (500)
          </button>
          
          <button
            onClick={() => handleLoadCards('data')}
            className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded"
          >
            Data Validation Error
          </button>
        </div>
        
        <div className="bg-gray-100 p-3 rounded text-sm">
          <p className="font-medium">Current Scenario: {errorScenario || 'None'}</p>
        </div>
      </div>
      
      <ErrorBoundary>
        <CardResultsDisplayWithErrorHandling
          recommendations={cards}
          onRestart={handleRestart}
          onRetry={handleRetry}
          isLoading={isLoading}
        />
      </ErrorBoundary>
    </div>
  );
};

export default TestErrorHandlingPage; 