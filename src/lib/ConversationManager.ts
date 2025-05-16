import { SpendingData } from '../types/spending';
import { OpenAI } from 'openai';
import { questionRepository, getQuestionForKey } from '../config/questionRepository'; // Import the repository
import type { AppSessionData } from './session'; // Import AppSessionData
import brandMappingData from '../config/brandMapping.json'; // Import brand mapping
import { CardGeniusResponse } from '../types/cardgenius'; // Import CardGeniusResponse type
import { brandMapping } from '../config/brandMapping';
import { categoryRelationships } from '../config/categoryRelationships';
import { fetchCardRecommendationsFromAPI } from './cardGeniusAPI'; // Import the new utility
import { SpendProfile } from '@/types/SpendProfile'; // Import SpendProfile for the payload type

// Assuming 'openai' npm package might be used later
// import { OpenAI } from 'openai';

export interface InitialIntentParseResult {
  direct_spends?: Partial<Record<keyof SpendingData['monthly'], number | null>>;
  mentioned_brands?: Array<{ brand_name: string; amount: number | null }>;
  ambiguous_terms?: string[];
  unrelated_query?: boolean;
}

const INITIAL_INTENT_SYSTEM_PROMPT = `You are an expert assistant designed to parse a user's free-form text about their spending habits to help recommend credit cards. Your primary goal is to extract specific pieces of information and structure it as a JSON object.\n\nThe output MUST be a single, valid JSON object conforming to the following TypeScript interface:\n\'\'\'json\n{\n  \"direct_spends\": {\n    // Optional. Keys MUST be one of: \"amazon_spends\", \"flipkart_spends\", \"grocery_spends_online\", \"online_food_ordering\", \"other_online_spends\", \"other_offline_spends\", \"dining_or_going_out\", \"fuel\", \"school_fees\", \"rent\", \"mobile_phone_bills\", \"electricity_bills\", \"water_bills\", \"ott_channels\", \"new_monthly_cat_1\", \"new_monthly_cat_2\", \"new_monthly_cat_3\", \"hotels_annual\", \"flights_annual\", \"insurance_health_annual\", \"insurance_car_or_bike_annual\", \"large_electronics_purchase_like_mobile_tv_etc\", \"all_pharmacy\", \"new_cat_1\", \"new_cat_2\", \"new_cat_3\", \"domestic_lounge_usage_quarterly\", \"international_lounge_usage_quarterly\", \"railway_lounge_usage_quarterly\", \"movie_usage\", \"movie_mov\", \"dining_usage\", \"dining_mov\".\n    // Values should be the extracted numeric amount. If a spend category is mentioned but no amount is specified (e.g., \"I spend on Amazon\"), use null for the value.\n    // Example: \"amazon_spends\": 5000, \"dining_or_going_out\": null\n  },\n  \"mentioned_brands\": [\n    // Optional. An array of objects for specific brand names mentioned by the user, especially if an amount is associated or if they don\'t directly map to a SpendProfile key.\n    // This helps in later mapping these brands to broader categories.\n    // Example: { \"brand_name\": \"Shell\", \"amount\": 3000 }, { \"brand_name\": \"Zara\", \"amount\": null }\n  ],\n  \"ambiguous_terms\": [\n    // Optional. An array of strings for terms or phrases that are too vague for direct mapping and require further clarification.\n    // Examples: \"luxury spends\", \"travel often\", \"save money on groceries\", \"good rewards\"\n  ],\n  \"unrelated_query\": false\n  // Set to true if the user\'s query is completely unrelated to spending, personal finance, or credit card needs. Otherwise, false.\n}\n\'\'\'\n\nKey Processing Instructions:\n1.  **Amounts:** Extract numeric amounts accurately. Convert common abbreviations (e.g., \'k\' for thousands, \'lakh\' for 100,000) to numbers. If no specific amount is given for a mentioned spend or brand (e.g., \"I use my card for fuel\"), the value for that item in \`direct_spends\` or \`mentioned_brands\` should be \`null\`.\n2.  **Direct Spends:** Populate \`direct_spends\` if the user mentions a category that directly corresponds to one of the allowed keys (e.g., \"fuel,\" \"rent,\" \"Amazon spends,\" \"flights\").\n3.  **Brand Mentions:** If the user mentions specific brand names (e.g., \"Shell,\" \"Myntra,\" \"BigBasket,\" \"Swiggy,\" \"Zomato\") that are not direct \`SpendProfile\` keys, list them under \`mentioned_brands\`. Include any associated amount or \`null\` if no amount is specified. This list will be used for later mapping to your API categories using your \`brandMapping.json\`.\n4.  **Ambiguity:** If the user uses vague terms (like \"luxury items,\" \"a lot on travel,\" \"general shopping\") that cannot be immediately mapped to a specific \`SpendProfile\` key or a known brand, capture these exact phrases in the \`ambiguous_terms\` array.\n5.  **Unrelated Queries:** If the input is clearly off-topic (e.g., \"What\'s the weather?\", \"Tell me a joke\"), set \`unrelated_query\` to \`true\`. In this case, other fields in the JSON can be empty or omitted.\n6.  **JSON Output Only:** Your response MUST be ONLY the JSON object. Do not include any conversational text, explanations, or markdown formatting around the JSON.\n\nAnalyze the user\'s input carefully and generate the JSON object based on these instructions.`;

