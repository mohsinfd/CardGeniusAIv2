import { AsyncDuckDB } from '@duckdb/duckdb-wasm';

async function loadCSVFile(filename: string): Promise<string> {
  const response = await fetch(`/${filename}`);
  if (!response.ok) {
    throw new Error(`Failed to load ${filename}: ${response.statusText}`);
  }
  return await response.text();
}

export async function importCSVFiles(db: AsyncDuckDB) {
  const conn = await db.connect();

  try {
    // Install and load HTTPFS extension
    await conn.query('INSTALL httpfs');
    await conn.query('LOAD httpfs');

    // Create tables with proper data types first
    await conn.query(`
      CREATE TABLE IF NOT EXISTS cards (
        ID BIGINT,
        "Card Name" VARCHAR,
        "Bank ID" BIGINT,
        "Spending Categories ID" BIGINT,
        "Joining Fees" DECIMAL(18,2),
        "Annual Fees" DECIMAL(18,2),
        "Joining Waiver Threshold" DECIMAL(18,2),
        "Annual Fee Waiver Threshold" DECIMAL(18,2),
        Tags VARCHAR,
        Type VARCHAR
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS category_caps (
        ID BIGINT, 
        "Card ID" BIGINT,
        "Spending Category" VARCHAR,
        "CB Percentage" DECIMAL(10,2),
        "Total Max Cap" DECIMAL(18,2),
        "Category Max Cap" DECIMAL(18,2),
        RP1 DECIMAL(10,2),
        "Spend Conversion" DECIMAL(18,2),
        RP2 DECIMAL(10,2),
        "Threshold 2" DECIMAL(18,2),
        RP3 DECIMAL(10,2),
        "Threshold 3" DECIMAL(18,2),
        "Category Max Points" DECIMAL(18,2),
        "Total Max Points" DECIMAL(18,2),
        "Cash Conversion" DECIMAL(10,4),
        "Other Conversion" DECIMAL(10,4)
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS spending_categories (
        ID BIGINT,
        "Category Name" VARCHAR,
        "Flipkart Spends" VARCHAR,
        "Amazon Spends" VARCHAR,
        "Grocery spends online" VARCHAR,
        "Online food ordering" VARCHAR,
        "Other online spends" VARCHAR,
        "Other offline spends" VARCHAR,
        "Dining or going out" VARCHAR,
        "Fuel" VARCHAR,
        "School fees" VARCHAR,
        "Rent" VARCHAR,
        "Mobile phone bills" VARCHAR,
        "Electricity bills" VARCHAR,
        "Water bills" VARCHAR,
        "OTT channels" VARCHAR,
        "New monthly category 1" VARCHAR,
        "New monthly category 2" VARCHAR,
        "New monthly category 3" VARCHAR,
        "Hotels annual" VARCHAR,
        "Flights annual" VARCHAR,
        "Insurance health annual" VARCHAR,
        "Insurance car or bike annual" VARCHAR,
        "Large electronics purchase like mobile TV etc" VARCHAR,
        "All pharmacy" VARCHAR,
        "New category 1" VARCHAR,
        "New category 2" VARCHAR,
        "New category 3" VARCHAR
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS welcome_benefits (
        "Card ID" BIGINT,
        "Benefit Description" VARCHAR
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS food_benefits (
        "Card ID" BIGINT,
        "Benefit Description" VARCHAR
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS travel_benefits (
        "Card ID" BIGINT,
        "Benefit Description" VARCHAR
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS milestone_benefits (
        "Card ID" BIGINT,
        "Benefit Description" VARCHAR
      )
    `);

    // Load data using HTTPFS, with robust parsing options
    const opts_cards_etc = `(HEADER, DELIM ',', QUOTE '"', IGNORE_ERRORS, NULL_PADDING)`;
    // Explicit column types for category_caps - rely on CREATE TABLE definition
    const opts_category_caps = `(HEADER, DELIM ',', QUOTE '"', NULL_PADDING, AUTO_DETECT FALSE)`;
    const baseUrl = 'http://localhost:3000';
    
    await conn.query(`
      COPY cards FROM '${baseUrl}/Cards sheet.csv' ${opts_cards_etc}
    `);

    await conn.query(`
      COPY category_caps FROM '${baseUrl}/Category Caps.csv' ${opts_category_caps}
    `);

    await conn.query(`
      COPY spending_categories FROM '${baseUrl}/Spending Categories New.csv' ${opts_cards_etc}
    `);

    await conn.query(`
      COPY welcome_benefits FROM '${baseUrl}/Welcome benefits.csv' ${opts_cards_etc}
    `);

    await conn.query(`
      COPY food_benefits FROM '${baseUrl}/Food Benefits.csv' ${opts_cards_etc}
    `);

    await conn.query(`
      COPY travel_benefits FROM '${baseUrl}/Travel Benefits.csv' ${opts_cards_etc}
    `);

    await conn.query(`
      COPY milestone_benefits FROM '${baseUrl}/MIlestone benefits.csv' ${opts_cards_etc}
    `);

    console.log('Successfully imported all CSV files');

    // STEP 2: TEMPORARY DIAGNOSTIC - Import raw 'category_max_cap' as TEXT
    try {
      await conn.query(`DROP TABLE IF EXISTS tmp_caps;`); // Ensure clean state
      await conn.query(`
        CREATE OR REPLACE TABLE tmp_caps AS
        SELECT *
        FROM read_csv_auto(
          '${baseUrl}/Category Caps.csv',
          HEADER=TRUE,
          DELIM=',',
          QUOTE='"',
          NULL_PADDING=TRUE
        )
      `);
      // Try to select specific columns, casting ID to BIGINT for the WHERE clause
      // and reading "Category Max Cap" as whatever type read_csv_auto infers (likely VARCHAR due to mixed data or quotes)
      const tempDiagnosticResult = await conn.query(`
        SELECT 
          CAST(ID AS BIGINT) AS ID_bigint, 
          "Card ID" AS Card_ID_text, 
          "Spending Category" AS Spending_Category_text, 
          "Category Max Cap" AS Category_Max_Cap_text
        FROM tmp_caps
        WHERE CAST(ID AS BIGINT) = 54
      `);
      console.log('[import_data.ts TEMP DIAGNOSTIC STEP 2] Raw data for ID 54 from tmp_caps:', JSON.stringify(tempDiagnosticResult.toArray().map(row => row.toJSON()), null, 2));
      await conn.query('DROP TABLE tmp_caps;');
    } catch (e: any) { // Specify 'any' or 'unknown' for 'e' and then access 'message'
      console.error('[import_data.ts TEMP DIAGNOSTIC STEP 2] Error:', e.message ? e.message : e);
    }
    // END STEP 2 TEMPORARY DIAGNOSTIC

    // Existing Diagnostic query for all HDFC Millenia rules
    const diagnosticResult = await conn.query(`
      SELECT "Spending Category", "CB Percentage", "Category Max Cap", "Category Max Points", "ID", "RP1", "Spend Conversion"
      FROM category_caps 
      WHERE "Card ID" = 24
    `);
    console.log('[import_data.ts] All rules for HDFC Millenia (Card ID 24) from category_caps table:', JSON.stringify(diagnosticResult.toArray().map(row => row.toJSON()), (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));

    // New diagnostic for specific rule ID = '54' (hdfc_5P)
    const rule54Result = await conn.query(`SELECT "Category Max Cap" FROM category_caps WHERE "ID" = '54'`);
    if (rule54Result.numRows > 0) {
      const rule54Array = rule54Result.toArray();
      // Assuming the toJSON() method correctly represents the data from the DB for this field
      const capValue = rule54Array[0].toJSON()["Category Max Cap"];
      console.log(`[import_data.ts] Rule ID '54' (hdfc_5P) "Category Max Cap" - Value: ${capValue}, Typeof: ${typeof capValue}`);
    } else {
      console.log("[import_data.ts] Rule ID '54' (hdfc_5P) not found.");
    }

    // New diagnostic to find any rule for Card ID 24 with a cap of 1500
    const cap1500Result = await conn.query(`
      SELECT "ID", "Spending Category", "Category Max Cap", "Total Max Cap"
      FROM category_caps
      WHERE "Card ID" = 24 AND 
            (TRY_CAST("Category Max Cap" AS DECIMAL(18,2)) = 1500 OR
             TRY_CAST("Total Max Cap" AS DECIMAL(18,2)) = 1500)
    `);
    console.log('[import_data.ts] Rules for HDFC Millenia (Card ID 24) potentially having a 1500 cap (Category or Total, using TRY_CAST):', JSON.stringify(cap1500Result.toArray().map(row => row.toJSON()), (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));

  } catch (error) {
    console.error('Error importing CSV files:', error);
    throw error;
  } finally {
    await conn.close();
  }
} 