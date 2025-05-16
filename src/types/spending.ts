export interface SpendingData {
  direct_spends?: {
    amazon_spends?: number;
    flipkart_spends?: number;
    [key: string]: number | undefined;
  };
  monthly: {
    amazon_spends?: number;
    flipkart_spends?: number;
    grocery_spends?: number;
    online_food_ordering_amount?: number;
    online_food_ordering_count?: number;
    other_online_spends?: number;
    other_offline_spends?: number;
    dining_or_going_out?: number;
    dining_usage?: number;
    dining_mov?: number;
    fuel?: number;
    school_fees?: number;
    rent?: number;
    mobile_phone_bills?: number;
    electricity_bills?: number;
    water_bills?: number;
    ott_channels?: number;
    [key: string]: number | undefined;
  };
  quarterly: {
    domestic_lounge_usage_quarterly?: number;
    international_lounge_usage_quarterly?: number;
    railway_lounge_usage_quarterly?: number;
    movie_usage?: number;
    movie_mov?: number;
    [key: string]: number | undefined;
  };
  annual: {
    hotels_annual?: number;
    flights_annual?: number;
    insurance_health_annual?: number;
    insurance_car_or_bike_annual?: number;
    large_electronics_purchase_like_mobile_tv_etc?: number;
    [key: string]: number | undefined;
  };
}

export interface SpendingCategory {
  key: string;
  displayName: string;
  description: string;
  icon: string;
}

export interface SpendingAnalysis {
  total: number;
  categories: {
    category: keyof SpendingData;
    amount: number;
    percentage: number;
  }[];
}

export interface SpendingUpdate {
  category: string;
  amount: number;
  timestamp: number;
}

export const SPENDING_CATEGORIES: SpendingCategory[] = [
  {
    key: 'amazon_spends',
    displayName: 'Amazon',
    description: 'Online shopping on Amazon',
    icon: '🛒'
  },
  {
    key: 'flipkart_spends',
    displayName: 'Flipkart',
    description: 'Online shopping on Flipkart',
    icon: '🛍️'
  },
  {
    key: 'dining_or_going_out',
    displayName: 'Dining',
    description: 'Restaurants and dining out',
    icon: '🍽️'
  },
  {
    key: 'fuel',
    displayName: 'Fuel',
    description: 'Petrol and diesel expenses',
    icon: '⛽'
  },
  {
    key: 'other_online',
    displayName: 'Other Online',
    description: 'Other online shopping',
    icon: '🌐'
  }
]; 