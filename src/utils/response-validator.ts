import { CardGeniusResponse, CardRecommendation } from '@/types/cardgenius';

export function validateCardGeniusResponse(response: any): CardGeniusResponse {
  if (!response || typeof response !== 'object') {
    throw new Error('Invalid response format: response is not an object');
  }

  if (typeof response.success !== 'boolean') {
    throw new Error('Invalid response format: success field is missing or invalid');
  }

  if (!response.savings || !Array.isArray(response.savings)) {
    throw new Error('Invalid response format: savings field is missing or not an array');
  }

  // Validate each card recommendation
  const validatedSavings = response.savings.map((card: any) => validateCardRecommendation(card));

  return {
    success: response.success,
    message: response.message || '',
    savings: validatedSavings
  };
}

function validateCardRecommendation(card: any): CardRecommendation {
  if (!card || typeof card !== 'object') {
    throw new Error('Invalid card recommendation format');
  }

  // Required fields
  const requiredFields = ['card_name', 'id', 'joining_fees', 'image'];
  for (const field of requiredFields) {
    if (!(field in card)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Ensure arrays are initialized
  const validatedCard: CardRecommendation = {
    ...card,
    welcomeBenefits: Array.isArray(card.welcomeBenefits) ? card.welcomeBenefits : [],
    product_usps: Array.isArray(card.product_usps) ? card.product_usps : [],
    food_dining_benefits: Array.isArray(card.food_dining_benefits) ? card.food_dining_benefits : [],
    milestone_benefits: Array.isArray(card.milestone_benefits) ? card.milestone_benefits : [],
    spending_breakdown_array: Array.isArray(card.spending_breakdown_array) ? card.spending_breakdown_array : [],
    category_breakdown: typeof card.category_breakdown === 'object' ? card.category_breakdown : {},
    spending_breakdown: typeof card.spending_breakdown === 'object' ? card.spending_breakdown : {}
  };

  // Ensure numeric fields are numbers
  const numericFields = ['total_savings', 'total_savings_yearly', 'total_extra_benefits', 'roi'];
  for (const field of numericFields) {
    if (field in validatedCard) {
      validatedCard[field] = Number(validatedCard[field]) || 0;
    }
  }

  return validatedCard;
} 