import { SpendProfile } from '../types';

const MCP_SERVER_URL = 'http://localhost:3005';

export interface CardRecommendation {
  card_name: string;
  card_type: string;
  annual_fee: number;
  joining_fee: number;
  total_savings: number;
  card_id: string;
  annual_total: number;
  category_wise_breakdown: {
    [category: string]: {
      spend: number;
      reward: number;
    };
  };
}

export interface CardFacts {
  card_name: string;
  card_type: string;
  annual_fee: number;
  joining_fee: number;
  welcome_benefit: string;
  milestone_benefit: string;
  travel_benefit: string;
}

export const calculateSavings = async (spendProfile: SpendProfile): Promise<CardRecommendation[]> => {
  try {
    const response = await fetch(`${MCP_SERVER_URL}/calculate_savings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ spendProfile }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error calculating savings:', error);
    throw error;
  }
};

export const getCardFacts = async (cardName: string): Promise<CardFacts> => {
  try {
    const response = await fetch(`${MCP_SERVER_URL}/card_facts?card=${encodeURIComponent(cardName)}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting card facts:', error);
    throw error;
  }
};

export const suggestNextCategory = async (askedCategories: string[]): Promise<string | null> => {
  try {
    const response = await fetch(`${MCP_SERVER_URL}/suggest_categories?asked=${encodeURIComponent(askedCategories.join(','))}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.nextCategory || null;
  } catch (error) {
    console.error('Error suggesting next category:', error);
    throw error;
  }
}; 