// Define the structure for what the ConversationManager decides should happen next
export interface NextAction {
  type: 'ASK_QUESTION' | 'CLARIFY_AMBIGUOUS_TERM' | 'PROCESS_PENDING_BRAND' | 'CALL_API' | 'END_CONVERSATION' | 'NO_ACTION' | 'ERROR';
  question?: string; // The question to ask the user
  fieldKey?: keyof SpendingData['monthly']; // The SpendProfile field this question relates to
  termToClarify?: string; // The ambiguous term that needs clarification
  // brandToProcess?: { brand_name: string; amount: number | null }; // For later brand mapping step
  messageToUser?: string; // A general message to the user (e.g., for errors or transitions)
  recommendations?: CardGeniusResponse; // Optional recommendations
}

// Predefined order of fields to ask about. We can refine this order later.
const questionAskingOrder: Array<keyof SpendingData['monthly']> = [
  'amazon_spends',
  'flipkart_spends',
  'online_food_ordering',
  'dining_or_going_out',
  'grocery_spends',
  'fuel',
  'other_online_spends',
  'other_offline_spends',
  'mobile_phone_bills',
  'electricity_bills',
  'water_bills',
  'ott_channels',
  'rent',
  'school_fees',
  'flights_annual',
  'hotels_annual',
  'insurance_health_annual',
  'insurance_car_or_bike_annual',
  'large_electronics_purchase_like_mobile_tv_etc',
  'all_pharmacy',
  'domestic_lounge_usage_quarterly',
  'international_lounge_usage_quarterly',
  'railway_lounge_usage_quarterly',
  'movie_usage',
  'movie_mov',
  'dining_usage',
  'dining_mov',
  // Fields like new_monthly_cat_1, selected_card_id are intentionally omitted for direct questioning
];

// Interface for the expected JSON output when parsing a targeted response
interface TargetedParseResult {
  value: number | null;
}

// +++ RESTORING DELETED CONSTANTS AND INTERFACE +++
const CLARIFICATION_QUESTION_GENERATION_PROMPT_TEMPLATE = 
`You are an AI assistant helping a user specify their spending for credit card recommendations.
The user mentioned a term: "[AMBIGUOUS_TERM_PLACEHOLDER]" which is too vague.
Your goal is to generate a concise and clear question to ask the user to clarify this term.
The question should guide them to break it down into more specific spending categories or provide more context.
If possible, relate the clarification to known spending categories like:
- Online Shopping (e.g., Amazon, Flipkart, Myntra)
- Groceries (online or offline)
- Dining Out / Restaurants / Cafes
- Online Food Orders
- Fuel
- Travel (Flights, Hotels)
- Bills (Mobile, Electricity, Rent)
- Entertainment (Movies, OTT)
- Large Purchases (Electronics, Appliances)
- Offline Shopping (Clothes, General Retail)

Avoid very open-ended questions like "What do you mean?". Instead, try to offer implicit or explicit options or ask for examples.

Example:
If AMBIGUOUS_TERM_PLACEHOLDER is "luxury spends", a good question might be:
"You mentioned 'luxury spends'. Could you tell me a bit more about what that typically includes for you? For example, is it mostly high-end dining, travel, expensive fashion, or something else?"

If AMBIGUOUS_TERM_PLACEHOLDER is "general shopping", a good question might be:
"For your 'general shopping', could you give me an idea of the main categories? For instance, is it mostly clothes, electronics, or other types of items, and is it primarily online or in physical stores?"

Output ONLY the generated question as a plain string. Do not include any other text or explanations.`;

