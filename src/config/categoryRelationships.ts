import { SpendingData } from '../types/spending';

// Define relationships between spending categories
export const categoryRelationships: Record<keyof SpendingData['monthly'], {
  relatedCategories: Array<keyof SpendingData['monthly']>;
  priority: number; // Higher number means higher priority
  description: string;
  group: string; // Added group field for better organization
}> = {
  // Travel Group
  flights_annual: {
    relatedCategories: ['hotels_annual', 'domestic_lounge_usage_quarterly', 'international_lounge_usage_quarterly'],
    priority: 1,
    description: 'Air travel expenses',
    group: 'Travel'
  },
  hotels_annual: {
    relatedCategories: ['flights_annual', 'domestic_lounge_usage_quarterly', 'international_lounge_usage_quarterly'],
    priority: 1,
    description: 'Hotel stays',
    group: 'Travel'
  },
  domestic_lounge_usage_quarterly: {
    relatedCategories: ['flights_annual', 'hotels_annual'],
    priority: 2,
    description: 'Domestic airport lounge usage',
    group: 'Travel'
  },
  international_lounge_usage_quarterly: {
    relatedCategories: ['flights_annual', 'hotels_annual'],
    priority: 2,
    description: 'International airport lounge usage',
    group: 'Travel'
  },
  railway_lounge_usage_quarterly: {
    relatedCategories: ['flights_annual', 'hotels_annual'],
    priority: 2,
    description: 'Railway lounge usage',
    group: 'Travel'
  },

  // Shopping Group
  amazon_spends: {
    relatedCategories: ['flipkart_spends', 'other_online_spends', 'large_electronics_purchase_like_mobile_tv_etc'],
    priority: 1,
    description: 'Amazon shopping',
    group: 'Shopping'
  },
  flipkart_spends: {
    relatedCategories: ['amazon_spends', 'other_online_spends', 'large_electronics_purchase_like_mobile_tv_etc'],
    priority: 1,
    description: 'Flipkart shopping',
    group: 'Shopping'
  },
  other_online_spends: {
    relatedCategories: ['amazon_spends', 'flipkart_spends', 'large_electronics_purchase_like_mobile_tv_etc'],
    priority: 2,
    description: 'Other online shopping',
    group: 'Shopping'
  },
  other_offline_spends: {
    relatedCategories: ['large_electronics_purchase_like_mobile_tv_etc'],
    priority: 2,
    description: 'Offline shopping',
    group: 'Shopping'
  },
  large_electronics_purchase_like_mobile_tv_etc: {
    relatedCategories: ['amazon_spends', 'flipkart_spends', 'other_online_spends'],
    priority: 2,
    description: 'Large electronics purchases',
    group: 'Shopping'
  },

  // Food & Dining Group
  online_food_ordering: {
    relatedCategories: ['dining_or_going_out', 'dining_usage', 'dining_mov'],
    priority: 1,
    description: 'Online food delivery',
    group: 'Food & Dining'
  },
  grocery_spends_online: {
    relatedCategories: ['dining_or_going_out', 'online_food_ordering'],
    priority: 1,
    description: 'Online grocery shopping',
    group: 'Food & Dining'
  },
  dining_or_going_out: {
    relatedCategories: ['online_food_ordering', 'dining_usage', 'dining_mov'],
    priority: 1,
    description: 'Dining out expenses',
    group: 'Food & Dining'
  },
  dining_usage: {
    relatedCategories: ['dining_or_going_out', 'online_food_ordering'],
    priority: 2,
    description: 'Dining benefits usage',
    group: 'Food & Dining'
  },
  dining_mov: {
    relatedCategories: ['dining_or_going_out', 'online_food_ordering'],
    priority: 2,
    description: 'Dining benefits value',
    group: 'Food & Dining'
  },

  // Fuel Group
  fuel: {
    relatedCategories: ['insurance_car_or_bike_annual'],
    priority: 1,
    description: 'Fuel expenses',
    group: 'Fuel'
  },

  // Insurance & Health Group
  insurance_health_annual: {
    relatedCategories: ['all_pharmacy'],
    priority: 1,
    description: 'Health insurance',
    group: 'Insurance & Health'
  },
  insurance_car_or_bike_annual: {
    relatedCategories: ['fuel'],
    priority: 1,
    description: 'Vehicle insurance',
    group: 'Insurance & Health'
  },
  all_pharmacy: {
    relatedCategories: ['insurance_health_annual'],
    priority: 2,
    description: 'Pharmacy expenses',
    group: 'Insurance & Health'
  },

  // Bills Group
  mobile_phone_bills: {
    relatedCategories: ['electricity_bills', 'water_bills'],
    priority: 1,
    description: 'Mobile phone bills',
    group: 'Bills'
  },
  electricity_bills: {
    relatedCategories: ['mobile_phone_bills', 'water_bills'],
    priority: 1,
    description: 'Electricity bills',
    group: 'Bills'
  },
  water_bills: {
    relatedCategories: ['mobile_phone_bills', 'electricity_bills'],
    priority: 1,
    description: 'Water bills',
    group: 'Bills'
  },

  // Education Group
  school_fees: {
    relatedCategories: [],
    priority: 1,
    description: 'School fees',
    group: 'Education'
  },

  // Rent Group
  rent: {
    relatedCategories: ['electricity_bills', 'water_bills'],
    priority: 1,
    description: 'Rent expenses',
    group: 'Rent'
  },

  // Entertainment Group
  ott_channels: {
    relatedCategories: ['movie_usage', 'movie_mov'],
    priority: 1,
    description: 'OTT streaming services',
    group: 'Entertainment'
  },
  movie_usage: {
    relatedCategories: ['ott_channels', 'movie_mov'],
    priority: 1,
    description: 'Movie ticket usage',
    group: 'Entertainment'
  },
  movie_mov: {
    relatedCategories: ['ott_channels', 'movie_usage'],
    priority: 1,
    description: 'Movie ticket value',
    group: 'Entertainment'
  }
}; 