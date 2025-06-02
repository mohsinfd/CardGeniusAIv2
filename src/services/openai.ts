import OpenAI from 'openai';
import { ChatMessage, SpendProfile } from '../types';
import { SPEND_SCHEMA_CATEGORIES } from '../CategoryGraph';
import { CardRecommendation as ApiCardRecommendation, CardFacts } from './cardApiService';

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
let openai: OpenAI | null = null;

if (apiKey) {
  openai = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true
  });
} else {
  console.error('OpenAI API key is not configured. Please check your .env file.');
}

export async function initializeDB() {
  // Initialize any necessary database connections or state
  console.log('OpenAI service initialized with database');
}

export type Intent = "BEST_CARD" | "CARD_EXPLAIN" | "RESTART" | "UNKNOWN" | "CONTINUE_CONVERSATION";

export interface ParsedIntentAndSpends {
  intent: Intent;
  spend: Partial<SpendProfile>;
  ambiguous?: string[];
  card_name?: string;
  purpose?: string | null;
  skip?: boolean;
  category_context?: { term: string, category: string };
  signalsEndOfSpendInput?: boolean;
}

const spendCategoriesListString = SPEND_SCHEMA_CATEGORIES.join(', ');

const PARSE_INTENT_AND_SPENDS_SYSTEM_PROMPT = `You are an expert at parsing user messages for a credit card recommendation chatbot.
Your goal is to extract user intent and any mentioned spending amounts.

Possible intents are: "BEST_CARD", "CARD_EXPLAIN", "RESTART", "CONTINUE_CONVERSATION".

Spending categories to look for (these are the only valid keys for the 'spend' object):
${spendCategoriesListString}

- Extract numeric values for any mentioned spending categories. If a spend is mentioned with a timeframe (e.g., "per year", "annually"), try to normalize it to a monthly amount if it's a category typically considered monthly (like rent, fuel, dining). For clearly annual spends like "insurance_health_annual", keep them as annual.
- If the user's message is primarily a number or amount (e.g., "5000", "2k") and no other category is mentioned or implied by prior conversation context, attempt to map it to "amazon_spends". If unsure, add the raw numeric string to the "ambiguous" array.
- If the user explicitly mentions a specific store or service (e.g., "Myntra", "Zomato", "Netflix") that maps to one of the spend categories above, and they DO NOT provide an amount for it:
    - Set the value of that mapped category in the 'spend' object to 0.
    - Populate a 'category_context' object with 'term' (the user's specific word, e.g., "Myntra") and 'category' (the mapped schema category, e.g., "other_online_spends").
    - Example: User says "I shop on Myntra." -> JSON should include "spend": {"other_online_spends": 0}, "category_context": {"term": "Myntra", "category": "other_online_spends"}
- If the user says "skip" or similar for the current question, set "skip": true and intent to "CONTINUE_CONVERSATION".
- If the user's response to a direct question about a category is a phrase indicating no spending or zero (e.g., "none", "0", "I don't have that expense"), interpret this as a spend of 0 for that category. The intent should be "CONTINUE_CONVERSATION".
- If the user wants to restart, set intent to "RESTART".
- If the user is asking to explain a card, set intent to "CARD_EXPLAIN" and populate "card_name".
- If the user is asking for the best card or providing spending info (with amounts), the intent is "BEST_CARD".
- If the user provides information that seems to be a direct answer to a question or continues the conversation without a clear new intent, use "CONTINUE_CONVERSATION".
- If you identify a spending category but are unsure which specific key it maps to from the list, include the user's term in the "ambiguous" array. Do NOT use category_context if the mapping is ambiguous.
- Capture any general "purpose" for the card if mentioned (e.g., "for travel", "for shopping rewards").

Respond ONLY with a valid JSON object adhering to the following structure:
{
  "intent": "BEST_CARD" | "CARD_EXPLAIN" | "RESTART" | "CONTINUE_CONVERSATION" | "UNKNOWN",
  "spend": { /* e.g., "amazon_spends": 10000, "fuel": 3000, "other_online_spends": 0 (if mentioned without amount) */ },
  "ambiguous": ["user_mentioned_category_1"], // Optional
  "card_name": "Card Name", // Optional, for CARD_EXPLAIN
  "purpose": "user_stated_purpose", // Optional
  "skip": boolean, // Optional
  "category_context": { "term": "user_term", "category": "mapped_schema_category" }, // Optional, only if a specific term was mapped to a category and given a 0 value in spend.
  "signalsEndOfSpendInput": boolean // Optional, true if user indicates no more spend categories to report
}

Examples:
User: "I need the best card for my spends. I spend 5k on amazon, 2k on fuel, and about 1000 on dining."
JSON: {"intent": "BEST_CARD", "spend": {"amazon_spends": 5000, "fuel": 2000, "dining_or_going_out": 1000}}

User: "Tell me about the HDFC Millennia card."
JSON: {"intent": "CARD_EXPLAIN", "card_name": "HDFC Millennia", "spend": {}}

User: "I use Myntra for clothes."
JSON: {"intent": "BEST_CARD", "spend": {"other_online_spends": 0}, "category_context": {"term": "Myntra", "category": "other_online_spends"}, "purpose": "clothes shopping"}

User: "Start over."
JSON: {"intent": "RESTART", "spend": {}}

User: "skip this one"
JSON: {"intent": "CONTINUE_CONVERSATION", "skip": true, "spend": {}}

User: "I use it for groceries mostly"
JSON: {"intent": "CONTINUE_CONVERSATION", "purpose": "groceries", "spend": {}}

User: "My zomato bill is 1500"
JSON: {"intent": "CONTINUE_CONVERSATION", "spend": {"online_food_ordering": 1500}}

User: "I spend 20000 on travel and holidays."
JSON: {"intent": "BEST_CARD", "spend": {}, "ambiguous": ["travel and holidays"], "purpose": "travel and holidays"} // Ambiguous because "travel and holidays" is not a direct schema key.

User: "that's all for my spends"
JSON: {"intent": "CONTINUE_CONVERSATION", "spend": {}, "signalsEndOfSpendInput": true}

User: "I don't have any other expenses."
JSON: {"intent": "CONTINUE_CONVERSATION", "spend": {}, "signalsEndOfSpendInput": true}

User: "Card for amazon and dining"
JSON: {"intent": "BEST_CARD", "spend": {"amazon_spends": 0, "dining_or_going_out": 0}, "purpose": "amazon and dining"}
`

