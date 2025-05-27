import { AsyncDuckDB } from '@duckdb/duckdb-wasm';
import * as arrow from 'apache-arrow';
import { z } from 'zod';

// Add this mapping at the top, after imports
/*
const USER_TO_INTERNAL_CATEGORY_MAP: Record<string, string[]> = {
  amazon_spends: [
    'amex_1RP', 'amex_5RP', 'amex_10RP', // Add all internal keys that represent Amazon spends
    // Add more as needed for other banks/cards
  ],
  // Add similar mappings for other user-facing categories if needed
  // flipkart_spends: [...],
  // other_online_spends: [...],
};
*/

// Define the schema for spend data
export const SpendSchema = z.object({
  amazon_spends: z.number().optional(),
  flipkart_spends: z.number().optional(),
  grocery_spends_online: z.number().optional(),
  dining_or_going_out: z.number().optional(),
  fuel: z.number().optional(),
  mobile_phone_bills: z.number().optional(),
  utility_bills: z.number().optional(),
  travel_spends: z.number().optional(),
  other_spends: z.number().optional()
});

export type Spend = z.infer<typeof SpendSchema>;

export interface CardRecommendation {
  card_id: string;
  card_name: string;
  annual_total: number;
  category_wise_breakdown: Array<{
    category: string;
    amount: number;
    rewards: number;
  }>;
}

// Add helper for tiered RP calculation
function calculateTieredRewards(
  monthlySpend: number,
  rp1: number, rp2: number, rp3: number,
  spendConversion: number,
  threshold2: number, threshold3: number,
  cashConversion: number,
  otherConversion: number,
  monthlyCategoryMaxCap?: number,
  monthlyCategoryMaxPoints?: number
): number {
  let monthlyPoints = 0;
  if (threshold2 && threshold2 > 0 && monthlySpend <= threshold2) {
    monthlyPoints = (monthlySpend / spendConversion) * rp1;
  } else if (threshold3 && threshold3 > 0 && monthlySpend <= threshold3) {
    monthlyPoints = (monthlySpend / spendConversion) * rp2;
  } else {
    monthlyPoints = (monthlySpend / spendConversion) * rp3;
  }
  monthlyPoints = Math.floor(monthlyPoints);

  console.log(`[calc_savings_tiered] 상세 로그: monthlySpend=${monthlySpend}, rp1=${rp1}, spendConversion=${spendConversion}, cashConversion_raw=${cashConversion}, otherConversion_raw=${otherConversion}`);
  console.log(`[calc_savings_tiered] 상세 로그: Calculated monthlyPoints (pre-cap): ${monthlyPoints}`);

  const effectivePointValue = (cashConversion > 0 ? (cashConversion / 10000) : (otherConversion > 0 ? (otherConversion / 10000) : 1));

  console.log(`[calc_savings_tiered] 상세 로그: effectivePointValue calculated as: ${effectivePointValue}`);

  let monthlyRewardValue = monthlyPoints * effectivePointValue;
  console.log(`[calc_savings_tiered] 상세 로그: monthlyRewardValue (pre-cap): ${monthlyRewardValue}`);

  if (monthlyCategoryMaxPoints !== undefined && monthlyCategoryMaxPoints !== null && monthlyCategoryMaxPoints < 9e17 && monthlyPoints > monthlyCategoryMaxPoints) {
    monthlyPoints = monthlyCategoryMaxPoints;
  }

  monthlyRewardValue = monthlyPoints * effectivePointValue;

  if (monthlyCategoryMaxCap !== undefined && monthlyCategoryMaxCap !== null && monthlyCategoryMaxCap < 9e17 && monthlyRewardValue > monthlyCategoryMaxCap) {
    monthlyRewardValue = monthlyCategoryMaxCap;
  }
  return monthlyRewardValue;
}

