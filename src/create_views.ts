import { AsyncDuckDB } from '@duckdb/duckdb-wasm';

export async function createViews(db: AsyncDuckDB) {
  const conn = await db.connect();
  
  try {
    // Create a view to unpivot spending_categories and map to UserSchemaCategory names
    await conn.query(`
      CREATE OR REPLACE VIEW vw_card_category_to_reward_code_mapping AS
      WITH unpivoted_categories AS (
          SELECT 
              sc.ID, -- This is the "Spending Categories ID" from cards table
              t.UserSchemaCategory,
              t.InternalRewardCode
          FROM spending_categories sc,
          LATERAL (VALUES
              ('amazon_spends', sc."Amazon Spends"),
              ('flipkart_spends', sc."Flipkart Spends"),
              ('grocery_spends_online', sc."Grocery spends online"),
              ('dining_or_going_out', sc."Dining or going out"),
              ('fuel', sc."Fuel"),
              ('mobile_phone_bills', sc."Mobile phone bills"),
              ('utility_bills', sc."Electricity bills"),
              ('utility_bills', sc."Water bills"),
              ('travel_spends', sc."Hotels annual"),
              ('travel_spends', sc."Flights annual"),
              ('other_spends', sc."Online food ordering"),
              ('other_spends', sc."Other online spends"),
              ('other_spends', sc."Other offline spends"),
              ('other_spends', sc."School fees"),
              ('other_spends', sc."Rent"),
              ('other_spends', sc."OTT channels"),
              ('other_spends', sc."Large electronics purchase like mobile TV etc"),
              ('other_spends', sc."All pharmacy")
          ) AS t(UserSchemaCategory, InternalRewardCode)
      )
      SELECT
          uc.ID, 
          uc.UserSchemaCategory,
          uc.InternalRewardCode
      FROM unpivoted_categories uc
      WHERE uc.InternalRewardCode IS NOT NULL AND uc.InternalRewardCode <> 'no_benefit' AND uc.InternalRewardCode <> '';
    `);
    console.log('Created vw_card_category_to_reward_code_mapping view successfully');

    // Add diagnostic query for AmazonPay ICICI spending categories
    const amazonPaySpendingCategories = await conn.query(`
      SELECT 
        sc.ID,
        sc."Category Name",
        sc."Amazon Spends",
        sc."Flipkart Spends",
        sc."Grocery spends online",
        sc."Online food ordering",
        sc."Other online spends",
        sc."Other offline spends",
        sc."Dining or going out",
        sc."Fuel",
        sc."School fees",
        sc."Rent",
        sc."Mobile phone bills",
        sc."Electricity bills",
        sc."Water bills",
        sc."OTT channels",
        sc."Hotels annual",
        sc."Flights annual",
        sc."Insurance health annual",
        sc."Insurance car or bike annual",
        sc."Large electronics purchase like mobile TV etc",
        sc."All pharmacy"
      FROM spending_categories sc
      WHERE sc."Category Name" = 'ICICI APCC'
    `);
    console.log('[create_views.ts] AmazonPay ICICI spending categories:', JSON.stringify(amazonPaySpendingCategories.toArray().map(row => row.toJSON()), (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));

    // Add diagnostic query for icici_5P in category_caps
    const icici5PDiagnostic = await conn.query(`
      SELECT 
        "Spending Category",
        "CB Percentage",
        "Category Max Cap",
        "Category Max Points",
        "RP1",
        "Spend Conversion"
      FROM category_caps
      WHERE "Spending Category" = 'icici_5P'
    `);
    console.log('[create_views.ts] icici_5P category caps:', JSON.stringify(icici5PDiagnostic.toArray().map(row => row.toJSON()), (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));

    // Create the main reward_rules table
    await conn.query(`
      CREATE OR REPLACE TABLE reward_rules AS
      SELECT
        c.ID as card_id,
        c."Card Name" as card_name,
        map.UserSchemaCategory AS internal_category, -- This is now 'flipkart_spends', 'amazon_spends', etc.
        map.InternalRewardCode AS internal_reward_code, -- This is 'amex_1RP', 'axis_5P', etc.
        
        -- Fields from category_caps, joined on internal_reward_code
        cc."CB Percentage" AS cb_percentage,
        COALESCE(cc."Total Max Cap", 9e18) AS total_max_cap, -- Increased precision for large numbers
        COALESCE(cc."Category Max Cap", 9e18) AS category_max_cap,
        cc.RP1,
        COALESCE(cc."Spend Conversion", 1) AS spend_conversion, -- Default to 1 if NULL to avoid div by zero
        cc.RP2,
        cc."Threshold 2" AS threshold_2,
        cc.RP3,
        cc."Threshold 3" AS threshold_3,
        COALESCE(cc."Category Max Points", 9e18) AS category_max_points,
        COALESCE(cc."Total Max Points", 9e18) AS total_max_points,
        COALESCE(cc."Cash Conversion", 0) AS cash_conversion, -- Default to 0
        COALESCE(cc."Other Conversion", 0) AS other_conversion, -- Default to 0
        
        -- Benefit descriptions
        mb_agg."Benefit Description" AS milestone_benefit_desc,
        wb_agg."Benefit Description" AS welcome_benefit_desc,
        tb_agg."Benefit Description" AS travel_benefit_desc,
        fb_agg."Benefit Description" AS food_benefit_desc
        
      FROM cards c
      JOIN vw_card_category_to_reward_code_mapping map ON c."Spending Categories ID" = map.ID
      LEFT JOIN category_caps cc ON map.InternalRewardCode = cc."Spending Category"
      
      -- Aggregate benefits to avoid row duplication if a card has multiple of the same benefit type
      LEFT JOIN (SELECT "Card ID", string_agg("Benefit Description", '; ') AS "Benefit Description" FROM milestone_benefits GROUP BY "Card ID") mb_agg ON c.ID = mb_agg."Card ID"
      LEFT JOIN (SELECT "Card ID", string_agg("Benefit Description", '; ') AS "Benefit Description" FROM welcome_benefits GROUP BY "Card ID") wb_agg ON c.ID = wb_agg."Card ID"
      LEFT JOIN (SELECT "Card ID", string_agg("Benefit Description", '; ') AS "Benefit Description" FROM travel_benefits GROUP BY "Card ID") tb_agg ON c.ID = tb_agg."Card ID"
      LEFT JOIN (SELECT "Card ID", string_agg("Benefit Description", '; ') AS "Benefit Description" FROM food_benefits GROUP BY "Card ID") fb_agg ON c.ID = fb_agg."Card ID";
    `);
    console.log('Created reward_rules table successfully');

    // Add diagnostic query for AmazonPay ICICI
    const amazonPayDiagnostic = await conn.query(`
      SELECT 
        c."Card Name",
        map.UserSchemaCategory,
        map.InternalRewardCode,
        cc."CB Percentage",
        cc."Category Max Cap",
        cc.RP1,
        cc."Spend Conversion"
      FROM cards c
      JOIN vw_card_category_to_reward_code_mapping map ON c."Spending Categories ID" = map.ID
      LEFT JOIN category_caps cc ON map.InternalRewardCode = cc."Spending Category"
      WHERE c."Card Name" = 'ICICI Amazon Pay Credit Card'
        AND map.UserSchemaCategory = 'amazon_spends'
    `);
    console.log('[create_views.ts] AmazonPay ICICI diagnostic:', JSON.stringify(amazonPayDiagnostic.toArray().map(row => row.toJSON()), (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));

    // Create view for easy access to category-specific rewards for calculations
    await conn.query(`
      CREATE OR REPLACE VIEW vw_rewards_by_category AS
      SELECT
        card_id,
        card_name,
        internal_category, -- This is the UserSchemaCategory like 'flipkart_spends'
        internal_reward_code,
        cb_percentage,
        total_max_cap,
        category_max_cap,
        RP1,
        spend_conversion,
        RP2,
        threshold_2,
        RP3,
        threshold_3,
        category_max_points,
        total_max_points,
        cash_conversion,
        other_conversion
        -- Note: Benefit descriptions are intentionally excluded here as they are per-card, not per-category.
        -- They should be fetched once per card if needed by calc_savings.ts from the reward_rules table.
      FROM reward_rules;
    `);
    console.log('Created vw_rewards_by_category view successfully');

    // Placeholder for milestone bonuses view - needs to be reviewed based on how amounts are stored.
    // The current calc_savings.ts expects flat bonus amounts from the main cardData.bonuses object,
    // which would be derived from the descriptions in reward_rules or separate numeric columns if available.
    await conn.query(`
      CREATE OR REPLACE VIEW vw_milestone_bonuses AS
      SELECT
        mb."Card ID" as card_id,
        mb."Benefit Description" AS milestone_benefit_description
        -- Placeholder: Add actual milestone_spend and milestone_reward columns
        -- e.g., mb."Milestone Spend" AS milestone_spend, mb."Milestone Reward" AS milestone_reward
      FROM milestone_benefits mb;
    `);
    console.log('Created vw_milestone_bonuses view successfully (placeholder - review structure)');
    
    // Commenting out old views as they are superseded or incorrect with the new model
    /*
    await conn.query(`
      CREATE OR REPLACE VIEW joined_view AS
      SELECT c.ID as card_id,
             sc.Category as category, // This was problematic
             sc."Reward Rate" as reward_rate, // This column doesn't exist in the new spending_categories
             COALESCE(cc."Category Max Cap", 9e12) AS monthly_cap
      FROM   cards c
      JOIN   spending_categories sc ON c."Spending Categories ID" = sc.ID
      LEFT   JOIN category_caps cc ON c.ID = cc."Card ID" AND sc.Category = cc."Spending Category" // Problematic join
      LEFT   JOIN travel_benefits r ON c.ID = r."Card ID";
    `);
    console.log('Old joined_view (now commented out)');
    
    await conn.query(`
      CREATE OR REPLACE VIEW card_rewards AS
      SELECT 
        c.ID as card_id,
        c."Card Name" as card_name,
        REPLACE(LOWER(sc.Category), ' ', '_') as category, // Problematic source
        sc."Reward Rate" as reward_rate, // Non-existent column
        COALESCE(cc."Category Max Cap\", 9e12) AS max_rewards
      FROM cards c
      CROSS JOIN spending_categories sc // CROSS JOIN was likely not intended for detailed rules
      LEFT JOIN category_caps cc ON c.ID = cc."Card ID" AND sc.Category = cc."Spending Category" // Problematic join
    `);
    console.log('Old card_rewards (now commented out)');
    */
    
  } finally {
    await conn.close();
  }
} 