export async function parseIntentAndSpends(userInput: string, currentSpendContext?: Partial<SpendProfile> | { [key: string]: 0 }): Promise<ParsedIntentAndSpends> {
  if (!openai) {
    console.error('OpenAI service not initialized.');
    // Fallback or throw error
    return {
      intent: "UNKNOWN",
      spend: {},
      ambiguous: [userInput] // Treat whole input as ambiguous if AI fails
    };
  }

  let userMessageContent = userInput;
  const contextKeys = Object.keys(currentSpendContext || {});

  // Check if currentSpendContext is specifically for a follow-up question
  // In ChatInterface.tsx, this is indicated by an object like { "category_being_asked": 0 }
  if (contextKeys.length === 1 && currentSpendContext && (currentSpendContext as { [key: string]: 0 })[contextKeys[0]] === 0) {
    const categoryBeingAskedAbout = contextKeys[0];
    userMessageContent = 
`The user was previously asked to provide their spending for the category \"${categoryBeingAskedAbout}\". \
Their current response is: \"${userInput}\". \
Please interpret this response primarily in the context of the question about \"${categoryBeingAskedAbout}\". \
- If the response clearly indicates a spend amount (e.g., "5000", "2k"), associate it with \"${categoryBeingAskedAbout}\" in the 'spend' object and set intent to \"CONTINUE_CONVERSATION\". \
- If the response clearly indicates zero spending for this category (e.g., "none", "zero", "0", "I don't spend on that"), set \"spend\": {\"${categoryBeingAskedAbout}\": 0} and intent to \"CONTINUE_CONVERSATION\". \
- If the user is trying to change the topic, ask something else, or skip, adjust the intent and other fields (like 'skip') accordingly.`;
  }
  // No special prefix for general context (when currentSpendProfile is passed),
  // as the system prompt is designed to handle general spend info.

  try {
    const completion = await openai.chat.completions.create({
      model: import.meta.env.VITE_OPENAI_MODEL || "gpt-3.5-turbo", // Use configured or fallback
      messages: [
        { role: "system", content: PARSE_INTENT_AND_SPENDS_SYSTEM_PROMPT },
        { role: "user", content: userMessageContent }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2, // Lower temperature for more deterministic parsing
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      try {
        const parsed = JSON.parse(content) as ParsedIntentAndSpends;
        // Basic validation of the parsed structure
        if (!parsed.intent || typeof parsed.spend !== 'object') {
          console.error("LLM response missing critical fields (intent, spend):", parsed);
          return { intent: "UNKNOWN", spend: {}, ambiguous: ["LLM response format error"] };
        }
        // Ensure spend keys are valid
        const validSpends: Partial<SpendProfile> = {};
        for (const key of Object.keys(parsed.spend)) {
          if (SPEND_SCHEMA_CATEGORIES.includes(key)) {
            // @ts-ignore - This might still be needed if parsed.spend[key] type isn't number
            // Let's check if parsed.spend can have non-numeric values based on schema
            const value = parsed.spend[key as keyof SpendProfile];
            if (typeof value === 'number') {
              validSpends[key as keyof SpendProfile] = value;
            } else {
              // Optionally handle or log cases where spend value is not a number
              console.warn(`Value for spend category '${key}' is not a number:`, value);
            }
          }
        }
        parsed.spend = validSpends;
        return parsed;
      } catch (e) {
        console.error("Error parsing LLM JSON response:", e, "\nResponse was:", content);
        return { intent: "UNKNOWN", spend: {}, ambiguous: ["Invalid JSON from LLM"] };
      }
    }
    throw new Error("No content in LLM response");

  } catch (error) {
    console.error('Error calling OpenAI for intent and spend parsing:', error);
    return {
      intent: "UNKNOWN",
      spend: {},
      ambiguous: ["OpenAI API call failed"] 
    };
  }
}

// Stub for flows/ask-question.flow.json (3.3)
export async function generateFollowUpQuestion(
  categoryToAsk: string, 
  mentionedTerm?: string
): Promise<ChatMessage> {
  if (!openai) return { role: 'assistant', content: "I'm having trouble connecting right now. Please try again later." };
  
  const { getQuestionForCategory } = await import('../CategoryGraph');
  let question = getQuestionForCategory(categoryToAsk);

  // If a specific term was mentioned by the user for this category, make the question more specific
  if (mentionedTerm && categoryToAsk === 'other_online_spends') { // Example for other_online_spends
    question = `Okay, you mentioned ${mentionedTerm}. About how much do you spend there monthly? You can also include other similar online shopping.`;
  } else if (mentionedTerm && categoryToAsk === 'online_food_ordering') { // Example for online_food_ordering
    question = `Got it. For ${mentionedTerm}, what's your approximate monthly spend? Feel free to include other food delivery services too.`;
  }
  // Add more else-if blocks here for other general categories that can benefit from context 
  // (e.g., other_offline_spends, etc.)

  return {
    role: "assistant",
    content: question 
  };
}


// Stub for flows/calc-savings.flow.json (3.4 - Verbalizer)
export const verbalizeRecommendations = async (
  recommendations: ApiCardRecommendation[],
  followUpQuestionContent?: string
): Promise<ChatMessage> => {
  try {
    const recommendationsText = recommendations.map(rec => {
      const breakdownText = Object.entries(rec.category_wise_breakdown)
        .map(([category, { spend, reward }]) => 
          `${category}: ₹${spend} spend → ₹${reward} reward`
        )
        .join('\n');

      return `
Card: ${rec.card_name}
Type: ${rec.card_type}
Annual Fee: ₹${rec.annual_fee}
Joining Fee: ₹${rec.joining_fee}
Total Savings: ₹${rec.total_savings}
Breakdown:
${breakdownText}
`;
    }).join('\n');

    const prompt = `Based on the following credit card recommendations, provide a friendly, conversational summary that highlights the best options and their key benefits. Include specific savings amounts and any notable perks.

${recommendationsText}

${followUpQuestionContent ? `\nAfter your summary, ask: ${followUpQuestionContent}` : ''}`;

    const response = await fetch('http://localhost:3001/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: prompt }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return { role: 'assistant', content: data.response };
  } catch (error) {
    console.error('Error verbalizing recommendations:', error);
    return { 
      role: 'assistant', 
      content: 'I apologize, but I encountered an error while processing the recommendations. Please try again.',
      isError: true 
    };
  }
};

// Stub for flows/card-explain.flow.json (3.5)
export const explainCardPerks = async (cardFacts: CardFacts): Promise<ChatMessage> => {
  try {
    const prompt = `Explain the key benefits of the ${cardFacts.card_name} credit card in a friendly, conversational way. Include:
    - Annual fee: ${cardFacts.annual_fee}
    - Joining fee: ${cardFacts.joining_fee}
    - Welcome benefit: ${cardFacts.welcome_benefit}
    - Milestone benefit: ${cardFacts.milestone_benefit}
    - Travel benefit: ${cardFacts.travel_benefit}
    
    Keep it concise and highlight the most valuable perks.`;

    const response = await fetch('http://localhost:3001/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: prompt }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return { role: 'assistant', content: data.response };
  } catch (error) {
    console.error('Error explaining card perks:', error);
    return { 
      role: 'assistant', 
      content: `I'm having trouble getting the details for ${cardFacts.card_name}. Please try again later.`,
      isError: true 
    };
  }
};

// The old sendMessage can be deprecated or heavily simplified.
// For now, let's keep it to ensure no immediate breakage if other parts still call it,
// but its logic will be mostly replaced by the ChatInterface orchestrating calls to the new functions.
export const sendMessage = async (content: string): Promise<ChatMessage> => {
  console.warn("DEPRECATED: `sendMessage` is being phased out. Orchestration should move to ChatInterface calling specific parsing/generation functions.");
  if (!openai) {
    return {
      role: 'assistant',
      content: 'OpenAI API key is not configured. Please check your .env file.'
    };
  }
  // Fallback to a general response if this is somehow still called directly for conversation
  try {
    const completion = await openai.chat.completions.create({
      model: import.meta.env.VITE_OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [{ role: 'user', content }],
      temperature: Number(import.meta.env.VITE_OPENAI_TEMPERATURE) || 0.7,
    });
    return {
      role: 'assistant',
      content: completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.'
    };
  } catch (error) {
    console.error('Error in deprecated sendMessage:', error);
    throw error;
  }
};

export const analyzeUserInput = async (input: string): Promise<any> => {
  if (!openai) {
    throw new Error('OpenAI service not initialized');
  }
  // Basic implementation - can be expanded based on needs
  return parseIntentAndSpends(input);
}; 