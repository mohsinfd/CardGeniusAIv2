export interface SpendProfile {
  amazon_spends: number | null;
  flipkart_spends: number | null;
  grocery_spends_online: number | null;
  online_food_ordering: number | null;
  other_online_spends: number | null;
  other_offline_spends: number | null;
  dining_or_going_out: number | null;
  fuel: number | null;
  school_fees: number | null;
  rent: number | null;
  mobile_phone_bills: number | null;
  electricity_bills: number | null;
  water_bills: number | null;
  ott_channels: number | null;
  new_monthly_cat_1: number | null;
  new_monthly_cat_2: number | null;
  new_monthly_cat_3: number | null;
  hotels_annual: number | null;
  flights_annual: number | null;
  insurance_health_annual: number | null;
  insurance_car_or_bike_annual: number | null;
  large_electronics_purchase_like_mobile_tv_etc: number | null;
  all_pharmacy: number | null;
  new_cat_1: number | null;
  new_cat_2: number | null;
  new_cat_3: number | null;
  domestic_lounge_usage_quarterly: number | null;
  international_lounge_usage_quarterly: number | null;
  railway_lounge_usage_quarterly: number | null;
  movie_usage: number | null;
  movie_mov: number | null;
  dining_usage: number | null;
  dining_mov: number | null;
  selected_card_id: string | null;
}

// It's good practice to define default values
export const defaultSpendProfile: SpendProfile = {
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
  selected_card_id: null,
}; 