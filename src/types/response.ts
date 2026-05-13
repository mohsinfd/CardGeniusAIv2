import { CardRecommendation } from './cardgenius';

export interface CardGeniusResponse {
  success: boolean;
  message: string;
  savings: CardRecommendation[];
} 