import { SpendProfile } from './types';

export const CATEGORY_GRAPH: Record<string, string[]> = {
  /* ───────── Fuel & Travel ───────── */
  fuel: [
    "insurance_car_or_bike_annual",
    "flights_annual",
    "hotels_annual",
    "domestic_lounge_usage_quarterly",
    "international_lounge_usage_quarterly",
    "railway_lounge_usage_quarterly"
  ],

  travel: ["fuel", "hotels_annual", "flights_annual", "domestic_lounge_usage_quarterly", "international_lounge_usage_quarterly"],

  /* ───────── Shopping ───────── */
  shopping_online: ["amazon_spends", "flipkart_spends", "other_online_spends"],
  shopping_offline: [
    "other_offline_spends",
    "large_electronics_purchase_like_mobile_tv_etc"
  ],

  /* ───────── Dining, Food, Grocery ───────── */
  dining_or_restaurants: [
    "online_food_ordering",
    "grocery_spends",
    "movie_usage"
  ],

  online_food_ordering: ["dining_or_restaurants", "grocery_spends"],
  grocery_spends: ["dining_or_restaurants", "online_food_ordering", "amazon_spends", "flipkart_spends"],

  /* ───────── Dining Usage → Movies ───────── */
  movie_usage: ["ott_channels", "dining_or_restaurants"],

  /* ───────── Movies ↔ OTT ───────── */
  ott_channels: ["movie_usage", "mobile_phone_bills"],

  /* ───────── Insurance & Pharmacy ───────── */
  insurance_health_annual: ["all_pharmacy", "school_fees"],
  all_pharmacy: [],

  /* ───────── Rent & Utilities ───────── */
  rent: [
    "mobile_phone_bills",
    "electricity_bills",
    "water_bills",
    "insurance_health_annual"
  ],

  /* ───────── School Fees ───────── */
  school_fees: ["insurance_health_annual"],

  /* ───────── Reverse Relations ───────── */
  amazon_spends: ["shopping_online", "grocery_spends", "mobile_phone_bills", "ott_channels"],
  flipkart_spends: ["shopping_online", "grocery_spends", "mobile_phone_bills", "ott_channels"],
  other_online_spends: ["shopping_online"],
  other_offline_spends: ["shopping_offline"],
  large_electronics_purchase_like_mobile_tv_etc: ["shopping_offline", "amazon_spends", "flipkart_spends"],
  mobile_phone_bills: ["rent", "ott_channels", "electricity_bills", "water_bills"],
  electricity_bills: ["rent", "mobile_phone_bills", "water_bills"],
  water_bills: ["rent", "mobile_phone_bills", "electricity_bills"],
  flights_annual: ["travel", "hotels_annual"],
  hotels_annual: ["travel", "flights_annual"],
  domestic_lounge_usage_quarterly: ["travel", "international_lounge_usage_quarterly", "railway_lounge_usage_quarterly"],
  international_lounge_usage_quarterly: ["travel", "domestic_lounge_usage_quarterly"],
  railway_lounge_usage_quarterly: ["travel", "domestic_lounge_usage_quarterly"]
};

export interface CategoryNode {
  category: string;
  related: string[];
  asked: boolean;
  value?: number;
}

export class CategoryGraph {
  private nodes: Map<string, CategoryNode>;
  private askedCount: number = 0;
  private skipCount: number = 0;
  private askedCategories: Record<string, { hasBeenAsked: boolean; value: number | undefined }> = {};
  private graph: Record<string, string[]> = {}; // Adjacency list
  private allCategories: string[];

  constructor() {
    this.nodes = new Map();
    Object.entries(CATEGORY_GRAPH).forEach(([category, related]) => {
      this.nodes.set(category, {
        category,
        related,
        asked: false
      });
    });
    this.allCategories = SPEND_SCHEMA_CATEGORIES;
    // For now, a simple linear graph for primary questions if no specific focus
    // This can be expanded with actual dependencies if needed
    for (let i = 0; i < this.allCategories.length - 1; i++) {
      this.graph[this.allCategories[i]] = [this.allCategories[i+1]];
    }
  }

  getNextCategory(ambiguous: string[]): string | null {
    // First try ambiguous categories
    for (const category of ambiguous) {
      if (!this.nodes.get(category)?.asked) {
        return category;
      }
    }

    // Then try related categories from graph
    const askedCategories = Array.from(this.nodes.values())
      .filter(node => node.asked)
      .map(node => node.category);

    for (const category of askedCategories) {
      const related = this.nodes.get(category)?.related || [];
      for (const relatedCategory of related) {
        if (!this.nodes.get(relatedCategory)?.asked) {
          return relatedCategory;
        }
      }
    }

    return null;
  }

  markAsked(category: string, spendValue: number): void {
    console.log(`[CategoryGraph] Marking ${category} as asked with value: ${spendValue}`);
    this.askedCategories[category] = { hasBeenAsked: true, value: spendValue };
  }

