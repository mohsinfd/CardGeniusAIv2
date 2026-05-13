import { SpendingData } from './spending';
import { CardGeniusResponse } from './cardgenius';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  spendingData?: SpendingData;
  followUpQuestion?: string;
  isLoading?: boolean;
}

export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  currentSpendingData: SpendingData;
}

export interface ChatResponse {
  message: string;
  spending_data: SpendingData;
  follow_up_question: string;
  card_recommendations?: CardGeniusResponse;
} 
