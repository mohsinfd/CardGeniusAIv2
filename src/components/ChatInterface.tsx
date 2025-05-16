import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { userRequestScenarios } from '../data/user-request-scenarios';
import { SpendingData } from '@/types/spending';
import { Message } from '@/types/message';
import Image from 'next/image';
import { CardRecommendation as CardGeniusCardRecommendation } from '@/types/cardgenius';
import { useApiErrorHandler } from '../hooks/useApiErrorHandler';
import { withRetry } from '../utils/errorHandling';
import CardResultsError from './CardResultsError';
import { DialogueState } from '@/types/schema';
import { SendIcon, Loader2Icon, UserIcon, BotIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { NextAction as BackendNextAction } from '@/lib/ConversationManager';
import { CardGeniusResponse } from '@/types/cardgenius';

// Deriving BackendActionType from BackendNextAction
type BackendActionType = BackendNextAction['type'];

interface ChatInterfaceProps {
  className?: string;
}

// Frontend-specific type for the API response from /api/chat
interface ChatApiResponse {
  type: BackendActionType | 'final' | 'question' | 'clarification';
  recommendations?: CardGeniusResponse | null;
  messageToUser?: string | null;
  message?: string | null;
  question?: string | null;
  fieldKey?: string | null;
  term?: string | null;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ className = '' }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0);
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const [isInitialMessage, setIsInitialMessage] = useState(true);
  const [fieldKeyLastAsked, setFieldKeyLastAsked] = useState<string | null>(null);
  const [termBeingClarified, setTermBeingClarified] = useState<string | null>(null);

  const [dialogueState, setDialogueState] = useState<DialogueState>({
    askedFields: [],
    pendingFields: [],
    chainStep: 0,
    currentField: ''
  });

  // State for card recommendations pagination
  const [fullCardRecommendations, setFullCardRecommendations] = useState<CardGeniusCardRecommendation[]>([]);
  const [displayedCardCount, setDisplayedCardCount] = useState(0);
  const [canShowMoreCards, setCanShowMoreCards] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { 
    error, 
    isError, 
    errorMessage,
    handleError, 
    clearError 
  } = useApiErrorHandler();

  const placeholders = userRequestScenarios.map(scenario => scenario.request);

  useEffect(() => {
    if (!showPlaceholder || messages.length > 0) return;
    
    const interval = setInterval(() => {
      setCurrentPlaceholderIndex((prevIndex) => {
        const newIndex = prevIndex === placeholders.length - 1 ? 0 : prevIndex + 1;
        return newIndex;
      });
    }, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [placeholders.length, showPlaceholder, messages.length]);

  const handleInputFocus = () => {
    setShowPlaceholder(false);
  };

  const handleInputBlur = () => {
    if (messages.length === 0 && !input.trim()) {
      setShowPlaceholder(true);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const { toast } = useToast();

  const makeApiCallWithRetry = useCallback(async (url: string, options: RequestInit) => {
    console.log('Debug - Making API call to:', url);
    console.log('Debug - Request options:', options);
    try {
      const response = await withRetry(() => fetch(url, options));
      console.log('Debug - Raw API response status:', response.status);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` }));
        console.error('Debug - API Error Response:', errorData);
        throw new Error(errorData.error || `Error: ${response.statusText || response.status}`);
      }
      const data = await response.json();
      console.log('Debug - API Success Response:', data);
      return data;
    } catch (error: any) {
      console.error('Error in makeApiCallWithRetry:', error.message, error);
      handleError(error.message || 'An unknown error occurred during API call');
      throw error; 
    }
  }, [handleError]);

  const handleSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (!input.trim() && !isLoading) return;

    const userMessageContent = input;
    const userMessage: Message = {
      id: Date.now().toString(),
      content: userMessageContent,
      role: 'user',
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    clearError();

    let requestBody;
    if (isInitialMessage) {
      requestBody = {
        userInput: userMessageContent,
        isInitialMessage: true,
      };
    } else if (termBeingClarified) {
      requestBody = {
        userInput: userMessageContent,
        isInitialMessage: false,
        termBeingClarified: termBeingClarified,
      };
    } else {
      requestBody = {
        userInput: userMessageContent,
        isInitialMessage: false,
        fieldKeyLastAsked: fieldKeyLastAsked,
      };
    }

    try {
      const data: ChatApiResponse = await makeApiCallWithRetry('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      // Ensure data.message (from 'info' type) is prioritized if present
      let assistantMessageContent = data.message || data.messageToUser || 'Processing your request...';
      let assistantRecommendationsForThisMessage: CardGeniusCardRecommendation[] = [];

      if (data.recommendations) {
        if (data.recommendations.success && Array.isArray(data.recommendations.savings)) {
          if (data.recommendations.savings.length > 0) {
            setFullCardRecommendations(data.recommendations.savings);
            assistantRecommendationsForThisMessage = data.recommendations.savings.slice(0, 3);
            setDisplayedCardCount(assistantRecommendationsForThisMessage.length);
            setCanShowMoreCards(data.recommendations.savings.length > 3);
            assistantMessageContent = data.recommendations.message || data.messageToUser || "Here are your top card recommendations:";
          } else {
            // Success but no savings/cards
            setFullCardRecommendations([]);
            setDisplayedCardCount(0);
            setCanShowMoreCards(false);
            assistantMessageContent = data.recommendations.message || data.messageToUser || "I found some information, but there are no specific card recommendations in this response.";
          }
        } else {
          // Recommendations object exists, but not success or savings not an array
          setFullCardRecommendations([]);
          setDisplayedCardCount(0);
          setCanShowMoreCards(false);
          assistantMessageContent = data.recommendations.message || data.messageToUser || "Sorry, I couldn't retrieve valid recommendations at this time.";
        }
      } else if (data.type === 'ERROR') {
         assistantMessageContent = data.messageToUser || "An error occurred processing your request.";
         setCanShowMoreCards(false); // Ensure no "show more" on error
      }
      
      // Dialogue state management
      if ((data.type === 'ASK_QUESTION' || data.type === 'question') && data.fieldKey) {
        assistantMessageContent = data.message || data.messageToUser || data.question || "I have a question for you:";
        setFieldKeyLastAsked((data.fieldKey as string) || null);
        setTermBeingClarified(null);
        setDialogueState(prev => ({
          ...prev,
          currentField: (data.fieldKey as string) || '',
          chainStep: prev.chainStep + 1,
        }));
        setIsInitialMessage(false);
        setCanShowMoreCards(false);
      } else if (data.type === 'clarification' && data.term && (data.message || data.question)) {
        assistantMessageContent = data.message || data.question || `Please tell me more about "${data.term}".`;
        setTermBeingClarified(data.term as string);
        setFieldKeyLastAsked(null);
        setIsInitialMessage(false);
        setCanShowMoreCards(false);
        setDialogueState(prev => ({ ...prev, currentField: 'clarification', chainStep: prev.chainStep + 1 }));
      } else {
        const fieldResetTypes: Array<BackendActionType | 'final' | 'question' | 'clarification'> = ['END_CONVERSATION', 'CALL_API', 'ERROR', 'final'];
        if (fieldResetTypes.includes(data.type as (BackendActionType | 'final' | 'question' | 'clarification'))) {
          setFieldKeyLastAsked(null);
          setTermBeingClarified(null);
          setDialogueState(prev => ({ ...prev, currentField: '', chainStep: 0 }));

          if (data.type === 'final') {
            // If type is 'final', it implies recommendations were processed.
            // isInitialMessage is set based on whether we CAN show more or if this is the end of interaction.
            // For now, setting to false to allow follow-up. Further logic might be needed for "restart".
            setIsInitialMessage(false); 
          } else {
            setIsInitialMessage(true); // Reset for other "ending" types like ERROR or explicit END
            setCanShowMoreCards(false); // Reset show more state
          }
        }
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: assistantMessageContent,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        recommendations: assistantRecommendationsForThisMessage
      };
      setMessages(prev => [...prev, assistantMessage]);

    } catch (error:any) {
      console.error('Error in handleSubmit (after API call attempt):', error.message, error);
      const lastMessage = messages[messages.length - 1];
      if (!(lastMessage?.role === 'assistant' && lastMessage?.content.includes('error'))) {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          content: error.message || 'Sorry, I encountered an error. Please try again.',
          role: 'assistant',
          timestamp: new Date().toISOString(),
        } as Message]);
      }
      setIsInitialMessage(true);
      setFieldKeyLastAsked(null);
      setTermBeingClarified(null);
      setDialogueState(prev => ({ ...prev, currentField: '', chainStep: 0 }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleShowMoreCards = () => {
    if (!fullCardRecommendations.length || displayedCardCount >= fullCardRecommendations.length) {
      setCanShowMoreCards(false);
      return;
    }

    const nextCardsToShow = fullCardRecommendations.slice(displayedCardCount, displayedCardCount + 3);
    
    if (nextCardsToShow.length > 0) {
      const newAssistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Here are some more card options:",
        role: 'assistant',
        timestamp: new Date().toISOString(),
        recommendations: nextCardsToShow,
      };
      setMessages(prev => [...prev, newAssistantMessage]);
      
      const newDisplayedCount = displayedCardCount + nextCardsToShow.length;
      setDisplayedCardCount(newDisplayedCount);
      setCanShowMoreCards(fullCardRecommendations.length > newDisplayedCount);
    } else {
      setCanShowMoreCards(false); // No more cards to show from the slice
    }
  };

  const CardRecommendationDisplay = ({ recommendations }: { recommendations: CardGeniusCardRecommendation[] }) => {
    console.log("CardRecommendationDisplay received recommendations:", recommendations);

    if (!recommendations || recommendations.length === 0) {
      // This path should ideally not be hit if handleSubmit filters correctly,
      // but as a fallback for the component itself.
      return (
        <div className="text-center text-gray-500 py-4">
          No card recommendations to display in this message.
        </div>
      );
    }
    
    // The 'recommendations' prop here is ALREADY SLICED (e.g., top 3, or next 3)
    // So, no need to slice again. The filter for valid cards is still good.
    const cardsToDisplay = recommendations
      .filter(card => 
        card && 
        card.card_name && 
        card.image && 
        card.joining_fees !== undefined && 
        card.total_savings_yearly !== undefined &&
        card.ck_store_url
      );

    if (cardsToDisplay.length === 0) {
      return (
        <div className="text-center text-gray-500 py-4">
          No valid card recommendations available to display.
        </div>
      );
    }

    return (
      // Using flex column for vertical list. Removed individual card border.
      <div className="flex flex-col space-y-3 mt-3"> 
        {cardsToDisplay.map((card) => (
          <div
            key={card.id || card.card_name}
            // Removed border, bg-white, shadow-md from here. Added padding.
            className="rounded-lg p-3 bg-gray-50" // Light bg for card item within bubble
          >
            <div className="flex items-start space-x-3">
              <div className="w-16 h-10 flex-shrink-0 relative"> {/* Adjusted height for card image */}
                <img
                  src={card.image}
                  alt={card.card_name}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://via.placeholder.com/64';
                  }}
                />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {card.card_name}
                </h3>
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Joining Fee:</span> ₹{card.joining_fees}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Annual Savings:</span> ₹{(card.total_savings_yearly || 0).toLocaleString()}
                  </p>
                  {card.welcomeBenefits && card.welcomeBenefits.length > 0 && card.welcomeBenefits[0].cash_value && (
                    <p className="text-sm text-green-600">
                      <span className="font-medium">Welcome Benefit:</span> ₹{card.welcomeBenefits[0].cash_value.toLocaleString()}
                    </p>
                  )}
                </div>
                {card.ck_store_url && (
                  <a
                    href={card.ck_store_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-800"
                  >
                    Apply Now →
                  </a>
                )}
              </div>
            </div>
            {card.product_usps && card.product_usps.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-700">Key Benefits:</h4>
                <ul className="mt-1 space-y-1">
                  {card.product_usps.slice(0, 2).map((usp, idx) => (
                    <li key={idx} className="text-xs text-gray-600">
                      • {usp.header}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const RecommendationsSummary = ({ recommendations }: { recommendations: CardGeniusCardRecommendation[] }) => {
    if (!recommendations || recommendations.length === 0) return null;

    const sortedCards = recommendations
      .filter(card => 
        card && 
        card.card_name && 
        card.image && 
        card.joining_fees !== undefined && 
        card.total_savings_yearly !== undefined &&
        card.ck_store_url
      )
      .sort((a, b) => (b.total_savings_yearly || 0) - (a.total_savings_yearly || 0));

    if (sortedCards.length === 0) return null;

    return (
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <h3 className="text-xl font-semibold text-white mb-4">Best Card Options</h3>
        <div className="space-y-4">
          {sortedCards.map((card, index) => (
            <div key={index} className="flex justify-between items-center">
              <div>
                <p className="text-white font-medium">{card.card_name}</p>
                <p className="text-gray-400 text-sm">Joining Fee: ₹{card.joining_fees}</p>
              </div>
              <div className="text-right">
                <p className="text-white font-medium">₹{(card.total_savings_yearly || 0).toLocaleString()}</p>
                <p className="text-gray-400 text-sm">Annual Savings</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMessage = (message: Message) => {
    return (
      <div
        key={message.id}
        className={`flex ${
          message.role === 'user' ? 'justify-end' : 'justify-start'
        } mb-4`}
      >
        <div
          className={`max-w-[80%] rounded-lg p-4 ${
            message.role === 'user'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          <div className="whitespace-pre-wrap">{message.content}</div>
          {message.recommendations && message.recommendations.length > 0 && (
            <CardRecommendationDisplay recommendations={message.recommendations} />
          )}
        </div>
      </div>
    );
  };

  const renderErrorState = () => {
    if (!isError) return null;
    
    const errorType = 
      error?.code === 'NETWORK_ERROR' ? 'network' : 
      error?.status === 404 ? 'data' :
      error?.status && error.status >= 500 ? 'api' : 'general';
    
    return (
      <div className="mt-4 mb-4">
        <CardResultsError
          error={error}
          errorType={errorType}
          onRetry={handleSubmit}
          onRestart={() => {
            clearError();
          }}
        />
      </div>
    );
  };

  return (
    <div className={`chat-container ${className}`}>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <motion.div
            key={message.timestamp}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {renderMessage(message)}
          </motion.div>
        ))}
        
        {renderErrorState()}
        
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="p-3 rounded-lg bg-muted text-muted-foreground rounded-bl-none flex items-center">
              <Loader2Icon className="animate-spin h-5 w-5 mr-2" /> Thinking...
            </div>
          </motion.div>
        )}
        {/* Button to show more cards */}
        {canShowMoreCards && !isLoading && (
          <div className="flex justify-center mt-2 mb-4">
            <Button onClick={handleShowMoreCards} variant="outline" size="sm">
              Show Next 3 Cards
            </Button>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="search-container">
        <div className="search-input-wrapper">
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder={showPlaceholder ? placeholders[currentPlaceholderIndex] : 'Type your message...'}
            className="search-input"
            data-expanded={input.length > 0}
            disabled={isLoading || isRetrying}
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="send-button"
          >
            {isLoading ? (
              <Loader2Icon className="animate-spin h-5 w-5" />
            ) : (
              <SendIcon className="h-5 w-5" />
            )}
            <span className="sr-only">Send</span>
          </Button>
        </div>
      </form>
    </div>
  );
}; 