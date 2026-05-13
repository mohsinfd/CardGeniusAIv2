import { NextRequest, NextResponse } from 'next/server'
// Keep OpenAI import if getRecommendations or other parts still use a separate instance,
// but ConversationManager has its own.
// import OpenAI from 'openai'
// import { SpendingData, SpendingCategory } from '@/types/spending'
import { CardGeniusResponse } from '@/types/response'
// import { ChatResponse } from '@/types/chat' // This will likely be replaced by our NextAction structure

// +++ New Imports for Conversation Manager and Session +++
// import { withIronSessionApiRoute } from "iron-session/next"
import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { getSessionOptions, AppSessionData } from '@/lib/session' // Adjusted path assuming lib is at src/lib
import { ConversationManager, NextAction } from '@/lib/ConversationManager' // Adjusted path
import { SpendingData } from '@/types/spending' // For initializing if needed

// --- Old DialogueState and SPENDING_CATEGORIES ---
// These will likely be replaced by ConversationManager's internal state and logic.
// interface DialogueState { /* ... */ }
// const SPENDING_CATEGORIES: Record<string, { period: 'monthly' | 'annual' | 'quarterly' }> = { /* ... */ }

// Initialize OpenAI client - This instance might become redundant if all AI calls go via ConversationManager
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// })

// --- Old initialSpendingData ---
// ConversationManager handles its own default state.
// const initialSpendingData: SpendingData = { /* ... */ }

// --- Old HELPER: updateSpendingData ---
// This logic is now inside ConversationManager.updateSpendProfileField
// function updateSpendingData(spendingData: SpendingData, fieldName: string, amount: number) { /* ... */ }

// Function to get card recommendations - This function can be kept and used by ConversationManager in Step 8
async function getRecommendations(spendingData: SpendingData): Promise<any[]> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)
    
    // The ensureCompleteSpendingData might need to be adapted or its logic moved
    // For now, ConversationManager should provide a complete SpendProfile
    // const completeSpendingData = ensureCompleteSpendingData(spendingData) // See ensureCompleteSpendingData below
    
    const cardResponse = await fetch(process.env.CARD_RECOMMENDATION_API_URL || 'https://api.example.com/cardgenius/recommendations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Ensure the body matches the API's expectation; ConversationManager's spendProfile should be correct.
      body: JSON.stringify(spendingData), // spendingData from CM should be complete
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)

    if (cardResponse.ok) {
      const cardData = await cardResponse.json() // Assuming CardGeniusResponse is still the correct type
      // Adapt this to how recommendations should be returned to the frontend
      // For now, just logging success. The actual data structure might need adjustment.
      if (cardData && cardData.recommendations && cardData.recommendations.length > 0) {
        return cardData.recommendations
      } else if (cardData && cardData.savings && cardData.savings.length > 0) { // Fallback for old structure?
         return cardData.savings
      }
      console.error('No recommendations array found in CardGenius response or it was empty.')
      return []
    }
    
    const errorText = await cardResponse.text()
    console.error('CardGenius API error:', cardResponse.status, errorText)
    return []
  } catch (error) {
    console.error('Error calling CardGenius API:', error)
    return []
  }
}

// --- Old fieldToCategoryMap and categoryMapping ---
// This logic will be handled by ConversationManager's interaction with brandMapping.json (later step)
// and its direct questioning logic.
// const fieldToCategoryMap: Record<string, string> = { /* ... */ }
// const categoryMapping: Record<string, { correlated: string[], variables: string[][] }> = { /* ... */ }

// --- Old getNextQuestion ---
// Replaced by ConversationManager.determineNextAction()
// function getNextQuestion(currentCategory: string, askedFields: string[]): string | null { /* ... */ }

// --- Old hasEnoughDataForRecommendations ---
// Replaced by logic within ConversationManager.determineNextAction() to return CALL_API type
// function hasEnoughDataForRecommendations(askedFields: string[], currentCategory: string): boolean { /* ... */ }

