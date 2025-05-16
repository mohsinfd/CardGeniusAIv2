import { CardRecommendation as CardGeniusCardRecommendation } from './cardgenius';
import { SpendingData } from './spending';

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  spending_data?: SpendingData;
  follow_up_question?: string;
  recommendations?: CardGeniusCardRecommendation[];
} 