const CLARIFICATION_RESPONSE_PARSE_PROMPT_TEMPLATE = 
`You are an AI assistant helping to interpret a user's clarification for their spending.
The user previously used a vague term: "[AMBIGUOUS_TERM_CLARIFIED_PLACEHOLDER]".
They were asked the question: "[CLARIFICATION_QUESTION_ASKED_PLACEHOLDER]"
Their response to this clarification question was: "[USER_ANSWER_TO_CLARIFICATION_PLACEHOLDER]"

Your task is to analyze the user's response and extract any specific spending information.
Output MUST be a single, valid JSON object strictly conforming to the following TypeScript interface:
\'\'\'json
{
  "direct_spends": {
    // Optional. Keys MUST be one of the allowed SpendProfile keys (e.g., amazon_spends, dining_or_going_out, etc.).
    // Values should be the extracted numeric amount. If a spend category is mentioned but no amount is specified, use null.
    // Analyze the user's clarification. If they name specific spend categories (e.g., "groceries", "online shopping", "flights")
    // include these categories as keys here.
    // - If they also provide an amount for a category, use that numeric amount as the value.
    // - If they name a category but DO NOT provide an amount, use null as the value for that category.
    // - If their clarification does not map to any specific spend categories, this object can be empty.
    // Example: User clarifies "shopping" as "mostly clothes online and some groceries".
    // Output might be: { "other_online_spends": null, "grocery_spends_online": null } (assuming "clothes online" maps to other_online_spends and "groceries" maps to "grocery_spends_online")
  },
  "mentioned_brands": [
    // Optional. Array for specific brand names mentioned with amounts (or null if no amount).
  ],
  "new_ambiguous_terms": [
    // Optional. Array for any NEW vague terms in their clarification that might need further clarification later.
    // Do NOT include the original AMBIGUOUS_TERM_CLARIFIED_PLACEHOLDER here.
  ]
}
\'\'\'
Focus on extracting concrete spend amounts and categories or brand names from the user's clarification. If their clarification introduces new vague terms, list them.
If the user's response doesn't provide any parseable financial details, you can return empty objects/arrays for the fields.
Your response MUST be ONLY the JSON object.`;

interface ClarificationParseResult {
  direct_spends?: Partial<Record<keyof SpendingData['monthly'], number | null>>;
  mentioned_brands?: Array<{ brand_name: string; amount: number | null }>;
  new_ambiguous_terms?: string[];
}
// +++ END OF RESTORED DEFINITIONS +++

// Define a type for the items in brandMapping.json for clarity
interface BrandMappingItem {
  brand_name: string;
  category_key: keyof SpendingData['monthly']; // Ensure this matches SpendProfile keys
}

export class ConversationManager {
  private spendProfile: SpendingData;
  private askedFields: Set<keyof SpendingData['monthly']>;
  private ambiguousTerms: string[];
  private pendingBrandSpends: Array<{ brand_name: string; amount: number | null }>;
  private openai: OpenAI;
  private brandToCategoryMap: Map<string, keyof SpendingData['monthly']>; // For efficient lookup

