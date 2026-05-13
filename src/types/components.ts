import { SpendingData } from './spending';
import { ChatResponse } from './api';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  spending_data?: SpendingData;
  follow_up_question?: string | null;
}

export interface ChatInputProps {
  onSubmit: (message: string) => void;
  isLoading: boolean;
  placeholder?: string;
}

export interface ChatMessageProps {
  message: ChatMessage;
  onFollowUpClick?: (question: string) => void;
}

export interface SpendingDisplayProps {
  data: SpendingData;
  onCategoryClick?: (category: string) => void;
}

export interface FollowUpQuestionProps {
  question: string;
  onClick: () => void;
} 