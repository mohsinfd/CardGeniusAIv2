-- scripts/generate_reward_rules.sql

-- 1) Load staging tables from each source CSV
CREATE OR REPLACE TABLE staging_cards       AS SELECT * FROM read_csv_auto('data/Cards sheet.csv', HEADER=TRUE);
CREATE OR REPLACE TABLE staging_caps        AS SELECT * FROM read_csv_auto('data/Category Caps.csv', HEADER=TRUE);
CREATE OR REPLACE TABLE staging_base_rates  AS SELECT * FROM read_csv_auto('data/Spending Categories New.csv', HEADER=TRUE);
CREATE OR REPLACE TABLE staging_milestones  AS SELECT * FROM read_csv_auto('data/MIlestone benefits.csv', HEADER=TRUE);
CREATE OR REPLACE TABLE staging_welcome     AS SELECT * FROM read_csv_auto('data/Welcome benefits.csv', HEADER=TRUE);
CREATE OR REPLACE TABLE staging_travel      AS SELECT * FROM read_csv_auto('data/Travel Benefits.csv', HEADER=TRUE);
CREATE OR REPLACE TABLE staging_food        AS SELECT * FROM read_csv_auto('data/Food Benefits.csv', HEADER=TRUE);

-- 2) Assemble the master reward_rules fact
CREATE OR REPLACE TABLE reward_rules AS
SELECT
  br.card_id                              AS card_id,
  br.category_key                         AS internal_category,
  (caps."CB Percentage"/100.0)            AS reward_rate,
  COALESCE(caps."Category Max Cap", 9e12) AS monthly_cap,
  ms."Milestone Spend"                    AS milestone_spend,
  ms."Milestone Benefits"                 AS milestone_reward,
  w."Welcome Benefit"                     AS welcome_reward,
  t."Travel Benefit"                      AS travel_reward,
  f."Food Benefit"                        AS food_reward
FROM staging_base_rates br
JOIN staging_cards c ON c."Card ID" = br."Card ID"
LEFT JOIN staging_caps    caps ON caps."Card ID" = br."Card ID"
                          AND caps."Spending Category" = br."Category Key"
LEFT JOIN staging_milestones ms ON ms."Card ID" = br."Card ID"
LEFT JOIN staging_welcome    w  ON w."Card ID" = br."Card ID"
LEFT JOIN staging_travel     t  ON t."Card ID" = br."Card ID"
                           AND t."Category Key" = br."Category Key"
LEFT JOIN staging_food       f  ON f."Card ID" = br."Card ID"
                           AND f."Category Key" = br."Category Key";

-- 3) (Optional) Export to a single CSV for downstream tools
COPY reward_rules TO 'data/all_cards_rewards_rules_new.csv' (HEADER=TRUE);