  constructor() {
    // Initialize with empty but properly structured spendProfile
    this.spendProfile = {
      monthly: {},
      quarterly: {},
      annual: {}
    };
    this.askedFields = new Set<keyof SpendingData['monthly']>();
    this.ambiguousTerms = [];
    this.pendingBrandSpends = [];
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is not set.");
    }
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Initialize brandToCategoryMap
    this.brandToCategoryMap = new Map<string, keyof SpendingData['monthly']>();
    (brandMappingData as BrandMappingItem[]).forEach(item => {
      this.brandToCategoryMap.set(item.brand_name.toLowerCase(), item.category_key);
    });
  }

  // Method to load state from session data
  public loadState(sessionData: AppSessionData): void {
    this.spendProfile = sessionData.spendProfile 
      ? JSON.parse(JSON.stringify(sessionData.spendProfile)) 
      : {
          monthly: {},
          quarterly: {},
          annual: {}
        };
    
    this.askedFields = sessionData.askedFields 
      ? new Set(sessionData.askedFields) 
      : new Set<keyof SpendingData['monthly']>();
      
    this.ambiguousTerms = sessionData.ambiguousTerms 
      ? [...sessionData.ambiguousTerms] 
      : [];
      
    this.pendingBrandSpends = sessionData.pendingBrandSpends 
      ? [...sessionData.pendingBrandSpends] 
      : [];
    // Note: isInitialized is handled by the API route logic itself
  }

  // Method to get the current state in a session-serializable format
  public getStateForSession(): AppSessionData {
    return {
      spendProfile: JSON.parse(JSON.stringify(this.spendProfile)), // Deep copy
      askedFields: Array.from(this.askedFields),
      ambiguousTerms: [...this.ambiguousTerms],
      pendingBrandSpends: [...this.pendingBrandSpends],
      isInitialized: true, // When we save state, it means it has been initialized
    };
  }

  public getSpendProfile(): Readonly<SpendingData> {
    return this.spendProfile;
  }

  // Method to update spend profile ensuring type safety
  public updateSpendProfileField(
    field: keyof SpendingData['monthly'],
    value: number | null
  ): void {
    // Initialize the monthly object if it doesn't exist
    if (!this.spendProfile.monthly) {
      this.spendProfile.monthly = {};
    }

    // Update the field value
    this.spendProfile.monthly[field] = value;
    console.log(`Updated ${field} to ${value} in spendProfile`);
  }

  public addAskedField(field: keyof SpendingData['monthly']): void {
    this.askedFields.add(field);
  }

  public hasFieldBeenAsked(field: keyof SpendingData['monthly']): boolean {
    return this.askedFields.has(field);
  }

  public addAmbiguousTerm(term: string): void {
    if (!this.ambiguousTerms.includes(term)) {
      this.ambiguousTerms.push(term);
    }
  }

  public getAmbiguousTerms(): string[] {
    return [...this.ambiguousTerms];
  }

  public clearAmbiguousTerms(): void {
    this.ambiguousTerms = [];
  }

  public getPendingBrandSpends(): Array<{ brand_name: string; amount: number | null }> {
    return [...this.pendingBrandSpends];
  }

  public clearPendingBrandSpends(): void {
    this.pendingBrandSpends = [];
  }

  // Mock function for development and testing without API calls
  private mockOpenAIParseInitialIntent(userInput: string): InitialIntentParseResult {
    console.log(`MOCK OpenAI Call: Parsing initial intent for: "${userInput}"`);
    const lowerInput = userInput.toLowerCase();
    
    if (lowerInput.includes("amazon") && lowerInput.includes("5000")) {
      return {
        direct_spends: { amazon_spends: 5000 },
        mentioned_brands: [],
        ambiguous_terms: [],
        unrelated_query: false
      };
    }
    if (lowerInput.includes("dining") && lowerInput.includes("luxury")) {
      return {
        direct_spends: { dining_or_going_out: null },
        mentioned_brands: [],
        ambiguous_terms: ["luxury dining"],
        unrelated_query: false
      };
    }
    if (lowerInput.includes("flights") && lowerInput.includes("hotels") && lowerInput.includes("20000")) {
      return {
        direct_spends: { flights_annual: 20000, hotels_annual: null },
        mentioned_brands: [],
        ambiguous_terms: [],
        unrelated_query: false
      };
    }
    if (lowerInput.includes("fuel") && lowerInput.includes("shell") && (lowerInput.includes("3k") || lowerInput.includes("3000"))) {
      return {
        direct_spends: { fuel: 3000 },
        mentioned_brands: [{brand_name: "Shell", amount: 3000}],
        ambiguous_terms: [],
        unrelated_query: false
      };
    }
    if (lowerInput.includes("who are you") || lowerInput.includes("what is your name")) {
      return {
        direct_spends: {},
        mentioned_brands: [],
        ambiguous_terms: [],
        unrelated_query: true
      };
    }
    // Default mock response for unhandled cases
    return {
      direct_spends: {},
      mentioned_brands: [],
      ambiguous_terms: [],
      unrelated_query: false
    };
  }

  private async _generateClarificationQuestion(term: string): Promise<string> {
    const prompt = CLARIFICATION_QUESTION_GENERATION_PROMPT_TEMPLATE.replace("[AMBIGUOUS_TERM_PLACEHOLDER]", term);
    try {
      console.log(`Generating clarification question for term: "${term}"`);
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo", // A capable model for instruction following
        messages: [{ role: "system", content: prompt }],
        temperature: 0.5, // Allow some creativity for natural questions
        max_tokens: 100, // Keep question concise
        n: 1,
        stop: ["\n\n"] // Stop if it starts generating multiple paragraphs
      });
      const question = response.choices[0]?.message?.content?.trim();
      if (question) {
        console.log(`Generated clarification question: "${question}"`);
        return question;
      }
      throw new Error("LLM did not return a clarification question.");
    } catch (error) {
      console.error(`Error generating clarification question for "${term}":`, error);
      // Fallback question if LLM fails
      return `You mentioned "${term}". Could you please provide more specific details about that spend? For example, what items or services does it include and roughly how much?`;
    }
  }

  // Method to process pending brands
  private _processPendingBrands(): void {
    for (const brandObject of this.pendingBrandSpends) {
      const categoryKey = this.brandToCategoryMap.get(brandObject.brand_name.toLowerCase());
      if (categoryKey) {
        console.log(`Mapping brand "${brandObject.brand_name}" to category "${categoryKey}" with amount: ${brandObject.amount}`);
        const currentCategoryValue = this.spendProfile.monthly[categoryKey];
        const brandAmount = brandObject.amount;

        if (brandAmount !== null) {
          // If we already have a value, add the new amount
          const newValue = (currentCategoryValue || 0) + brandAmount;
          this.updateSpendProfileField(categoryKey, newValue);
        }
      }
    }
    this.clearPendingBrandSpends();
  }

  private async _getCardRecommendations(currentSpendProfile: SpendingData): Promise<CardGeniusResponse> {
    console.log('Constructing payload for CardGenius API from current spend profile:', currentSpendProfile);
    
    // Create the FLAT payload structure required by fetchCardRecommendationsFromAPI
    const apiPayload: SpendProfile = {
      amazon_spends: currentSpendProfile.monthly?.amazon_spends || 0,
      flipkart_spends: currentSpendProfile.monthly?.flipkart_spends || 0,
      grocery_spends_online: currentSpendProfile.monthly?.grocery_spends_online || 0,
      online_food_ordering: currentSpendProfile.monthly?.online_food_ordering || 0,
      other_online_spends: currentSpendProfile.monthly?.other_online_spends || 0,
      other_offline_spends: currentSpendProfile.monthly?.other_offline_spends || 0,
      dining_or_going_out: currentSpendProfile.monthly?.dining_or_going_out || 0,
      fuel: currentSpendProfile.monthly?.fuel || 0,
      school_fees: currentSpendProfile.monthly?.school_fees || 0,
      rent: currentSpendProfile.monthly?.rent || 0,
      mobile_phone_bills: currentSpendProfile.monthly?.mobile_phone_bills || 0,
      electricity_bills: currentSpendProfile.monthly?.electricity_bills || 0,
      water_bills: currentSpendProfile.monthly?.water_bills || 0,
      ott_channels: currentSpendProfile.monthly?.ott_channels || 0,
      new_monthly_cat_1: currentSpendProfile.monthly?.new_monthly_cat_1 || 0,
      new_monthly_cat_2: currentSpendProfile.monthly?.new_monthly_cat_2 || 0,
      new_monthly_cat_3: currentSpendProfile.monthly?.new_monthly_cat_3 || 0,
      all_pharmacy: currentSpendProfile.monthly?.all_pharmacy || 0,
      new_cat_1: currentSpendProfile.monthly?.new_cat_1 || 0, // Assuming new_cat_1,2,3 are monthly
      new_cat_2: currentSpendProfile.monthly?.new_cat_2 || 0,
      new_cat_3: currentSpendProfile.monthly?.new_cat_3 || 0,
      movie_usage: currentSpendProfile.monthly?.movie_usage || 0,
      movie_mov: currentSpendProfile.monthly?.movie_mov || 0,
      dining_usage: currentSpendProfile.monthly?.dining_usage || 0,
      dining_mov: currentSpendProfile.monthly?.dining_mov || 0,
      
      hotels_annual: currentSpendProfile.annual?.hotels_annual || 0,
      flights_annual: currentSpendProfile.annual?.flights_annual || 0,
      insurance_health_annual: currentSpendProfile.annual?.insurance_health_annual || 0,
      insurance_car_or_bike_annual: currentSpendProfile.annual?.insurance_car_or_bike_annual || 0,
      large_electronics_purchase_like_mobile_tv_etc: currentSpendProfile.annual?.large_electronics_purchase_like_mobile_tv_etc || 0,
      
      domestic_lounge_usage_quarterly: currentSpendProfile.quarterly?.domestic_lounge_usage_quarterly || 0,
      international_lounge_usage_quarterly: currentSpendProfile.quarterly?.international_lounge_usage_quarterly || 0,
      railway_lounge_usage_quarterly: currentSpendProfile.quarterly?.railway_lounge_usage_quarterly || 0,
      
      selected_card_id: null 
    };

    console.log('FLAT apiPayload being sent to fetchCardRecommendationsFromAPI:', apiPayload);
    return fetchCardRecommendationsFromAPI(apiPayload);
  }

  private getRelatedCategories(fieldKey: keyof SpendingData['monthly']): Array<keyof SpendingData['monthly']> {
    const relationship = categoryRelationships[fieldKey];
    if (!relationship) return [];
    
    // Filter out categories that have already been asked
    return relationship.relatedCategories.filter(category => !this.askedFields.has(category));
  }

  private getNextQuestion(): keyof SpendingData['monthly'] | null {
    // Priority 1: Ask about fields that are known (in spendProfile.monthly) because they were identified
    // (e.g. via clarification) but their amounts are still unknown (value is null) and not yet successfully asked.
    const spendProfileMonthlyKeys = Object.keys(this.spendProfile.monthly) as Array<keyof SpendingData['monthly']>;
    for (const key of spendProfileMonthlyKeys) {
      if (this.spendProfile.monthly[key] === null && !this.askedFields.has(key)) {
        console.log(`[CM - getNextQuestion] Prioritizing question for '${key}' as its value is null and has not been successfully asked.`);
        return key;
      }
    }

    // Priority 2: Fall back to the general questionAskingOrder for categories that haven't been asked yet
    // (either not mentioned at all, or mentioned but an error occurred before they could be added to askedFields).
    for (const fieldKeyFromOrder of questionAskingOrder) {
      if (!this.askedFields.has(fieldKeyFromOrder)) {
        // If this fieldKeyFromOrder also happens to be in spendProfile.monthly with a null value,
        // the first loop would have already returned it. So this primarily picks up
        // questions for categories not yet in spendProfile.monthly or those that are there with 'undefined'.
        console.log(`[CM - getNextQuestion] Selecting '${fieldKeyFromOrder}' from questionAskingOrder as it's not in askedFields.`);
        return fieldKeyFromOrder;
      }
    }

    console.log(`[CM - getNextQuestion] No suitable next question found. All known null-value fields have been addressed or are in askedFields.`);
    return null;
  }

  public async determineNextAction(): Promise<NextAction> {
    console.log("[CM - determineNextAction] Entered determineNextAction.");
    try {
      console.log("[CM - determineNextAction] Calling _processPendingBrands.");
      this._processPendingBrands();
      console.log("[CM - determineNextAction] Finished _processPendingBrands.");
    } catch (e: any) {
      console.error("[CM - determineNextAction] Error in _processPendingBrands:", e);
      return { type: 'ERROR', messageToUser: "Error processing brand information." };
    }

    // **** NEW: Prioritize clarifying ambiguous terms ****
    if (this.ambiguousTerms.length > 0) {
      const termToClarify = this.ambiguousTerms[0]; // Get the first one
      try {
        console.log(`[CM - determineNextAction] Found ambiguous term: "${termToClarify}". Generating clarification question.`);
        const clarificationQuestion = await this._generateClarificationQuestion(termToClarify);
        // Note: _generateClarificationQuestion itself has a fallback if OpenAI fails.
        console.log(`[CM - determineNextAction] Clarification question for "${termToClarify}": "${clarificationQuestion}"`);
        return {
          type: 'CLARIFY_AMBIGUOUS_TERM',
          termToClarify: termToClarify,
          question: clarificationQuestion,
          messageToUser: clarificationQuestion
        };
      } catch (e: any) {
        console.error(`[CM - determineNextAction] Error generating clarification question for "${termToClarify}":`, e);
        // Fallback if _generateClarificationQuestion fails unexpectedly despite its internal fallback
        this.ambiguousTerms.shift(); // Remove the problematic term to avoid loops
        return { 
          type: 'ERROR', 
          messageToUser: `I had trouble formulating a question about "${termToClarify}". Let's try something else.` 
        };
      }
    }
    // **** END NEW SECTION ****

    // Check if we have enough data for recommendations
    let enoughData = false;
    try {
      console.log("[CM - determineNextAction] Calling hasEnoughDataForRecommendations.");
      enoughData = this.hasEnoughDataForRecommendations();
      console.log(`[CM - determineNextAction] hasEnoughDataForRecommendations returned: ${enoughData}`);
    } catch (e: any) {
      console.error("[CM - determineNextAction] Error in hasEnoughDataForRecommendations:", e);
      return { type: 'ERROR', messageToUser: "Error checking data completion." };
    }

    if (enoughData) {
      try {
        console.log("[CM - determineNextAction] Calling _getCardRecommendations as enoughData is true.");
        const recommendations = await this._getCardRecommendations(this.spendProfile);
        console.log("[CM - determineNextAction] _getCardRecommendations returned. Preparing CALL_API action.");
        return {
          type: 'CALL_API',
          messageToUser: 'Based on your spending patterns, here are your card recommendations:',
          recommendations
        };
      } catch (e: any) {
        console.error("[CM - determineNextAction] Error in _getCardRecommendations flow:", e);
        return { type: 'ERROR', messageToUser: "Error fetching card recommendations." };
      }
    }

    // Get the next question based on relationships
    let nextField: keyof SpendingData['monthly'] | null = null;
    try {
      console.log("[CM - determineNextAction] Calling getNextQuestion.");
      nextField = this.getNextQuestion();
      console.log(`[CM - determineNextAction] getNextQuestion returned: ${nextField}`);
    } catch (e: any) {
      console.error("[CM - determineNextAction] Error in getNextQuestion:", e);
      return { type: 'ERROR', messageToUser: "Error determining next question." };
    }

    if (!nextField) {
      // This case implies not enough data for recommendations, but no more standard questions to ask.
      // Could be due to all primary questions asked, or an issue in getNextQuestion logic.
      console.log("[CM - determineNextAction] No nextField returned, but not enough data for recommendations. Ending conversation.");
      return {
        type: 'END_CONVERSATION',
        messageToUser: 'I have all the information I need. Let me get your card recommendations.'
      };
    }

    // Get the question for the next field
    const question = getQuestionForKey(nextField);
    if (!question) {
      return {
        type: 'ERROR',
        messageToUser: 'I encountered an error while processing your request. Please try again.'
      };
    }

    return {
      type: 'ASK_QUESTION',
      fieldKey: nextField,
      question,
      messageToUser: question
    };
  }

  public async parseInitialIntent(userInput: string): Promise<NextAction> {
    if (!userInput || typeof userInput !== 'string' || !userInput.trim()) {
      return {
        type: 'ERROR',
        messageToUser: 'Please provide a valid input message.'
      };
    }

    try {
      console.log("Attempting to parse initial intent for:", userInput, "with OpenAI API.");
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          { role: "system", content: INITIAL_INTENT_SYSTEM_PROMPT },
          { role: "user", content: userInput.trim() }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error("No content in OpenAI response");
      }

      const parsedResult = JSON.parse(responseContent) as InitialIntentParseResult;
      console.log("Parsed OpenAI response:", parsedResult);

      if (parsedResult.unrelated_query) {
        console.log("User query seems unrelated.");
        return {type: 'END_CONVERSATION', messageToUser: "I can only help with credit card recommendations. Is there anything else related to that?"};
      }

      // Clear any lingering ambiguous terms from previous turns before processing new ones
      this.clearAmbiguousTerms();
      // Also clear pending brands, as new intent might not relate to them
      this.clearPendingBrandSpends(); 

      // Process direct spends
      if (parsedResult.direct_spends) {
        for (const [field, value] of Object.entries(parsedResult.direct_spends)) {
          const key = field as keyof SpendingData['monthly'];
          if (value !== null) {
            this.updateSpendProfileField(key, value);
            this.addAskedField(key);
          }
        }
      }

      if (parsedResult.mentioned_brands && parsedResult.mentioned_brands.length > 0) {
        this.pendingBrandSpends = [...this.pendingBrandSpends, ...parsedResult.mentioned_brands];
      }

      if (parsedResult.ambiguous_terms && parsedResult.ambiguous_terms.length > 0) {
        parsedResult.ambiguous_terms.forEach(term => this.addAmbiguousTerm(term));
      }
      
      // After processing initial intent, determine the next concrete action/question
      return this.determineNextAction();

    } catch (error) {
      console.error("Error in parseInitialIntent with OpenAI API:", error);
      return {type: 'ERROR', messageToUser: "Sorry, I had trouble understanding your request with the AI. Could you try rephrasing?"};
    }
  }

  public async processUserResponse(
    fieldKey: keyof SpendingData['monthly'],
    userAnswer: string
  ): Promise<NextAction> {
    const questionAsked = getQuestionForKey(fieldKey) || `Regarding your spend on ${fieldKey}`; // Fallback if question not in repo

    const systemPromptForTargetedParse = 
`You are an AI assistant helping to extract a specific piece of information. 
The user was previously asked: "${questionAsked}"
Their answer was: "${userAnswer}"

Your task is to extract the numeric value for the spend category '${fieldKey}' from the user's answer. 
- If a clear numeric amount is provided, return that number.
- If the user indicates they don't know, don't spend, or want to skip, return null.
- If the answer is ambiguous or doesn't seem to contain a relevant amount for '${fieldKey}', return null.

Output MUST be a single, valid JSON object strictly conforming to the following format: 
{
  "value": <number_or_null>
}

Do not include any other text or explanations outside this JSON object.`;

    try {
      console.log(`Processing user answer for ${fieldKey}: "${userAnswer}"`);
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo-1106",
        messages: [
          { role: "system", content: systemPromptForTargetedParse },
          // No explicit user message here as the user's answer is embedded in the system prompt for context
        ],
        response_format: { type: "json_object" },
        temperature: 0.1, // Very low temperature for focused extraction
      });

      const resultJsonString = response.choices[0]?.message?.content;
      if (!resultJsonString) {
        console.error(`OpenAI response was empty for ${fieldKey} processing.`);
        this.addAskedField(fieldKey); // Mark as asked to avoid re-asking immediately
        return { type: 'ERROR', messageToUser: `I had a slight hiccup processing that. Let's try the next question.` };
      }

      console.log(`Raw OpenAI JSON for ${fieldKey}:`, resultJsonString);
      let parsedResult: TargetedParseResult;
      try {
        parsedResult = JSON.parse(resultJsonString);
      } catch (jsonError) {
        console.error(`Error parsing JSON from OpenAI for ${fieldKey}:`, jsonError, resultJsonString);
        this.addAskedField(fieldKey); // Mark as asked
        return { type: 'ERROR', messageToUser: `I got a slightly garbled response from the AI. Let's move to the next item.` };
      }
      console.log(`Parsed OpenAI response for ${fieldKey}:`, parsedResult);

      if (parsedResult && typeof parsedResult.value !== 'undefined') {
        this.updateSpendProfileField(fieldKey, parsedResult.value);
      } else {
        // If value is missing in response, treat as null or unparseable, don't update but mark asked
        console.warn(`Value for ${fieldKey} was not clearly extracted by AI. Will be treated as not provided.`);
        this.updateSpendProfileField(fieldKey, null); // Explicitly set to null if AI couldn't parse
      }
      
      this.addAskedField(fieldKey); // Mark this field as having been asked and processed
      console.log(`[CM - processUserResponse] Successfully processed and marked ${fieldKey} as asked.`);

      console.log(`[CM - processUserResponse] About to call determineNextAction after processing ${fieldKey}.`);
      return this.determineNextAction(); // Determine what to do next

    } catch (error) {
      console.error(`[CM - processUserResponse] Error in processUserResponse for ${fieldKey} BEFORE attempting to determine next action:`, error);
      this.addAskedField(fieldKey); // Mark as asked to avoid loop if error persists
      // SIMPLIFIED ERROR HANDLING: Return a generic error directly without calling determineNextAction again from catch.
      return {
        type: 'ERROR',
        messageToUser: `I encountered an internal error after processing your answer for ${fieldKey}. Please try a different approach or restart.`
      };
    }
  }

  public async processClarificationResponse(
    termClarified: string, 
    clarificationQuestionAsked: string, // Need the actual question that was asked
    userAnswer: string
  ): Promise<NextAction> {
    console.log(`Processing user answer: "${userAnswer}" for clarified term: "${termClarified}" (question was: "${clarificationQuestionAsked}")`);
    
    const prompt = CLARIFICATION_RESPONSE_PARSE_PROMPT_TEMPLATE
      .replace("[AMBIGUOUS_TERM_CLARIFIED_PLACEHOLDER]", termClarified)
      .replace("[CLARIFICATION_QUESTION_ASKED_PLACEHOLDER]", clarificationQuestionAsked)
      .replace("[USER_ANSWER_TO_CLARIFICATION_PLACEHOLDER]", userAnswer);

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo-1106", // JSON mode support
        messages: [{ role: "system", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.2,
      });

      const resultJsonString = response.choices[0]?.message?.content;
      if (!resultJsonString) {
        console.error(`OpenAI response empty during clarification processing for term: ${termClarified}`);
        throw new Error("OpenAI response was empty.");
      }
      console.log(`Raw OpenAI JSON for clarification of ${termClarified}:`, resultJsonString);
      const parsedResult: ClarificationParseResult = JSON.parse(resultJsonString);
      console.log(`Parsed OpenAI response for clarification of ${termClarified}:`, parsedResult);

      // Process direct_spends from clarification
      if (parsedResult.direct_spends) {
        for (const [rawField, rawValue] of Object.entries(parsedResult.direct_spends)) {
          const field = rawField as keyof SpendingData['monthly'];
          const value = rawValue as number | null | undefined;

          if (value !== undefined) {
            this.updateSpendProfileField(field, value);
            if (value !== null) {
              this.addAskedField(field);
            }
          }
        }
      }

      // Process mentioned_brands from clarification
      if (parsedResult.mentioned_brands && parsedResult.mentioned_brands.length > 0) {
        this.pendingBrandSpends = [...this.pendingBrandSpends, ...parsedResult.mentioned_brands];
      }

      // Remove the clarified term from ambiguousTerms list
      this.ambiguousTerms = this.ambiguousTerms.filter(t => t !== termClarified);

      // Add any NEW ambiguous terms found in the clarification response
      if (parsedResult.new_ambiguous_terms && parsedResult.new_ambiguous_terms.length > 0) {
        parsedResult.new_ambiguous_terms.forEach(newTerm => this.addAmbiguousTerm(newTerm));
      }

      return this.determineNextAction();

    } catch (error) {
      console.error(`Error processing clarification response for term "${termClarified}":`, error);
      // Fallback: remove the term anyway to avoid loop, and ask next logical question or error out gracefully
      this.ambiguousTerms = this.ambiguousTerms.filter(t => t !== termClarified);
      // Try to proceed, but signal an error occurred during clarification
      const nextAction = await this.determineNextAction(); // await because determineNextAction is async
      if (nextAction.type !== 'ERROR') {
         nextAction.messageToUser = `I had a little trouble fully understanding your clarification for "${termClarified}", but let's continue. ${nextAction.messageToUser || nextAction.question || ''}`.trim();
      }
      return nextAction;
    }
  }

  private hasEnoughDataForRecommendations(): boolean {
    // Check if we have at least one spending category filled with a positive amount
    const hasAtLeastOnePositiveSpend = Object.values(this.spendProfile.monthly).some(
      value => typeof value === 'number' && value > 0
    );

    // Check if there are any spend categories that were identified (value is null) but not yet asked
    // This checks if there's any category that was identified (e.g., via clarification, so it's a key in spendProfile.monthly with value null)
    // but for which we haven't successfully obtained an amount yet (so it's NOT in askedFields).
    const hasIdentifiedButUnaskedSpends = Object.entries(this.spendProfile.monthly).some(
      ([key, value]) => value === null && !this.askedFields.has(key as keyof SpendingData['monthly'])
    );

    const noPendingBrands = this.pendingBrandSpends.length === 0;
    const noAmbiguousTerms = this.ambiguousTerms.length === 0;

    console.log(`[CM - hasEnoughDataForRecommendations] Conditions: hasAtLeastOnePositiveSpend=${hasAtLeastOnePositiveSpend}, hasIdentifiedButUnaskedSpends=${hasIdentifiedButUnaskedSpends}, noPendingBrands=${noPendingBrands}, noAmbiguousTerms=${noAmbiguousTerms}`);

    if (hasIdentifiedButUnaskedSpends) {
      console.log("[CM - hasEnoughDataForRecommendations] Returning false: Found categories identified (value is null) but their amounts haven't been asked/provided yet.");
      return false; 
    }

    // If all identified categories have amounts (or were skipped), and no ambiguities/pending brands,
    // then we need at least one actual spend amount to proceed to recommendations.
    return hasAtLeastOnePositiveSpend && noPendingBrands && noAmbiguousTerms;
  }

  public getAskedFields(): Array<keyof SpendingData['monthly']> {
    return Array.from(this.askedFields);
  }

  // We will add more methods here for:
  // - Processing user responses to specific questions (Step 5 part 2)
  // - Handling clarifications (Step 6)
  // - Brand Mapping Logic
  // - Triggering API calls (Step 8)
} 