  markSkipped() {
    this.skipCount++;
  }

  shouldPromptForResults(): boolean {
    return this.skipCount >= 2;
  }

  getTotalSpend(): number {
    return Array.from(this.nodes.values())
      .filter(node => node.value !== undefined)
      .reduce((sum, node) => sum + (node.value || 0), 0);
  }

  getAskedCategories(): string[] {
    return Array.from(this.nodes.values())
      .filter(node => node.asked)
      .map(node => node.category);
  }

  getSpendingInfo(): Record<string, number> {
    const result: Record<string, number> = {};
    this.nodes.forEach((node, category) => {
      if (node.value !== undefined) {
        result[category] = node.value;
      }
    });
    return result;
  }

  reset() {
    this.nodes.forEach(node => {
      node.asked = false;
      node.value = undefined;
    });
    this.askedCount = 0;
    this.skipCount = 0;
    this.askedCategories = {};
  }

  getNextPrimaryCategoryToAsk(
    currentSpends: Partial<SpendProfile>,
    initialFocusPurpose?: string,
    categoryJustAnswered?: string | null
  ): string | null {
    // Define a somewhat logical default order of questioning
    const defaultPrimaryQuestionOrder = [
      "amazon_spends", "other_online_spends", "flipkart_spends", "dining_or_going_out",
      "online_food_ordering", "grocery_spends", "fuel", "mobile_phone_bills",
      "electricity_bills", "rent", "flights_annual", "hotels_annual", "all_pharmacy",
      "insurance_health_annual", "insurance_car_or_bike_annual", "movie_usage", "ott_channels",
      "other_offline_spends", "large_electronics_purchase_like_mobile_tv_etc", "school_fees",
      "water_bills", "domestic_lounge_usage_quarterly", "international_lounge_usage_quarterly",
      "railway_lounge_usage_quarterly"
    ];
    let categoriesToConsider = defaultPrimaryQuestionOrder;
    if (initialFocusPurpose) {
      const focus = initialFocusPurpose.toLowerCase();
      let prioritized: string[] = [];
      if (focus.includes("shop") || focus.includes("online")) {
        if (focus.includes("myntra") || focus.includes("nykaa")) {
          prioritized = ["amazon_spends", "other_online_spends", "flipkart_spends", "other_offline_spends", "large_electronics_purchase_like_mobile_tv_etc"];
        } else {
          prioritized = ["amazon_spends", "flipkart_spends", "other_online_spends", "other_offline_spends", "large_electronics_purchase_like_mobile_tv_etc"];
        }
      } else if (focus.includes("food") || focus.includes("dining") || focus.includes("restaurant")) {
        prioritized = ["dining_or_going_out", "online_food_ordering", "grocery_spends"];
      } else if (focus.includes("travel") || focus.includes("trip") || focus.includes("holiday")) {
        prioritized = ["flights_annual", "hotels_annual", "fuel", "domestic_lounge_usage_quarterly", "international_lounge_usage_quarterly"];
      } else if (focus.includes("bill") || focus.includes("utilit")) {
        prioritized = ["mobile_phone_bills", "electricity_bills", "water_bills", "rent", "ott_channels"];
      } else if (focus.includes("health") || focus.includes("medical") || focus.includes("insurance")) {
        prioritized = ["insurance_health_annual", "all_pharmacy", "insurance_car_or_bike_annual"];
      }
      categoriesToConsider = [
        ...prioritized,
        ...defaultPrimaryQuestionOrder.filter(cat => !prioritized.includes(cat))
      ];
    }

    for (const category of categoriesToConsider) {
      // Skip if this is the category that was just answered in the current turn
      if (category === categoryJustAnswered) {
        console.log(`[CategoryGraph] getNextPrimary: Skipping ${category} as it was just answered.`);
        continue;
      }

      // Use the unified isCategoryAsked logic.
      // Pass the value from currentSpends to isCategoryAsked to handle the "0 from initial parse" case.
      const spendValueForCategory = currentSpends[category as keyof SpendProfile];
      if (!this.isCategoryAsked(category, spendValueForCategory)) {
        console.log(`[CategoryGraph] getNextPrimary: Returning ${category} as it's not considered asked yet (value: ${spendValueForCategory}).`);
        return category;
      } else {
        console.log(`[CategoryGraph] getNextPrimary: Skipping ${category} as it IS considered asked (value: ${spendValueForCategory}, internal state: ${JSON.stringify(this.askedCategories[category])}).`);
      }
    }
    console.log(`[CategoryGraph] getNextPrimary: No suitable category found to ask next.`);
    return null;
  }

