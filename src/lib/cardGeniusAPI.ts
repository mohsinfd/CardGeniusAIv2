import { SpendProfile } from '@/types/SpendProfile';
import { CardGeniusResponse, CardRecommendation } from '@/types/cardgenius';

const CARDGENIUS_API_URL =
  process.env.CARD_RECOMMENDATION_API_URL ||
  'https://api.example.com/cardgenius/recommendations';

// Define a type for the actual raw response from the external API - CORRECTED
interface ActualExternalApiResponse {
  success: boolean; // The API seems to return its own success flag
  message: string;  // And its own message
  savings: CardRecommendation[]; // This is where the card recommendations are
}

// Fallback response in case of errors, ensuring it matches CardGeniusResponse structure
// This structure is what OUR application uses internally.
const internalFallbackErrorResponse: CardGeniusResponse = {
  success: false,
  message: "Unable to get card recommendations at this time. Please try again later.",
  savings: []
};

export async function fetchCardRecommendationsFromAPI(
  spendingData: SpendProfile
): Promise<CardGeniusResponse> {
  const requestBody = JSON.stringify(spendingData);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'CardGenius-AI-App/1.0'
  };

  if (process.env.CARDGENIUS_API_KEY) {
    headers['X-API-Key'] = process.env.CARDGENIUS_API_KEY;
  }

  try {
    const response = await fetch(CARDGENIUS_API_URL, {
      method: 'POST',
      headers,
      body: requestBody,
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`External CardGenius API HTTP error (${response.status}):`, errorText);
      return {
        success: false,
        message: `External API HTTP Error: ${response.status} - ${errorText || response.statusText}`,
        savings: [] 
      };
    }

    const apiData = await response.json() as ActualExternalApiResponse;

    // Now, check the structure of the *actual* API response based on our new understanding
    if (typeof apiData.success !== 'boolean' || !Array.isArray(apiData.savings)) {
      console.error(
        "External CardGenius API success response has unexpected structure.", 
        {
          expectedFields: { success: 'boolean', savings: 'array' },
          receivedTypes: { success: typeof apiData.success, savings: typeof apiData.savings },
          isSavingsArray: Array.isArray(apiData.savings),
          rawDataString: JSON.stringify(apiData)
        }
      );
      return {
        success: false,
        message: "Received unexpected response structure from external card API.",
        savings: []
      };
    }

    // If the external API itself indicates failure via its own success flag
    if (!apiData.success) {
      console.warn("External CardGenius API reported success:false in its response body:", apiData.message);
      return {
        success: false, // Our internal success flag
        message: apiData.message || "Card recommendations provider indicated an issue.",
        savings: apiData.savings || [] // Return savings if provided, even on API-side failure
      };
    }
    
    // If we reach here, the external API responded with HTTP OK, 
    // its body structure is as expected ({success: true, message: ..., savings: [...]}),
    // and its own success flag is true.
    // We can now confidently use its data to form our internal CardGeniusResponse.
    return {
      success: true, // Our internal success flag
      message: apiData.message, // Use message from the API
      savings: apiData.savings  // This is the array of CardRecommendation
    };

  } catch (error: any) { 
    console.error('Error during fetch or JSON parsing for CardGenius API:', error);
    return {
      ...internalFallbackErrorResponse, // Use our predefined internal fallback
      message: error.message || "A network or parsing error occurred while fetching card recommendations."
    };
  }
} 
