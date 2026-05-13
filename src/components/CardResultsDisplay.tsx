import * as React from 'react';
import { CardRecommendation as CardGeniusCardRecommendation } from '@/types/cardgenius';

interface CardResultsDisplayProps {
  recommendations: CardGeniusCardRecommendation[];
  onRestart: () => void; // Function to switch back to chat view
}

export const CardResultsDisplay: React.FC<CardResultsDisplayProps> = ({ 
  recommendations,
  onRestart
}) => {

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

  return (
    <div className="results-container p-4 bg-gray-800 text-white rounded-lg mt-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Your Top Card Recommendations</h2>
        <button 
          onClick={onRestart}
          className="bg-gray-600 hover:bg-gray-700 text-white text-sm font-bold py-2 px-3 rounded"
        >
          &larr; Restart Search
        </button>
      </div>

      {/* Placeholder for Sorting/Filtering Controls - Add later */}
      {/* <div className="mb-4 flex space-x-2">...</div> */}

      {/* Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {recommendations.map((card) => (
          <Card key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}; 