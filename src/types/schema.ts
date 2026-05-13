import { z } from 'zod';

// Preprocess step: null/undefined → 0, then coerce strings → numbers, default missing → 0
const CleanNumber = z.preprocess(
  (val) => (val == null ? 0 : val),
  z.coerce.number().default(0)
);

// Combined spending schema
export const SpendingDataSchema = z.object({
  // Monthly spending
  amazon_spends: CleanNumber,
  flipkart_spends: CleanNumber,
  grocery_spends_online: CleanNumber,
  online_food_ordering: CleanNumber,
  other_online_spends: CleanNumber,
  other_offline_spends: CleanNumber,
  dining_or_going_out: CleanNumber,
  fuel: CleanNumber,
  school_fees: CleanNumber,
  rent: CleanNumber,
  mobile_phone_bills: CleanNumber,
  electricity_bills: CleanNumber,
  water_bills: CleanNumber,
  ott_channels: CleanNumber,
  new_monthly_cat_1: CleanNumber,
  new_monthly_cat_2: CleanNumber,
  new_monthly_cat_3: CleanNumber,

  // Annual spending
  hotels_annual: CleanNumber,
  flights_annual: CleanNumber,
  insurance_health_annual: CleanNumber,
  insurance_car_or_bike_annual: CleanNumber,
  large_electronics_purchase_like_mobile_tv_etc: CleanNumber,
  all_pharmacy: CleanNumber,
  new_cat_1: CleanNumber,
  new_cat_2: CleanNumber,
  new_cat_3: CleanNumber,

  // Quarterly spending
  domestic_lounge_usage_quarterly: CleanNumber,
  international_lounge_usage_quarterly: CleanNumber,
  railway_lounge_usage_quarterly: CleanNumber,
  movie_usage: CleanNumber,
  movie_mov: CleanNumber,
  dining_usage: CleanNumber,
  dining_mov: CleanNumber
}).strict();

// Dialogue state schema
export const DialogueStateSchema = z.object({
  askedFields: z.array(z.string()),
  pendingFields: z.array(z.string()),
  chainStep: z.number(),
  currentField: z.string()
});

// Chat response schema
export const ChatResponseSchema = z.object({
  content: z.string(),
  ready_for_recommendations: z.boolean(),
  follow_up_question: z.string(),
  spending_data: SpendingDataSchema,
  dialogue_state: DialogueStateSchema
});

export type SpendingData = z.infer<typeof SpendingDataSchema>;
export type DialogueState = z.infer<typeof DialogueStateSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;

export const ConversationChainEnum = z.enum([
  'Initial',
  'Dining',
  'Shopping',
  'Travel',
  'Utilities',
  'Entertainment',
  'Health',
  'Education'
]);

export type ConversationChain = z.infer<typeof ConversationChainEnum>; 