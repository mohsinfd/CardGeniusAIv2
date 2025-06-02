import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, SpendProfile } from '../types';
import { 
  // sendMessage, // Deprecated
  parseIntentAndSpends,
  generateFollowUpQuestion,
  verbalizeRecommendations,
  explainCardPerks,
  ParsedIntentAndSpends
} from '../services/openai';
import { Message } from './Message';
import { MessageInput } from './MessageInput';
import { LoadingMessage } from './LoadingMessage';
import { ErrorMessage } from './ErrorMessage';
import { CategoryGraph, SPEND_SCHEMA_CATEGORIES, CATEGORY_GRAPH } from '../CategoryGraph';
import { calculateSavings, getCardFacts, suggestNextCategory } from '../services/cardApiService';
import { CardExpert, CardExpertContext } from '../services/cardExpert';

interface ChatInterfaceProps {
  // Keep for backward compatibility, but we won't use it
}

export const ChatInterface: React.FC<ChatInterfaceProps> = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [currentSpendProfile, setCurrentSpendProfile] = useState<Partial<SpendProfile>>({});
  const [categoryGraphInstance, setCategoryGraphInstance] = useState<CategoryGraph | null>(null);
  const [currentQuestionCategory, setCurrentQuestionCategory] = useState<string | null>(null);
  const [currentFocusPurpose, setCurrentFocusPurpose] = useState<string | null>(null);
  const [skippedCategories, setSkippedCategories] = useState<Set<string>>(new Set());
  const [cardExpert] = useState(() => new CardExpert());

  useEffect(() => {
    // Initialize with a default message
    setMessages([
      {
      role: 'assistant',
        content: "Hi! I'm CardGenius. Tell me about your monthly spending, and I'll help find the best credit card for you. For example: 'I spend 5000 on Amazon, 3000 on fuel, and 2000 on dining.'"
      }
    ]);
    setCategoryGraphInstance(new CategoryGraph());
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !categoryGraphInstance) return;

    const userMessage: ChatMessage = { role: 'user', content };
    addMessage(userMessage);
    setIsLoading(true);
    setError(null);

    try {
      // Create expert context
      const expertContext: CardExpertContext = {
        spendingProfile: currentSpendProfile,
        conversationHistory: messages,
        currentFocus: currentFocusPurpose
      };

      // Get expert analysis
      const expertAnalysis = await cardExpert.provideExpertAnalysis(expertContext);

      // Parse user intent with the help of expert analysis
      const parsedResult = await parseIntentAndSpends(content, currentQuestionCategory ? { [currentQuestionCategory]: 0 } : currentSpendProfile);

      let assistantResponse: ChatMessage | null = null;

      if (parsedResult.intent === 'BEST_CARD' || parsedResult.intent === 'CONTINUE_CONVERSATION') {
        // Use expert analysis to provide more intelligent responses
        const bestMatches = expertAnalysis.expertInsights.cardRecommendations.bestMatches;
        const optimizationTips = expertAnalysis.expertInsights.optimizationTips;

        if (bestMatches.length > 0) {
          assistantResponse = {
            role: 'assistant',
            content: `Based on your spending patterns, I recommend the following cards:\n\n${
              bestMatches.map((card: any) => 
                `- ${card.card_name}: ${card.benefit_type} rewards at ${card.benefit_value}%\n` +
                `  Estimated annual rewards: ₹${card.reward_amount}\n` +
                `  ${(optimizationTips.cardUsageTips as Record<string, string>)[card.id] || ''}`
              ).join('\n')
            }\n\nWould you like to know more about any of these cards?`
          };
        } else {
          // If no direct matches, use the expert's optimization tips
          assistantResponse = {
            role: 'assistant',
            content: `I notice you could optimize your rewards by:\n\n${
              optimizationTips.spendingOptimization.map((tip: string) => `- ${tip}`).join('\n')
            }\n\nWould you like me to suggest some cards that could help with this?`
          };
        }
      } else if (parsedResult.intent === 'CARD_EXPLAIN') {
        if (parsedResult.card_name) {
          const cardDetails = await cardExpert.getCardComparison([parsedResult.card_name]);
          const rewards = await cardExpert.calculateDetailedRewards(cardDetails[0].id, currentSpendProfile);
          
          assistantResponse = {
            role: 'assistant',
            content: `Here's a detailed breakdown of the ${parsedResult.card_name}:\n\n` +
              `Annual Fee: ₹${cardDetails[0].annual_fee}\n` +
              `Welcome Benefit: ${cardDetails[0].welcome_benefit}\n\n` +
              `Reward Structure:\n${
                rewards.map(r => 
                  `- ${r.benefit_type}: ${r.reward_rate}% (up to ₹${r.max_reward})\n` +
                  `  Your estimated rewards: ₹${r.reward_amount}`
                ).join('\n')
              }\n\n` +
              `Based on your spending, you could earn approximately ₹${
                rewards.reduce((sum, r) => sum + r.reward_amount, 0)
              } in rewards annually.`
          };
        } else {
          assistantResponse = { role: 'assistant', content: "Which card would you like to know more about?" };
        }
      }

      // Update state and add response
      if (assistantResponse) {
        addMessage(assistantResponse);
      }

    } catch (err) {
      console.error("Error in handleSendMessage:", err);
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      addMessage({ role: 'assistant', content: `Sorry, something went wrong: ${errorMsg}`, isError: true });
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-interface">
      <div className="messages-container">
        {messages.map((message, index) => (
          <Message key={index} message={message} />
        ))}
        {isLoading && <LoadingMessage />}
        {/* Do not show general error at bottom if individual message has isError=true */}
        {error && !messages.some(m => m.isError) && <ErrorMessage message={error} />}
        <div ref={messagesEndRef} />
      </div>
      <MessageInput onSendMessage={handleSendMessage} disabled={isLoading} />
    </div>
  );
};