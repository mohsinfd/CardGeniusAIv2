import { ChatResponseSchema, ChatResponse } from '@/types/schema';

/**
 * Parses the OpenAI response to extract structured JSON data
 * @param response The raw response text from OpenAI
 * @returns Structured response object with parsed JSON data
 */
export function parseOpenAIResponse(response: string): ChatResponse {
  // Default values in case parsing fails
  const defaultResponse: ChatResponse = {
    content: '',
    ready_for_recommendations: false,
    follow_up_question: '',
    spending_data: {},
    current_chain: 'Initial',
    chain_step: 0,
    asked_fields: []
  };

  if (!response) {
    console.error('Empty response from OpenAI');
    return defaultResponse;
  }

  try {
    // First, try to see if the entire response is valid JSON
    try {
      const fullJson = JSON.parse(response);
      const validated = ChatResponseSchema.safeParse(fullJson);
      if (validated.success) {
        return validated.data;
      }
      // Not valid against our schema, continue with extraction
    } catch (e) {
      // Not valid JSON, continue with extraction
    }

    // Look for JSON code blocks (```json...```)
    const jsonRegex = /```(?:json)?\s*({[\s\S]*?})\s*```/;
    const match = response.match(jsonRegex);
    
    if (match && match[1]) {
      const jsonStr = match[1].trim();
      const parsedJson = JSON.parse(jsonStr);
      const validated = ChatResponseSchema.safeParse(parsedJson);
      
      if (validated.success) {
        return validated.data;
      }
    } 
    
    // If no JSON block is found, look for object literals in the text
    const objectRegex = /({[\s\S]*?})/;
    const objectMatch = response.match(objectRegex);
    
    if (objectMatch && objectMatch[1]) {
      try {
        const parsedObj = JSON.parse(objectMatch[1]);
        const validated = ChatResponseSchema.safeParse(parsedObj);
        if (validated.success) {
          return validated.data;
        }
      } catch (e) {
        // Invalid object literal format
      }
    }

    // If no valid JSON found, return default response
    console.error('No valid structured data found in OpenAI response');
    return defaultResponse;
  } catch (error) {
    console.error('Error parsing OpenAI response:', error);
    console.error('Original response:', response);
    return defaultResponse;
  }
} 