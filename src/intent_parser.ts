import { IntentDataSchema } from './intent_schema';
import { CategoryGraph } from './CategoryGraph';
import { analyzeUserInput } from './services/openai';

interface ConversationState {
  spendingInfo: Record<string, number>;
  lastQuestion: string;
  categoriesAsked: Set<string>;
  categoryGraph: CategoryGraph;
  ambiguous: string[];
  purpose: string | null;
}

const INITIAL_STATE: ConversationState = {
  spendingInfo: {},
  lastQuestion: "Hello! I can help you find the best credit card based on your spending habits. Let's start with your Amazon spending - how much do you spend on Amazon monthly?",
  categoriesAsked: new Set(['amazon_spends']),
  categoryGraph: new CategoryGraph(),
  ambiguous: ['amazon_spends'],
  purpose: null
};

const CATEGORY_QUESTIONS = {
  // Fuel & Travel
  fuel: "How much do you spend on fuel (petrol/diesel) monthly?",
  insurance_car_or_bike_annual: "What's your annual car/bike insurance premium?",
  flights_annual: "How much do you spend on flights annually?",
  hotels_annual: "How much do you spend on hotels annually?",
  domestic_lounge_usage_quarterly: "How often do you use domestic airport lounges? (times per quarter)",
  international_lounge_usage_quarterly: "How often do you use international airport lounges? (times per quarter)",
  railway_lounge_usage_quarterly: "How often do you use railway lounges? (times per quarter)",

  // Shopping
  shopping_online: "How much do you spend on online shopping monthly?",
  amazon_spends: "How much do you spend on Amazon monthly?",
  flipkart_spends: "How much do you spend on Flipkart monthly?",
  other_online_spends: "How much do you spend on other online platforms monthly?",
  shopping_offline: "How much do you spend on offline shopping monthly?",
  other_offline_spends: "How much do you spend on other offline stores monthly?",
  large_electronics_purchase_like_mobile_tv_etc: "How much do you spend on large electronics (mobile, TV, etc.) annually?",

  // Dining & Food
  dining_or_restaurants: "How much do you spend on dining out monthly?",
  online_food_ordering: "How much do you spend on food delivery monthly?",
  grocery_spends: "How much do you spend on groceries monthly?",
  dining_usage: "How often do you dine out? (times per month)",

  // Entertainment
  movie_usage: "How often do you watch movies in theaters? (times per month)",
  movie_mov: "How much do you spend on movie tickets monthly?",
  ott_channels: "How much do you spend on OTT subscriptions monthly?",

  // Insurance & Health
  insurance_health_annual: "What's your annual health insurance premium?",
  all_pharmacy: "How much do you spend on pharmacy/medicines monthly?",

  // Rent & Utilities
  rent: "How much is your monthly rent?",
  mobile_phone_bills: "How much do you spend on mobile phone bills monthly?",
  electricity_bills: "How much do you spend on electricity monthly?",
  water_bills: "How much do you spend on water bills monthly?",

  // Education
  school_fees: "How much do you spend on school fees annually?"
};

export async function parseIntent(input: string, state: ConversationState = INITIAL_STATE): Promise<{ intent: any; newState: ConversationState }> {
  // Use OpenAI to analyze the input
  const analysis = await analyzeUserInput(input);

  // Handle restart
  if (analysis.restart) {
    return {
      intent: IntentDataSchema.parse({ intent: 'RESTART' }),
      newState: INITIAL_STATE
    };
  }

  // Handle card explanation
  if (analysis.card_name) {
    return {
      intent: IntentDataSchema.parse({
        intent: 'CARD_EXPLAIN',
        card_name: analysis.card_name
      }),
      newState: state
    };
  }

  // Update purpose if detected
  if (analysis.purpose) {
    state.purpose = analysis.purpose;
  }

  // Handle skip
  if (analysis.skip) {
    state.categoryGraph.markSkipped();
    if (state.categoryGraph.shouldPromptForResults()) {
      return {
        intent: IntentDataSchema.parse({
          intent: 'SHOW_RECS',
          purpose: state.purpose,
          spending: state.categoryGraph.getSpendingInfo(),
          asked_categories: state.categoryGraph.getAskedCategories()
        }),
        newState: {
          ...state,
          lastQuestion: "Would you like to see recommendations based on the information provided so far?"
        }
      };
    }
  }

  // Handle amount
  if (analysis.amount !== null) {
    const currentCategory = state.ambiguous[0];
    
    if (currentCategory) {
      state.categoryGraph.markAsked(currentCategory, analysis.amount);
      state.ambiguous = state.ambiguous.slice(1);
    }

    // Find next category to ask about
    const nextCategory = state.categoryGraph.getNextCategory(state.ambiguous);
    
    if (nextCategory) {
      return {
        intent: IntentDataSchema.parse({
          intent: 'SHOW_RECS',
          purpose: state.purpose,
          spending: state.categoryGraph.getSpendingInfo(),
          ambiguous: state.ambiguous,
          asked_categories: state.categoryGraph.getAskedCategories()
        }),
        newState: {
          ...state,
          lastQuestion: CATEGORY_QUESTIONS[nextCategory as keyof typeof CATEGORY_QUESTIONS],
          categoriesAsked: new Set([...state.categoriesAsked, nextCategory]),
          ambiguous: [...state.ambiguous, nextCategory]
        }
      };
    } else {
      // We have all the information we need
      return {
        intent: IntentDataSchema.parse({
          intent: 'SHOW_RECS',
          purpose: state.purpose,
          spending: state.categoryGraph.getSpendingInfo(),
          asked_categories: state.categoryGraph.getAskedCategories()
        }),
        newState: state
      };
    }
  }

  // If no amount found, ask for clarification
  return {
    intent: IntentDataSchema.parse({
      intent: 'SHOW_RECS',
      purpose: state.purpose,
      spending: state.categoryGraph.getSpendingInfo(),
      asked_categories: state.categoryGraph.getAskedCategories()
    }),
    newState: {
      ...state,
      lastQuestion: `I need a number for your ${state.lastQuestion.toLowerCase()}`
    }
  };
} 