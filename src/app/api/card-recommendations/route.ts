import { NextResponse } from 'next/server';
import { SpendProfile } from '@/types/SpendProfile';
import { fetchCardRecommendationsFromAPI } from '@/lib/cardGeniusAPI'; // Import the utility
import { CardGeniusResponse } from '@/types/cardgenius';

// Initialize default spending data with all fields set to 0
const defaultSpendingData: SpendProfile = {
  amazon_spends: 0,
  flipkart_spends: 0,
  grocery_spends_online: 0,
  online_food_ordering: 0,
  other_online_spends: 0,
  other_offline_spends: 0,
  dining_or_going_out: 0,
  fuel: 0,
  school_fees: 0,
  rent: 0,
  mobile_phone_bills: 0,
  electricity_bills: 0,
  water_bills: 0,
  ott_channels: 0,
  new_monthly_cat_1: 0,
  new_monthly_cat_2: 0,
  new_monthly_cat_3: 0,
  hotels_annual: 0,
  flights_annual: 0,
  insurance_health_annual: 0,
  insurance_car_or_bike_annual: 0,
  large_electronics_purchase_like_mobile_tv_etc: 0,
  all_pharmacy: 0,
  new_cat_1: 0,
  new_cat_2: 0,
  new_cat_3: 0,
  domestic_lounge_usage_quarterly: 0,
  international_lounge_usage_quarterly: 0,
  railway_lounge_usage_quarterly: 0,
  movie_usage: 0,
  movie_mov: 0,
  dining_usage: 0,
  dining_mov: 0,
  selected_card_id: null
};

const fallbackErrorResponse: CardGeniusResponse = {
  success: false,
  message: "Unable to process your request at this time. Please try again later.",
  savings: []
};

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const spendingDataForAPI: SpendProfile = { ...defaultSpendingData };

    if (body.spending_data) {
      Object.entries(body.spending_data).forEach(([key, value]) => {
        if (key in spendingDataForAPI) {
          if (key === 'selected_card_id') {
            spendingDataForAPI[key] = null; // Or handle as string if API expects that
          } else {
            spendingDataForAPI[key] = typeof value === 'number' ? value : 0;
          }
        }
      });
    }
    
    // Validate spending data (optional, as the utility function might also validate)
    if (!spendingDataForAPI || Object.keys(spendingDataForAPI).length === 0) {
      console.error('No valid spending data provided to /api/card-recommendations');
      return NextResponse.json(fallbackErrorResponse, { status: 400 });
    }

    // Call the utility function
    const recommendations = await fetchCardRecommendationsFromAPI(spendingDataForAPI);
    
    // The utility function already handles API errors and returns a CardGeniusResponse structure.
    // We just need to pass its result (or error structure) along.
    if (!recommendations.success) {
        // If the API call wasn't successful as per its own 'success' flag or due to an error caught in utility
        return NextResponse.json(recommendations, { status: 500 }); // Or a more specific error if available
    }

    return NextResponse.json(recommendations);

  } catch (error) {
    console.error('Critical error in /api/card-recommendations handler:', error);
    return NextResponse.json(fallbackErrorResponse, { status: 500 });
  }
} 
