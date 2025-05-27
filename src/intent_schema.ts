import { z } from 'zod';

export const IntentSchema = z.enum(['SHOW_RECS', 'CARD_EXPLAIN', 'RESTART']);

export const SpendSchema = z.record(z.string(), z.number());

export const CardExplainSchema = z.object({
  card_name: z.string()
});

export const IntentDataSchema = z.discriminatedUnion('intent', [
  z.object({
    intent: z.literal('SHOW_RECS'),
    purpose: z.enum(['shopping', 'travel', 'cashback', 'miles', 'lounge']).nullable(),
    spending: z.record(z.string(), z.number()).optional(),
    ambiguous: z.array(z.string()).optional(),
    asked_categories: z.array(z.string()).optional()
  }),
  z.object({
    intent: z.literal('CARD_EXPLAIN'),
    card_name: z.string()
  }),
  z.object({
    intent: z.literal('RESTART')
  })
]);

export type Intent = z.infer<typeof IntentSchema>;
export type Spend = z.infer<typeof SpendSchema>;
export type CardExplain = z.infer<typeof CardExplainSchema>;
export type IntentData = z.infer<typeof IntentDataSchema>; 