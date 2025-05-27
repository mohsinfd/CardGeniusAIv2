import React from 'react';
import { CardRecommendation } from '../types';
import { CardRecommendationCard } from './CardRecommendationCard';

interface CardRecommendationsDisplayProps {
  recommendations: CardRecommendation[];
  followUpQuestion?: string;
}

export const CardRecommendationsDisplay: React.FC<CardRecommendationsDisplayProps> = ({ recommendations, followUpQuestion }) => {
  return (
    <div style={styles.container}>
      <p style={styles.headerText}>
        Here are my top recommendations based on your spending so far:
      </p>
      <div style={styles.cardsWrapper}>
        {recommendations.map(card => (
          <CardRecommendationCard key={card.id} card={card} />
        ))}
      </div>
      {followUpQuestion && (
        <p style={styles.followUpText}>{followUpQuestion}</p>
      )}
      <p style={styles.disclaimerText}>
        These recommendations may refine as you provide more details about your spending.
      </p>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '10px',
    border: '1px solid #eee',
    borderRadius: '8px',
    backgroundColor: '#f9f9f9',
    margin: '10px 0',
  },
  headerText: {
    fontSize: '1em',
    color: '#333',
    marginBottom: '15px',
    fontWeight: '500',
  },
  cardsWrapper: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: '10px',
    marginBottom: '15px',
  },
  followUpText: {
    fontSize: '1em',
    color: '#2c3e50',
    marginTop: '15px',
    padding: '10px',
    backgroundColor: '#e9f5ff',
    borderRadius: '6px',
    borderLeft: '4px solid #007bff',
  },
  disclaimerText: {
    fontSize: '0.85em',
    color: '#777',
    marginTop: '10px',
    textAlign: 'center',
  },
}; 