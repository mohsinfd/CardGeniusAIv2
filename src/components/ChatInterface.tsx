import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, SpendProfile } from '../types';
import { 
  // sendMessage, // Deprecated
  parseIntentAndSpends,
  generateFollowUpQuestion,
  verbalizeRecommendations,
  explainCardPerks,
  ParsedIntentAndSpends,
  Intent
} from '../services/openai';
import { Message } from './Message';
import { MessageInput } from './MessageInput';
import { LoadingMessage } from './LoadingMessage';
import { ErrorMessage } from './ErrorMessage';
import { AsyncDuckDB } from '@duckdb/duckdb-wasm';
import { calcTopN } from '../calc_savings'; // Re-import calcTopN
import { CategoryGraph, SPEND_SCHEMA_CATEGORIES, CATEGORY_GRAPH } from '../CategoryGraph';

interface ChatInterfaceProps {
  db: AsyncDuckDB | null;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ db }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [currentSpendProfile, setCurrentSpendProfile] = useState<Partial<SpendProfile>>({});
  const [categoryGraphInstance, setCategoryGraphInstance] = useState<CategoryGraph | null>(null);
  const [currentQuestionCategory, setCurrentQuestionCategory] = useState<string | null>(null);
  const [currentFocusPurpose, setCurrentFocusPurpose] = useState<string | null>(null);

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
    if (!content.trim() || !db || !categoryGraphInstance) return;

    const userMessage: ChatMessage = { role: 'user', content };
    addMessage(userMessage);
    setIsLoading(true);
    setError(null);

    try {
      let parsedResult: ParsedIntentAndSpends;
      const lowerContent = content.toLowerCase().trim();

      // Direct handling for "0" or "none" responses to a specific question
      if (currentQuestionCategory && 
          (lowerContent === "0" || lowerContent === "none" || lowerContent === "zero" || 
           lowerContent.includes("i don't spend") || lowerContent.includes("no spend") ||
           lowerContent.includes("i don't have spending") || lowerContent.includes("don't have spending") ||
           lowerContent.includes("no spending"))) {
        console.log(`[ChatInterface] Directly handling zero spend for ${currentQuestionCategory} based on user input: "${content}"`);
        parsedResult = {
          intent: "CONTINUE_CONVERSATION",
          spend: { [currentQuestionCategory]: 0 },
        };
        // Mark this category and related categories as asked with zero value
        categoryGraphInstance.markAsked(currentQuestionCategory, 0);
        // Mark related categories as zero if they're part of the same group
        const relatedCategories = CATEGORY_GRAPH[currentQuestionCategory] || [];
        relatedCategories.forEach((cat: string) => {
          if (!categoryGraphInstance.isCategoryAsked(cat)) {
            categoryGraphInstance.markAsked(cat, 0);
          }
        });
        console.log("[ChatInterface] Direct handling parsedResult:", JSON.stringify(parsedResult));
      } else if (lowerContent.includes("no other spends") || 
                lowerContent.includes("no other spending") || 
                lowerContent.includes("no other categories") ||
                lowerContent.includes("that's all") ||
                lowerContent.includes("that's it") ||
                lowerContent.includes("that's everything") ||
                lowerContent.includes("those are all my spends") ||
                lowerContent.includes("those are all my expenses") ||
                lowerContent.includes("no spends in any other category") ||
                lowerContent.includes("no other spends man")) {
        // User has indicated they've provided all their spending information
        console.log("[ChatInterface] User has indicated they've provided all spending information");
        parsedResult = {
          intent: "BEST_CARD",
          spend: {},
          purpose: "final_recommendations"
        };
      } else {
        parsedResult = await parseIntentAndSpends(content, currentQuestionCategory ? { [currentQuestionCategory]: 0 } : currentSpendProfile );
      }
      console.log("[ChatInterface] Full parsedResult from openai.ts:", JSON.stringify(parsedResult, null, 2));

      // Determine and manage focus purpose for the current turn's logic
      let focusPurposeForLogicThisTurn = currentFocusPurpose; // Initialize with the persisted focus purpose

      if (parsedResult.purpose) {
        // If LLM provides a purpose, use it
        if (!currentFocusPurpose || parsedResult.purpose.toLowerCase() !== currentFocusPurpose.toLowerCase()) {
          setCurrentFocusPurpose(parsedResult.purpose);
          focusPurposeForLogicThisTurn = parsedResult.purpose;
          console.log(`[ChatInterface] Focus purpose from LLM: '${parsedResult.purpose}'. Set for this turn and future state.`);
        }
      } else if (!currentFocusPurpose && Object.keys(currentSpendProfile).length === 0) {
        // NO purpose from LLM, AND NO global focus is set yet, AND it's the very first spend interaction.
        // Attempt to INFER purpose.
        let mentionedCategoryForInference: string | null = null;
        let inferenceSource: string | null = null;

        // Check for Myntra/Nykaa mentions in the user's message
        if (lowerContent.includes('myntra') || lowerContent.includes('nykaa')) {
          setCurrentFocusPurpose('shopping with myntra');
          focusPurposeForLogicThisTurn = 'shopping with myntra';
          console.log(`[ChatInterface] Set focus purpose to 'shopping with myntra' based on direct mention`);
        } else if (parsedResult.category_context?.category) {
          mentionedCategoryForInference = parsedResult.category_context.category;
          inferenceSource = "category_context";
        } else if (Object.keys(parsedResult.spend).length === 1) {
          mentionedCategoryForInference = Object.keys(parsedResult.spend)[0];
          inferenceSource = "single_spend_key";
        }

        if (mentionedCategoryForInference) {
          let inferredPurpose: string | null = null;
          if (["amazon_spends", "flipkart_spends", "other_online_spends"].includes(mentionedCategoryForInference)) {
              inferredPurpose = "shopping";
          } else if (["flights_annual", "hotels_annual", "fuel"].includes(mentionedCategoryForInference)) {
              inferredPurpose = "travel";
          } else if (["dining_or_going_out", "online_food_ordering", "grocery_spends"].includes(mentionedCategoryForInference)) {
              inferredPurpose = "food";
          }
          // Add more purpose mappings here if needed. Ensure the inferred strings (e.g., "shopping")
          // match exactly with what the "Sufficient for Purpose" (SFP) check expects.

          if (inferredPurpose) {
              setCurrentFocusPurpose(inferredPurpose);
              focusPurposeForLogicThisTurn = inferredPurpose;
              console.log(`[ChatInterface] Inferred focus purpose '${inferredPurpose}' from initial category '${mentionedCategoryForInference}' (source: ${inferenceSource}). Set for this turn and future state.`);
          }
        }
      }
      // At this point, focusPurposeForLogicThisTurn is either the LLM's purpose, an inferred one (on first turn), or the ongoing currentFocusPurpose, or null if none of these conditions were met.

      let assistantResponse: ChatMessage | null = null;
      let nextCategoryToAskDetermined: string | null = null;
      
      // Step 1: Determine next category to ask (before updating currentSpendProfile with current parsedResult.spend)
      if (categoryGraphInstance) { // Ensure instance exists
        console.log(`[ChatInterface] categoryGraphInstance.isCategoryAsked('amazon_spends') before check: ${categoryGraphInstance.isCategoryAsked('amazon_spends')}`);
      }

      // First check if we need to ask about other online shopping
      const mentionedMyntra = (Array.isArray(parsedResult.category_context) ? 
                                parsedResult.category_context.some(cc => cc.term?.toLowerCase().includes('myntra')) 
                                : parsedResult.category_context?.term?.toLowerCase().includes('myntra')) || 
                              content.toLowerCase().includes('myntra');
      const mentionedNykaa = (Array.isArray(parsedResult.category_context) ? 
                              parsedResult.category_context.some(cc => cc.term?.toLowerCase().includes('nykaa')) 
                              : parsedResult.category_context?.term?.toLowerCase().includes('nykaa')) || 
                            content.toLowerCase().includes('nykaa');
      const mentionedOtherOnlineTerm = Array.isArray(parsedResult.category_context) ? 
                                      parsedResult.category_context.some(cc => cc.term?.toLowerCase().includes('other online')) 
                                      : parsedResult.category_context?.term?.toLowerCase().includes('other online');

      const mentionedOnlineShopping = mentionedMyntra || mentionedNykaa || mentionedOtherOnlineTerm;
      
      const categoryMentionedWithoutValue = Object.keys(parsedResult.spend).find(
        cat => parsedResult.spend[cat as keyof SpendProfile] === 0 && 
               SPEND_SCHEMA_CATEGORIES.includes(cat) && 
               !categoryGraphInstance.isCategoryAsked(cat)
      );

      console.log(`[ChatInterface] categoryMentionedWithoutValue determined as: ${categoryMentionedWithoutValue}`);

      if (categoryMentionedWithoutValue) {
        nextCategoryToAskDetermined = categoryMentionedWithoutValue;
        console.log(`[ChatInterface] LOG A: nextCategoryToAskDetermined set by categoryMentionedWithoutValue: ${nextCategoryToAskDetermined}`);
      } else if (parsedResult.intent === 'BEST_CARD' || parsedResult.intent === 'CONTINUE_CONVERSATION') {
        const categoryProcessedThisTurn = currentQuestionCategory; 
        console.log(`[ChatInterface] Before getNextPrimaryCategoryToAsk: currentSpendProfile: ${JSON.stringify(currentSpendProfile)}, focusPurposeForLogicThisTurn: ${focusPurposeForLogicThisTurn}, categoryProcessedThisTurn: ${categoryProcessedThisTurn}`);
        
        // ADDING DIAGNOSTIC LOG HERE
        if (categoryGraphInstance) { // Ensure instance exists
            console.log(`[ChatInterface] DIAGNOSTIC: mentionedOnlineShopping: ${mentionedOnlineShopping}, isCategoryAsked('other_online_spends'): ${categoryGraphInstance.isCategoryAsked('other_online_spends')}`);
        }

        // If we just processed Amazon and Myntra was mentioned (focus purpose), and other_online_spends hasn't been properly answered,
        // ask about other_online_spends next.
        const combinedSpendsAfterCurrentParse = { ...currentSpendProfile, ...parsedResult.spend }; // Spends *after* the current user input is processed

        if (categoryProcessedThisTurn === 'amazon_spends' && 
            focusPurposeForLogicThisTurn === 'shopping with myntra' && 
            !categoryGraphInstance.isCategoryAsked('other_online_spends', combinedSpendsAfterCurrentParse['other_online_spends'])) {
            nextCategoryToAskDetermined = 'other_online_spends';
            console.log(`[ChatInterface] Myntra flow: 'amazon_spends' processed, focus is 'shopping with myntra', 'other_online_spends' not properly asked. Next: other_online_spends`);
        } else {
            // Fallback to original logic if the specific Myntra flow condition isn't met
            if (categoryProcessedThisTurn === 'amazon_spends' && mentionedOnlineShopping && !categoryGraphInstance.isCategoryAsked('other_online_spends', combinedSpendsAfterCurrentParse['other_online_spends'])) {
                nextCategoryToAskDetermined = 'other_online_spends';
                console.log(`[ChatInterface] Original Myntra check: Setting nextCategoryToAskDetermined to other_online_spends due to Myntra/other online mention`);
            } else if (mentionedOnlineShopping && !categoryGraphInstance.isCategoryAsked('other_online_spends', combinedSpendsAfterCurrentParse['other_online_spends'])) {
                nextCategoryToAskDetermined = 'other_online_spends';
                console.log(`[ChatInterface] Original Myntra check (no amazon pre-req): Setting nextCategoryToAskDetermined to other_online_spends due to Myntra mention`);
            } else {
                nextCategoryToAskDetermined = categoryGraphInstance.getNextPrimaryCategoryToAsk(currentSpendProfile, focusPurposeForLogicThisTurn || undefined, categoryProcessedThisTurn);
            }
        }
        console.log(`[ChatInterface] getNextPrimaryCategoryToAsk initially returned: ${nextCategoryToAskDetermined}`);

        // New "Sufficient for Purpose" Check to potentially override and stop sooner
        if (nextCategoryToAskDetermined && focusPurposeForLogicThisTurn && (parsedResult.intent === 'BEST_CARD' || parsedResult.intent === 'CONTINUE_CONVERSATION')) {
            const spendsFromThisTurn = parsedResult.spend;
            const spendProfileIncludingCurrentTurn = { ...currentSpendProfile, ...spendsFromThisTurn };
            let relevantAnsweredCount = 0;
            let coreCategoriesForPurpose: string[] = [];
            const lowerFocusPurpose = focusPurposeForLogicThisTurn.toLowerCase();

            if (lowerFocusPurpose.includes("shop") || lowerFocusPurpose.includes("online") || lowerFocusPurpose.includes("amazon") || lowerFocusPurpose.includes("flipkart")) {
                coreCategoriesForPurpose = ["amazon_spends", "flipkart_spends", "other_online_spends"];
            } else if (lowerFocusPurpose.includes("travel") || lowerFocusPurpose.includes("trip") || lowerFocusPurpose.includes("holiday")) {
                coreCategoriesForPurpose = ["flights_annual", "hotels_annual", "fuel"];
            } else if (lowerFocusPurpose.includes("food") || lowerFocusPurpose.includes("dining") || lowerFocusPurpose.includes("restaurant")) {
                coreCategoriesForPurpose = ["dining_or_going_out", "online_food_ordering", "grocery_spends"];
            }

            if (coreCategoriesForPurpose.length > 0) {
                relevantAnsweredCount = coreCategoriesForPurpose.filter(cat => 
                    spendProfileIncludingCurrentTurn[cat as keyof SpendProfile] !== undefined &&
                    (typeof spendProfileIncludingCurrentTurn[cat as keyof SpendProfile] === 'number' && (spendProfileIncludingCurrentTurn[cat as keyof SpendProfile] as number) > 0)
                ).length;
                
                // For shopping, we should ask about all mentioned shopping categories
                let threshold = 1; // Default to 1 core question for any purpose
                if (lowerFocusPurpose.includes("shop") || lowerFocusPurpose.includes("online")) {
                    // Count how many shopping categories were mentioned
                    const mentionedShoppingCategories = coreCategoriesForPurpose.filter(cat => 
                        parsedResult.category_context?.category === cat || 
                        Object.keys(parsedResult.spend).includes(cat) ||
                        (cat === 'other_online_spends' && mentionedOnlineShopping)
                    ).length;
                    
                    // Set threshold to at least 2 for shopping, or the number of mentioned categories
                    threshold = Math.max(2, mentionedShoppingCategories);
                } else if (lowerFocusPurpose.includes("travel") || lowerFocusPurpose.includes("trip") || lowerFocusPurpose.includes("holiday")) {
                    threshold = 2; // For travel, 2 seems okay
                } else if (lowerFocusPurpose.includes("food") || lowerFocusPurpose.includes("dining") || lowerFocusPurpose.includes("restaurant")) {
                    threshold = 2; // For food, 2 seems okay
                }

                // Ensure threshold is not greater than the number of core categories
                threshold = Math.min(threshold, coreCategoriesForPurpose.length);
                if (threshold === 0 && coreCategoriesForPurpose.length > 0) threshold = 1; // Must ask at least one if core categories exist

                if (relevantAnsweredCount >= threshold) {
                    console.log(`[ChatInterface] Sufficient info for purpose '${focusPurposeForLogicThisTurn}' (answered ${relevantAnsweredCount}/${coreCategoriesForPurpose.length} core, threshold ${threshold}). Forcing stop of questions.`);
                    nextCategoryToAskDetermined = null; 
                }
            }
        }
        console.log(`[ChatInterface] Final nextCategoryToAskDetermined after purpose check: ${nextCategoryToAskDetermined}`);
      }
      
      // Step 2: Prepare the spends for this turn and for potential recommendations
      const spendsFromThisTurn = parsedResult.spend;
      const combinedSpendsForRecommendations = { ...currentSpendProfile, ...spendsFromThisTurn };

      console.log(`[ChatInterface] LOG C: nextCategoryToAskDetermined BEFORE response construction: ${nextCategoryToAskDetermined}, intent: ${parsedResult.intent}`);

      // Step 3: Construct Assistant Response based on intent and next question
      if (parsedResult.intent === 'RESTART') {
        setMessages([
           { role: 'assistant', content: "Okay, let's start over. Tell me about your monthly spending." }
         ]);
         setCurrentSpendProfile({});
         setCategoryGraphInstance(new CategoryGraph()); 
         setCurrentQuestionCategory(null);
         setCurrentFocusPurpose(null);
         // assistantResponse remains null, no further message after reset confirmation.
     } else if (parsedResult.intent === 'CARD_EXPLAIN') {
         if (parsedResult.card_name) {
           assistantResponse = await explainCardPerks(parsedResult.card_name);
         } else {
           assistantResponse = { role: 'assistant', content: "Which card would you like to know more about?" };
         }
         // No next question for CARD_EXPLAIN typically, clear currentQuestionCategory
         nextCategoryToAskDetermined = null; 
         console.log(`[ChatInterface] LOG E: nextCategoryToAskDetermined set to null due to CARD_EXPLAIN`);
     } else if (parsedResult.intent === 'BEST_CARD' || parsedResult.intent === 'CONTINUE_CONVERSATION') {
        console.log(`[ChatInterface] LOG D: Entering BEST_CARD/CONTINUE_CONVERSATION. nextCategoryToAskDetermined = ${nextCategoryToAskDetermined}`);
        
        // If user has indicated they've provided all spending information, skip to final recommendations
        if (parsedResult.purpose === "final_recommendations") {
          console.log("[ChatInterface] User indicated all spending provided, proceeding to final recommendations");
          nextCategoryToAskDetermined = null;
        } else if (nextCategoryToAskDetermined) {
          // Skip asking about categories that were explicitly marked as zero spend
          if (categoryGraphInstance.isCategoryAsked(nextCategoryToAskDetermined, 0)) {
            console.log(`[ChatInterface] Skipping ${nextCategoryToAskDetermined} as it was explicitly marked as zero spend`);
            nextCategoryToAskDetermined = categoryGraphInstance.getNextPrimaryCategoryToAsk(
              combinedSpendsForRecommendations,
              focusPurposeForLogicThisTurn || undefined,
              nextCategoryToAskDetermined
            );
          }
          
          if (nextCategoryToAskDetermined) {
            let mentionedTermForFollowUp: string | undefined = undefined;
            if (parsedResult.category_context && parsedResult.category_context.category === nextCategoryToAskDetermined) {
              mentionedTermForFollowUp = parsedResult.category_context.term;
            }
            const followUpQuestionMessage = await generateFollowUpQuestion(nextCategoryToAskDetermined, combinedSpendsForRecommendations, mentionedTermForFollowUp);
            
            let recommendationsMessage: ChatMessage | null = null;
            // Only show recommendations if there are non-zero spends
            const hasNonZeroSpends = Object.entries(combinedSpendsForRecommendations).some(([_, value]) => typeof value === 'number' && value > 0);
            if (hasNonZeroSpends) { 
              console.log("[ChatInterface] Attempting recommendations. Spends:", JSON.stringify(combinedSpendsForRecommendations, null, 2));
              const earlyRecommendations = await calcTopN(db, combinedSpendsForRecommendations, 3);
              console.log("[ChatInterface] Recommendations from calcTopN:", JSON.stringify(earlyRecommendations, null, 2));
              if (earlyRecommendations.length > 0) {
                const verbalizedEarlyRecs = await verbalizeRecommendations(earlyRecommendations, followUpQuestionMessage.content); 
                recommendationsMessage = verbalizedEarlyRecs;
              }
            }
            assistantResponse = recommendationsMessage || followUpQuestionMessage;
          } else {
            // No more questions to ask, proceed to final recommendations
            console.log("[ChatInterface] No more questions to ask, proceeding to final recommendations");
            if (Object.keys(combinedSpendsForRecommendations).length > 0) {
              const recommendations = await calcTopN(db, combinedSpendsForRecommendations, 3);
              assistantResponse = await verbalizeRecommendations(recommendations);
            } else {
              assistantResponse = { role: 'assistant', content: "I couldn't determine specific recommendations with the information provided. Could you tell me a bit about your spending habits?" };
            }
          }
        } else {
          // No more specific questions to ask, try final recommendations
          console.log("[ChatInterface] All primary questions considered or SFP met. Final spends for calcTopN:", JSON.stringify(combinedSpendsForRecommendations, null, 2));
          if (Object.keys(combinedSpendsForRecommendations).length > 0) {
            const recommendations = await calcTopN(db, combinedSpendsForRecommendations, 3);
            console.log("[ChatInterface] Final recommendations from calcTopN:", JSON.stringify(recommendations, null, 2));
            
            // Updated call to verbalizeRecommendations (no follow-up question directly here, might be added later)
            let finalBotMessage = await verbalizeRecommendations(recommendations);

            // Only add generic follow-up if we haven't asked about all related categories
            const answeredCategories = Object.keys(combinedSpendsForRecommendations).filter(
                (cat: string) => combinedSpendsForRecommendations[cat as keyof SpendProfile] !== undefined
            );
            
            // Get next category from the graph to see if there are more related categories to ask about
            const nextCategory = categoryGraphInstance.getNextPrimaryCategoryToAsk(
              combinedSpendsForRecommendations,
              focusPurposeForLogicThisTurn || undefined,
              null
            );

            if (nextCategory && !categoryGraphInstance.isCategoryAsked(nextCategory, 0)) {
              const followUpQuestion = await generateFollowUpQuestion(nextCategory, combinedSpendsForRecommendations);
              finalBotMessage.content += `\n\n${followUpQuestion.content}`;
              nextCategoryToAskDetermined = nextCategory;
            }
            
            assistantResponse = finalBotMessage;
          } else {
            console.log("[ChatInterface] No spends for final recommendations.");
            assistantResponse = { role: 'assistant', content: "I couldn't determine specific recommendations with the information provided. Could you tell me a bit about your spending habits?" };
          }
        }
      } else if (parsedResult.intent === 'UNKNOWN' && !assistantResponse) { // Default/Unknown
        assistantResponse = { role: 'assistant', content: "I'm not sure how to help with that. You can tell me your spending, ask about a card, or say 'restart'." };
      }

      // Step 4: Commit state updates for spends and graph *after* response is decided
      setCurrentSpendProfile(combinedSpendsForRecommendations);
      Object.entries(spendsFromThisTurn).forEach(([category, value]) => {
        if (typeof value === 'number') {
          categoryGraphInstance.markAsked(category, value);
        }
      });
      setCurrentQuestionCategory(nextCategoryToAskDetermined);

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
      <MessageInput onSendMessage={handleSendMessage} disabled={isLoading || !db} />
    </div>
  );
}; 