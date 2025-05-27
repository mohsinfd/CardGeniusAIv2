import React from 'react';
import { CardRecommendation } from '../types';

interface CardRecommendationCardProps {
  card: CardRecommendation;
}

export const CardRecommendationCard: React.FC<CardRecommendationCardProps> = ({ card }) => {
  return (
    <div style={styles.card}>
      {card.imageUrl && (
        <img src={card.imageUrl} alt={`${card.name} image`} style={styles.cardImage} />
      )}
      {!card.imageUrl && <div style={styles.imagePlaceholder}></div>}
      <h3 style={styles.cardName}>{card.name}</h3>
      <div style={styles.cardDetails}>
        {card.joiningFee && <p><strong>Joining Fee:</strong> {card.joiningFee}</p>}
        {card.annualFee && <p><strong>Annual Fee:</strong> {card.annualFee}</p>}
        {card.annualRewards && <p><strong>Est. Annual Rewards:</strong> {card.annualRewards}</p>}
        {card.keyPerks && card.keyPerks.length > 0 && (
          <div>
            <strong>Key Perks:</strong>
            <ul style={styles.perksList}>
              {card.keyPerks.map((perk, index) => (
                <li key={index} style={styles.perkItem}>{perk}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {card.detailsLink && (
        <a href={card.detailsLink} target="_blank" rel="noopener noreferrer" style={styles.detailsLink}>
          View Details
        </a>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  card: {
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '16px',
    margin: '10px 0',
    backgroundColor: '#ffffff',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    maxWidth: '280px',
  },
  imagePlaceholder: {
    width: '100%',
    height: '150px',
    backgroundColor: '#f0f0f0',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#cccccc',
    fontSize: '14px',
    marginBottom: '12px',
  },
  cardImage: {
    width: '100%',
    height: 'auto',
    maxHeight: '150px',
    objectFit: 'contain',
    borderRadius: '6px',
    marginBottom: '12px',
  },
  cardName: {
    fontSize: '1.2em',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 10px 0',
    textAlign: 'center',
  },
  cardDetails: {
    fontSize: '0.9em',
    color: '#555',
    width: '100%',
  },
  perksList: {
    listStyleType: 'disc',
    paddingLeft: '20px',
    margin: '5px 0 0 0',
  },
  perkItem: {
    marginBottom: '4px',
  },
  detailsLink: {
    marginTop: '12px',
    color: '#007bff',
    textDecoration: 'none',
    fontWeight: 'bold',
  },
}; 