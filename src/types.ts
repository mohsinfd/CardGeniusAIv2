export type SpendProfile = {
  amazon_spends?: number;
  flipkart_spends?: number;
  other_online_spends?: number;
  dining_or_going_out?: number;
  fuel?: number;
  mobile_phone_bills?: number;
  electricity_bills?: number;
  water_bills?: number;
  rent?: number;
  insurance_health_annual?: number;
  insurance_car_or_bike_annual?: number;
  all_pharmacy?: number;
  grocery_spends?: number;
  large_electronics_purchase_like_mobile_tv_etc?: number;
  other_offline_spends?: number;
  movie_usage?: number;
  ott_channels?: number;
  school_fees?: number;
  flights_annual?: number;
  hotels_annual?: number;
  domestic_lounge_usage_quarterly?: number;
  international_lounge_usage_quarterly?: number;
  railway_lounge_usage_quarterly?: number;
  online_food_ordering?: number;
  [key: string]: number | undefined;
};

export interface CardRecommendation {
  id: string; // Unique ID for React key
  name: string;
  imageUrl?: string; // URL or path to a generic image / specific card image
  joiningFee?: string; // e.g., "₹500" or "Nil"
  annualFee?: string; // e.g., "₹500 (waived on X spend)"
  annualRewards?: string; // Estimated annual rewards/savings
  keyPerks: string[]; // List of 2-3 key benefits
  detailsLink?: string; // Optional link to card details page
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  isError?: boolean;
  recommendations?: CardRecommendation[];
  isRecommendation?: boolean;
} 