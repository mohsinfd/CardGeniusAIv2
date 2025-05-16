import { SpendingData } from '../types/spending';

// This type defines that our question repository will have keys from SpendingData['monthly']
// and string values (the questions). It's Partial because we might not have a direct question for every single field.
export type QuestionRepositoryType = Partial<Record<keyof SpendingData['monthly'], string>>;

export const questionRepository: QuestionRepositoryType = {
  // Monthly Spends
  amazon_spends: "How much do you typically spend on Amazon each month?",
  flipkart_spends: "What's your usual monthly spend on Flipkart?",
  grocery_spends: "About how much do you spend on online groceries (e.g., BigBasket, Blinkit) per month?",
  online_food_ordering: "What's your average monthly spending on online food orders (e.g., Swiggy, Zomato)?",
  online_food_ordering_count: "How many times do you typically order food online per month?",
  other_online_spends: "Apart from Amazon, Flipkart, groceries, and food, what are your other major online monthly spends (e.g., Myntra, Nykaa, other e-commerce)? Please specify the total amount.",
  other_offline_spends: "What are your typical monthly spends on offline shopping (e.g., clothes, electronics at physical stores)?",
  dining_or_going_out: "Roughly how much do you spend on dining out or going out (e.g., restaurants, cafes, pubs) each month?",
  dining_usage: "How many times do you typically dine out per month?",
  dining_mov: "What's your average spend per dining occasion?",
  fuel: "What is your average monthly expenditure on fuel?",
  school_fees: "If applicable, what are your monthly school or tuition fee payments?",
  rent: "How much do you pay for rent each month?",
  mobile_phone_bills: "What's the typical amount for your monthly mobile phone bills?",
  electricity_bills: "What is your average monthly electricity bill?",
  water_bills: "How much do you usually pay for water bills per month?",
  ott_channels: "What are your monthly expenses on OTT subscriptions (e.g., Netflix, Hotstar)?",

  // Annual Spends
  hotels_annual: "Approximately how much do you spend on hotel stays in a year?",
  flights_annual: "What would be your estimated annual spending on flights?",
  insurance_health_annual: "What is your annual premium for health insurance?",
  insurance_car_or_bike_annual: "How much do you pay annually for car or bike insurance?",
  large_electronics_purchase_like_mobile_tv_etc: "Do you plan to make any large electronics purchases (like a mobile, TV, appliance) in the next year? If so, what's the approximate budget?",

  // Quarterly / Count-Based Fields
  domestic_lounge_usage_quarterly: "How many times do you typically use a domestic airport lounge in a quarter?",
  international_lounge_usage_quarterly: "How many times do you typically use an international airport lounge in a quarter?",
  railway_lounge_usage_quarterly: "How many times might you use a railway lounge in a quarter?",
  movie_usage: "How many times do you typically watch movies in a cinema per month or quarter? Please specify the frequency.",
  movie_mov: "What's the average amount you spend per movie outing (including tickets, snacks)?"
};

// Helper function to get a question, can be expanded later
export function getQuestionForKey(key: keyof SpendingData['monthly']): string | undefined {
  return questionRepository[key];
} 