  isCategoryAsked(category: string, currentValue?: number): boolean {
    const catState = this.askedCategories[category];
    if (!catState || !catState.hasBeenAsked) {
        // console.log(`[CategoryGraph] isCategoryAsked: ${category} - NO (not present or not marked asked)`);
        return false;
    }
    // If currentValue is 0 and the stored value for this category is also 0,
    // treat it as not truly asked for the purpose of deciding the *next* question.
    if (currentValue === 0 && catState.value === 0) {
        console.log(`[CategoryGraph] isCategoryAsked: ${category} - NO (currentValue is 0 and stored value is 0 - implies initial parse)`);
        return false;
    }
    // console.log(`[CategoryGraph] isCategoryAsked: ${category} - YES (state: ${JSON.stringify(catState)}, currentValue: ${currentValue})`);
    return true;
  }
}

// SpendSchema keys - ensure these are aligned with your actual SpendSchema definition
// This list helps in identifying which categories are primary targets for data collection.
export const SPEND_SCHEMA_CATEGORIES = [
  "amazon_spends",
  "flipkart_spends",
  "other_online_spends",
  "dining_or_going_out", // This was 'dining_or_restaurants' in the graph, ensure consistency
  "fuel",
  "mobile_phone_bills",
  "electricity_bills",
  "water_bills",
  "rent",
  "insurance_health_annual",
  "insurance_car_or_bike_annual",
  "all_pharmacy",
  "grocery_spends",
  "large_electronics_purchase_like_mobile_tv_etc",
  "other_offline_spends",
  "movie_usage",
  "ott_channels",
  "school_fees",
  "flights_annual",
  "hotels_annual",
  "domestic_lounge_usage_quarterly",
  "international_lounge_usage_quarterly",
  "railway_lounge_usage_quarterly",
  "online_food_ordering" // Added as it's distinct
];

// A function to get the next correlated category to ask about
export function getNextCorrelatedCategories(
  primaryCategory: string,
  alreadyAsked: Set<string>
): string[] {
  const related = CATEGORY_GRAPH[primaryCategory] || [];
  return related.filter(cat => !alreadyAsked.has(cat) && SPEND_SCHEMA_CATEGORIES.includes(cat));
}

// Function to get initial set of questions, can be a fixed list or derived
export function getInitialQuestionSequence(): string[] {
  // Define a sequence of most common/impactful categories to ask first
  return [
    "amazon_spends",
    "flipkart_spends",
    "dining_or_going_out",
    "fuel",
    "mobile_phone_bills",
    "grocery_spends"
    // Add other primary categories as needed
  ].filter(cat => SPEND_SCHEMA_CATEGORIES.includes(cat)); // Ensure they are valid schema keys
}

// Helper to get a user-friendly question for a category key
export function getQuestionForCategory(categoryKey: string): string {
  const questions: Record<string, string> = {
    amazon_spends: "Roughly, what's your monthly spend on Amazon?",
    flipkart_spends: "And about how much do you spend on Flipkart monthly?",
    other_online_spends: "Any other significant online spends per month (e.g., Myntra, Nykaa, other e-commerce)?",
    dining_or_going_out: "What's your approximate monthly expenditure on dining out or food delivery?",
    fuel: "How much do you typically spend on fuel each month?",
    mobile_phone_bills: "What are your usual monthly mobile phone bill expenses?",
    electricity_bills: "Could you share your average monthly electricity bill amount?",
    water_bills: "And your typical monthly water bill?",
    rent: "What is your monthly rent payment?",
    insurance_health_annual: "What's your annual premium for health insurance?",
    insurance_car_or_bike_annual: "And your annual premium for car or bike insurance?",
    all_pharmacy: "How much do you spend on pharmacy/medical expenses monthly (excluding health insurance premiums)?",
    grocery_spends: "What's your estimated monthly grocery bill?",
    large_electronics_purchase_like_mobile_tv_etc: "Are you planning any large electronics purchases soon (e.g., mobile, TV, appliances)? If so, what's the approximate budget?",
    other_offline_spends: "Any other significant offline spends per month (e.g., apparel, home goods not covered elsewhere)?",
    movie_usage: "How much do you spend on movie tickets or cinema visits monthly?",
    ott_channels: "What are your monthly subscription costs for OTT channels (like Netflix, Hotstar etc.)?",
    school_fees: "If applicable, what are the school/tuition fee expenses (please specify if monthly or annual)?",
    flights_annual: "What's your estimated annual spend on flights?",
    hotels_annual: "And your estimated annual spend on hotels?",
    domestic_lounge_usage_quarterly: "How many times do you typically use domestic airport lounges per quarter?",
    international_lounge_usage_quarterly: "And how many times do you use international airport lounges per quarter?",
    railway_lounge_usage_quarterly: "Do you use railway lounges? If so, how many times per quarter?",
    online_food_ordering: "What's your approximate monthly spend on online food ordering (e.g., Swiggy, Zomato)?"
  };
  return questions[categoryKey] || `How much do you spend on ${categoryKey.replace(/_/g, ' ')}? (Please specify if monthly or annual if not obvious)`;
} 