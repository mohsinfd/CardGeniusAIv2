import { SpendProfile } from '@/types/SpendProfile';
import { CardGeniusResponse, CardRecommendation } from '@/types/cardgenius';

const CARDGENIUS_API_URL = 'https://bk-prod-external.bankkaro.com/cg/api/pro';

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
  console.log("Calling ACTUAL CardGenius API. URL:", CARDGENIUS_API_URL);
  console.log("Request HEADERS:", {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'CardGenius-AI-App/1.0'
  });
  console.log("Request BODY:", requestBody);

  try {
    const response = await fetch(CARDGENIUS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'CardGenius-AI-App/1.0'
      },
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
    console.log("Received SUCCESS HTTP response from ACTUAL CardGenius API (raw parsed JSON):", JSON.stringify(apiData));
    console.log("Keys in parsed apiData from external API:", Object.keys(apiData));

    // ===== START NEW DETAILED LOGGING =====
    if (apiData && typeof apiData === 'object') {
      console.log("Detailed check - typeof apiData.success:", typeof apiData.success);
      console.log("Detailed check - value of apiData.success:", apiData.success);
      console.log("Detailed check - typeof apiData.savings:", typeof apiData.savings);
      console.log("Detailed check - Array.isArray(apiData.savings):", Array.isArray(apiData.savings));
      
      // Log a snippet of savings if it's a string to see its content
      if (typeof apiData.savings === 'string') {
        // Explicitly cast to string for TypeScript to be happy within this block
        console.log("Detailed check - apiData.savings (string snippet):", (apiData.savings as string).substring(0, 100));
      }
      // Log a snippet if it's an array to see its content
      if (Array.isArray(apiData.savings)) {
        console.log("Detailed check - apiData.savings (array - first element if exists):", apiData.savings.length > 0 ? JSON.stringify(apiData.savings[0]) : "Empty array");
      }
    } else {
      console.log("Detailed check - apiData is null or not an object.");
    }
    // ===== END NEW DETAILED LOGGING =====

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