// --- Old ensureCompleteSpendingData ---
// The SpendProfile from ConversationManager should ideally be complete or have defaults.
// This function might still be useful if the API requires every field, even if 0.
// The defaultSpendProfile from SpendProfile.ts already provides all fields with 0s.
// For now, we assume ConversationManager.getSpendProfile() is what we send.
/*
function ensureCompleteSpendingData(partialData: Partial<SpendProfile>): SpendProfile {
  const completeData = { ...defaultSpendProfile } // Start with all defaults
  for (const key in partialData) {
    if (partialData.hasOwnProperty(key)) {
      const fieldKey = key as keyof SpendProfile
      if (completeData.hasOwnProperty(fieldKey) && partialData[fieldKey] !== undefined) {
        // @ts-ignore
        completeData[fieldKey] = partialData[fieldKey]
      }
    }
  }
  return completeData
}
*/

// +++ New POST handler with IronSession and ConversationManager +++
export async function POST(request: NextRequest) {
  try {
    const session = await getIronSession<AppSessionData>(cookies(), getSessionOptions());
    let conversationManager: ConversationManager;

    // Initialize or load ConversationManager
    if (!session.isInitialized) {
      conversationManager = new ConversationManager();
      session.isInitialized = true;
    } else {
      conversationManager = new ConversationManager();
      conversationManager.loadState(session);
    }

    const body = await request.json();
    // Destructure termBeingClarified from the body
    const { userInput, isInitialMessage, fieldKeyLastAsked, termBeingClarified, clarificationQuestionAsked } = body;

    if (!userInput || typeof userInput !== 'string') {
      return NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 }
      );
    }

    let nextAction;

    if (isInitialMessage) {
      nextAction = await conversationManager.parseInitialIntent(userInput);
    } else if (termBeingClarified && typeof termBeingClarified === 'string') {
      // If a term is being clarified, use processClarificationResponse
      // Assuming clarificationQuestionAsked might also be sent from frontend, or CM handles it
      // For now, we pass undefined if not sent, CM needs to be robust or frontend must send it.
      // The prompt template in CM for clarification parsing DOES use clarificationQuestionAsked.
      // This will require frontend to store and send it.
      // For now, let's assume it was stored in session by CM or is not strictly fatal if missing for a basic test.
      // TODO: Ensure frontend sends clarificationQuestionAsked or CM handles its absence.
      nextAction = await conversationManager.processClarificationResponse(
        termBeingClarified,
        clarificationQuestionAsked || "", // Pass empty string if undefined, CM needs to handle
        userInput
      );
    } else if (fieldKeyLastAsked) {
      const monthlyType = conversationManager.getSpendProfile().monthly;
      nextAction = await conversationManager.processUserResponse(
        fieldKeyLastAsked as keyof typeof monthlyType,
        userInput
      );
    } else {
      nextAction = await conversationManager.parseInitialIntent(userInput);
    }

    // Save the updated state
    session.spendProfile = conversationManager.getSpendProfile();
    session.askedFields = conversationManager.getAskedFields();
    session.ambiguousTerms = conversationManager.getAmbiguousTerms();
    session.pendingBrandSpends = conversationManager.getPendingBrandSpends();
    await session.save();

    // Return the appropriate response based on the action type
    switch (nextAction.type) {
      case 'ASK_QUESTION':
        return NextResponse.json({
          type: 'question',
          question: nextAction.question,
          fieldKey: nextAction.fieldKey,
          message: nextAction.messageToUser
        });

      case 'CLARIFY_AMBIGUOUS_TERM':
        return NextResponse.json({
          type: 'clarification',
          term: nextAction.termToClarify,
          question: nextAction.question,
          message: nextAction.messageToUser
        });

      case 'CALL_API':
        return NextResponse.json({
          type: 'final',
          recommendations: nextAction.recommendations,
          message: nextAction.messageToUser
        });

      case 'END_CONVERSATION':
        return NextResponse.json({
          type: 'info',
          message: nextAction.messageToUser
        });

      case 'ERROR':
        return NextResponse.json({
          type: 'error',
          message: nextAction.messageToUser || 'An error occurred'
        }, { status: 500 });

      default:
        return NextResponse.json({
          type: 'error',
          message: 'Unexpected action type'
        }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// --- Old POST handler - Commenting out the entire original POST function ---
/*
export async function POST(req: Request) {
  // ... entire old POST function content ...
}
*/ 
