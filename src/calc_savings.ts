import * as duckdb from 'duckdb';
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
  other_online_spends: z.number().optional(),
  flights_annual: z.number().optional(),
  hotels_annual: z.number().optional(),
  fuel: z.number().optional(),
  dining_or_going_out: z.number().optional(),
  online_food_ordering: z.number().optional(),
  grocery_spends: z.number().optional(),
});

export type SpendProfile = z.infer<typeof SpendSchema>;

export interface SavingsResult {
  card_id: string;
  monthly_rewards: number;
  milestone_bonus: number;
  annual_total: number;
}

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

/* ---------- Core helpers ---------- */

/** Calculate rewards for ONE card */
export async function calcCard(
  db: duckdb.Connection,
  cardId: string,
  spend: SpendProfile
): Promise<SavingsResult> {
  return new Promise((resolve, reject) => {
    // 1. Fetch reward rules + caps
    const stmt1 = db.prepare(`
      SELECT category_key,
             reward_rate,
             COALESCE(monthly_cap, 9e12) AS cap
        FROM joined_view
       WHERE card_id = ?
    `);
    stmt1.all(cardId, (err, rules) => {
      stmt1.finalize();
      if (err) return reject(err);

      // 2. Accumulate monthly rewards
      let monthly = 0;
      for (const { category_key, reward_rate, cap } of rules) {
        const categoryKey = category_key as keyof SpendProfile;
        const amt = Math.min(spend[categoryKey] ?? 0, cap);
        monthly += amt * reward_rate;
      }

      // 3. Check milestone eligibility
      const totalSpend = Object.values(spend).reduce((a, b) => a + (b ?? 0), 0);
      const stmt2 = db.prepare(`
        SELECT milestone_reward
          FROM milestones
         WHERE card_id = ?
           AND ? >= milestone_spend
      ORDER BY milestone_spend DESC
         LIMIT 1
      `);
      stmt2.all(cardId, totalSpend, (err2, ms) => {
        stmt2.finalize();
        if (err2) return reject(err2);
        const milestone_bonus = ms.length > 0 ? ms[0].milestone_reward : 0;
        resolve({
          card_id: cardId,
          monthly_rewards: monthly,
          milestone_bonus,
          annual_total: monthly * 12 + milestone_bonus,
        });
      });
    });
  });
}

/** Calculate the TOP-N cards by annual_total */
export async function calcTopN(db: duckdb.Connection, spendData: SpendProfile, n: number = 3) {
  try {
    // Convert spend data to SQL-friendly format
    const spendValues = Object.entries(spendData)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `'${key}', ${value}`)
      .join(', ');

    const query = `
      WITH spend_data AS (
        SELECT * FROM (VALUES (${spendValues})) AS t(category, amount)
      ),
      card_rewards AS (
        SELECT 
          c.id,
          c.card_name,
          c.annual_fee,
          SUM(
            CASE 
              WHEN r.category = sd.category THEN sd.amount * (r.reward_rate / 100)
              ELSE 0
            END
          ) as total_rewards
        FROM cards c
        CROSS JOIN spend_data sd
        LEFT JOIN category_caps r ON c.id = r.card_id
        GROUP BY c.id, c.card_name, c.annual_fee
      )
      SELECT 
        id as card_id,
        card_name,
        total_rewards as monthly_rewards,
        0 as milestone_bonus,
        (total_rewards * 12) as annual_total
      FROM card_rewards
      ORDER BY annual_total DESC
      LIMIT ${n}
    `;

    const stmt = db.prepare(query);
    const results = stmt.all();
    stmt.finalize();
    return results;
  } catch (error) {
    console.error('Error calculating top N cards:', error);
    throw error;
  }
} 