export async function calcTopN(db: AsyncDuckDB, spend: Spend, n: number): Promise<CardRecommendation[]> {
  const conn = await db.connect();

  try {
    const expandedSpend: Record<string, number> = { ...spend } as Record<string, number>;
    for (const key in expandedSpend) {
      if (expandedSpend[key] === undefined || expandedSpend[key] === null || expandedSpend[key] < 0) {
        delete expandedSpend[key];
      }
    }

    const rulesResult = await conn.query(`SELECT * FROM vw_rewards_by_category`);
    const rules = rulesResult.toArray().map(row => row.toJSON());

    // Add diagnostic logging for AmazonPay ICICI
    const amazonPayRules = rules.filter((rule: any) => 
      rule.card_name === 'ICICI Amazon Pay Credit Card' && 
      rule.internal_category === 'amazon_spends'
    );
    console.log('[calc_savings] AmazonPay ICICI rules:', JSON.stringify(amazonPayRules, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));

    const benefitsResult = await conn.query(
      `SELECT card_id, MAX(card_name) as card_name, MAX(milestone_benefit_desc) as milestone_benefit_desc, MAX(welcome_benefit_desc) as welcome_benefit_desc, MAX(travel_benefit_desc) as travel_benefit_desc, MAX(food_benefit_desc) as food_benefit_desc FROM reward_rules GROUP BY card_id`
    );
    const cardBenefits: Record<string, any> = {};
    for (const row of benefitsResult.toArray().map(r => r.toJSON())) {
      cardBenefits[String(row.card_id)] = row;
    }

    const cardRulesMap: Record<string, { card_name: string; categories: any[]; benefits: any }> = {};
    for (const row of rules) {
      const card_id_str = String(row.card_id);
      if (!cardRulesMap[card_id_str]) {
        cardRulesMap[card_id_str] = {
          card_name: String(row.card_name),
          categories: [],
          benefits: cardBenefits[card_id_str] || {}
        };
      }
      if (!cardRulesMap[card_id_str].categories.some(cat => cat.internal_category === row.internal_category)) {
        const parsedRow = { ...row };
        const fieldsToParseAsFloat = ['cb_percentage', 'cash_conversion', 'other_conversion'];
        const fieldsToParseAsInt = [
          'total_max_cap', 'category_max_cap', 'RP1', 'spend_conversion',
          'RP2', 'threshold_2', 'RP3', 'threshold_3',
          'category_max_points', 'total_max_points'
        ];
        for (const field of fieldsToParseAsFloat) {
          if (parsedRow[field] !== null && parsedRow[field] !== undefined) {
            const cleanedValue = String(parsedRow[field]).replace(/^"|"$/g, '');
            parsedRow[field] = parseFloat(cleanedValue);
            if (isNaN(parsedRow[field])) parsedRow[field] = 0; // Default to 0 if parsing results in NaN
          } else {
            parsedRow[field] = 0; // Default null/undefined to 0 for these fields
          }
        }
        for (const field of fieldsToParseAsInt) {
          if (parsedRow[field] !== null && parsedRow[field] !== undefined) {
            const cleanedValue = String(parsedRow[field]).replace(/^"|"$/g, '');
            parsedRow[field] = parseInt(cleanedValue, 10);
            if (isNaN(parsedRow[field])) parsedRow[field] = 0; // Default to 0 if parsing results in NaN
          } else {
            parsedRow[field] = 0; // Default null/undefined to 0
          }
        }
        cardRulesMap[card_id_str].categories.push(parsedRow);
      }
    }
    
    const recommendations: CardRecommendation[] = [];
    for (const [card_id_str, cardData] of Object.entries(cardRulesMap)) {
      let total_monthly_rewards_for_card_before_total_cap = 0;
      const category_wise_breakdown_for_annual_output: Array<{ category: string; amount: number; rewards: number }> = [];
      // For RP cards that might have a total monthly points cap across all categories
      let total_monthly_points_for_card = 0; 
      let is_rp_card_with_total_point_cap = false;
      let card_level_total_max_points: number | null = null;
      let card_level_rp_cash_conversion = 1; // Default, will be updated if card has RP rules

      // First pass to determine if card has a total_max_points and its RP conversion rate
      // This assumes total_max_points and cash_conversion are consistent for all RP rules of a card
      if (cardData.categories.length > 0) {
          const firstRule = cardData.categories[0]; // Use first rule to check card-level properties
          if (firstRule.total_max_points && firstRule.total_max_points > 0 && firstRule.total_max_points < 9e17) {
              is_rp_card_with_total_point_cap = true; // Might be an RP card with overall point cap
              card_level_total_max_points = firstRule.total_max_points; // This is a MONTHLY point cap
          }
          if (firstRule.cash_conversion && firstRule.cash_conversion > 0) {
            card_level_rp_cash_conversion = firstRule.cash_conversion;
          } else if (firstRule.other_conversion && firstRule.other_conversion > 0) {
            card_level_rp_cash_conversion = firstRule.other_conversion;
          }
      }


      for (const catRule of cardData.categories) {
        const spendAmt = expandedSpend[catRule.internal_category] || 0; // Monthly spend for this category
        if (spendAmt > 0) {
          let capped_monthly_reward_for_category = 0;
          const cbPercentage = catRule.cb_percentage;
          const monthlyCategoryMaxCap = catRule.category_max_cap;
          const monthlyCategoryMaxPoints = catRule.category_max_points;

          // Add diagnostic logging for cashback calculation
          console.log(`[calc_savings] Processing category ${catRule.internal_category} for ${cardData.card_name}:`, {
            internal_reward_code: catRule.internal_reward_code,
            cb_percentage: cbPercentage,
            RP1: catRule.RP1,
            spend_conversion: catRule.spend_conversion
          });

          if (cbPercentage && cbPercentage > 0) {
            let raw_monthly_reward = spendAmt * (cbPercentage / 10000); // cbPercentage is 500 for 5%, so div by 10000
            console.log(`[calc_savings] CB DIAGNOSTIC: Card: ${cardData.card_name}, Category: ${catRule.internal_category}, Internal Reward Code: ${catRule.internal_reward_code}, Parsed cb_percentage: ${cbPercentage}, Monthly Spend: ${spendAmt}, Raw Monthly Reward: ${raw_monthly_reward}, CatRule MonthlyCap: ${catRule.category_max_cap}`);
            
            if (monthlyCategoryMaxCap !== null && monthlyCategoryMaxCap < 9e17 && raw_monthly_reward > monthlyCategoryMaxCap) {
              capped_monthly_reward_for_category = monthlyCategoryMaxCap;
            } else {
              capped_monthly_reward_for_category = raw_monthly_reward;
            }
          } else {
            const rp_cat_reward = calculateTieredRewards(
              spendAmt,
              catRule.RP1 || 0, catRule.RP2 || 0, catRule.RP3 || 0,
              catRule.spend_conversion || 1,
              catRule.threshold_2 || 0, catRule.threshold_3 || 0,
              catRule.cash_conversion || 0, catRule.other_conversion || 0,
              monthlyCategoryMaxCap,
              monthlyCategoryMaxPoints
            );
            capped_monthly_reward_for_category = rp_cat_reward;
            console.log(`[calc_savings] RP DIAGNOSTIC: Card: ${cardData.card_name}, Category: ${catRule.internal_category}, Internal Reward Code: ${catRule.internal_reward_code}, Monthly Spend: ${spendAmt}, RP1: ${catRule.RP1}, SC: ${catRule.spend_conversion}, CC: ${catRule.cash_conversion}, OC: ${catRule.other_conversion}, CatRule CatCap: ${catRule.category_max_cap ?? 0}, CatRule PtsCap: ${catRule.category_max_points ?? 0}, Returned Cat Reward: ${capped_monthly_reward_for_category}`);
          }
          
          total_monthly_rewards_for_card_before_total_cap += capped_monthly_reward_for_category;
          category_wise_breakdown_for_annual_output.push({
            category: catRule.internal_category,
            amount: spendAmt,
            rewards: capped_monthly_reward_for_category * 12 
          });
        }
      }

      // Apply MONTHLY total_max_cap (monetary) for the card
      let final_capped_total_monthly_reward_for_card = total_monthly_rewards_for_card_before_total_cap;
      const cardLevelRuleForTotalCap = cardData.categories[0]; 
      const monthlyTotalMonetaryCap = cardLevelRuleForTotalCap ? cardLevelRuleForTotalCap.total_max_cap : null;

      if (monthlyTotalMonetaryCap !== null && monthlyTotalMonetaryCap < 9e17 && final_capped_total_monthly_reward_for_card > monthlyTotalMonetaryCap) {
        final_capped_total_monthly_reward_for_card = monthlyTotalMonetaryCap;
      }
      
      const annual_total_rewards_value = final_capped_total_monthly_reward_for_card * 12;
      
      if (annual_total_rewards_value > 0) {
        // If the card's total annual reward was capped by monthlyTotalMonetaryCap,
        // the sum of category_wise_breakdown_for_annual_output might be misleadingly high.
        // Optionally, proportionally reduce breakdown rewards if overall cap is hit.
        // For now, keeping breakdown as sum of individually (category) capped annualized rewards.
        recommendations.push({
          card_id: card_id_str,
          card_name: cardData.card_name,
          annual_total: annual_total_rewards_value,
          category_wise_breakdown: category_wise_breakdown_for_annual_output
        });
      }
    }
    return recommendations.sort((a, b) => b.annual_total - a.annual_total).slice(0, n);
  } finally {
    await conn.close();
  }
} 