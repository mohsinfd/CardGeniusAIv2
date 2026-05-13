import { SpendingData } from './spending';

export interface ChatResponse {
  message: string;
  spending_data: SpendingData;
  follow_up_question: string | null;
}

export interface ErrorResponse {
  error: string;
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
} 