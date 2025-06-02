import * as duckdb from '@duckdb/duckdb-wasm';

function customJSONStringify(obj: any): string {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    if (value instanceof Map) {
      return Object.fromEntries(value);
    }
    if (value instanceof Set) {
      return Array.from(value);
    }
    return value;
  }, 2);
}

async function fetchCSV(url: string, retries = 3): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`[import_data] Fetching CSV from ${url} (attempt ${i + 1}/${retries})`);
      const response = await fetch(url, {
        headers: {
          'Accept': 'text/csv',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[import_data] Failed to fetch ${url}: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
      }
      
      const text = await response.text();
      console.log(`[import_data] Successfully fetched ${url}`);
      return text;
    } catch (error) {
      console.error(`[import_data] Error fetching ${url} (attempt ${i + 1}/${retries}):`, error);
      if (i === retries - 1) throw error;
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error(`Failed to fetch ${url} after ${retries} attempts`);
}

export async function importCSVFiles(db: duckdb.AsyncDuckDB) {
  try {
    // Get a connection
    const conn = await db.connect();
    console.log('[import_data] Connected to DuckDB');

    // Create tables with proper data types first
    await conn.query(`CREATE TABLE IF NOT EXISTS cards (ID BIGINT, "Card Name" VARCHAR, "Bank ID" BIGINT, "Spending Categories ID" BIGINT, "Joining Fees" DECIMAL(18,2), "Annual Fees" DECIMAL(18,2), "Joining Waiver Threshold" DECIMAL(18,2), "Annual Fee Waiver Threshold" DECIMAL(18,2), Tags VARCHAR, Type VARCHAR)`);
    await conn.query(`CREATE TABLE IF NOT EXISTS category_caps (ID BIGINT, "Card ID" BIGINT, "Spending Category" VARCHAR, "CB Percentage" DECIMAL(10,2), "Total Max Cap" DECIMAL(18,2), "Category Max Cap" DECIMAL(18,2), RP1 DECIMAL(10,2), "Spend Conversion" DECIMAL(18,2), RP2 DECIMAL(10,2), "Threshold 2" DECIMAL(18,2), RP3 DECIMAL(10,2), "Threshold 3" DECIMAL(18,2), "Category Max Points" DECIMAL(18,2), "Total Max Points" DECIMAL(18,2), "Cash Conversion" DECIMAL(10,4), "Other Conversion" DECIMAL(10,4))`);
    await conn.query(`CREATE TABLE IF NOT EXISTS spending_categories (ID BIGINT, "Category Name" VARCHAR, "Flipkart Spends" VARCHAR, "Amazon Spends" VARCHAR, "Grocery spends online" VARCHAR, "Online food ordering" VARCHAR, "Other online spends" VARCHAR, "Other offline spends" VARCHAR, "Dining or going out" VARCHAR, "Fuel" VARCHAR, "School fees" VARCHAR, "Rent" VARCHAR, "Mobile phone bills" VARCHAR, "Electricity bills" VARCHAR, "Water bills" VARCHAR, "OTT channels" VARCHAR, "New monthly category 1" VARCHAR, "New monthly category 2" VARCHAR, "New monthly category 3" VARCHAR, "Hotels annual" VARCHAR, "Flights annual" VARCHAR, "Insurance health annual" VARCHAR, "Insurance car or bike annual" VARCHAR, "Large electronics purchase like mobile TV etc" VARCHAR, "All pharmacy" VARCHAR, "New category 1" VARCHAR, "New category 2" VARCHAR, "New category 3" VARCHAR)`);
    await conn.query(`CREATE TABLE IF NOT EXISTS welcome_benefits ("Card ID" BIGINT, "Benefit Description" VARCHAR)`);
    await conn.query(`CREATE TABLE IF NOT EXISTS food_benefits ("Card ID" BIGINT, "Benefit Description" VARCHAR)`);
    await conn.query(`CREATE TABLE IF NOT EXISTS travel_benefits ("Card ID" BIGINT, "Benefit Description" VARCHAR)`);
    await conn.query(`CREATE TABLE IF NOT EXISTS milestone_benefits ("Card ID" BIGINT, "Benefit Description" VARCHAR)`);
    console.log('[import_data] Created all tables');

    // Load data using fetch and COPY command
    const files = [
      { name: 'cards', path: '/data/Cards sheet.csv' },
      { name: 'category_caps', path: '/data/Category Caps.csv' },
      { name: 'spending_categories', path: '/data/Spending Categories New.csv' },
      { name: 'welcome_benefits', path: '/data/Welcome benefits.csv' },
      { name: 'food_benefits', path: '/data/Food Benefits.csv' },
      { name: 'travel_benefits', path: '/data/Travel Benefits.csv' },
      { name: 'milestone_benefits', path: '/data/MIlestone benefits.csv' }
    ];

    for (const file of files) {
      try {
        console.log(`[import_data] Starting import of ${file.name}`);
        const csvContent = await fetchCSV(file.path);
        console.log(`[import_data] Fetched ${file.name}, content length: ${csvContent.length}`);
        
        // Create a temporary table for the CSV content
        const tempTableName = `temp_${file.name}`;
        await conn.query(`CREATE TABLE ${tempTableName} AS SELECT * FROM read_csv_auto(?)`, [csvContent]);
        
        // Copy data to the main table
        await conn.query(`INSERT INTO ${file.name} SELECT * FROM ${tempTableName}`);
        
        // Drop the temporary table
        await conn.query(`DROP TABLE ${tempTableName}`);
        
        console.log(`[import_data] Successfully imported ${file.name}`);
      } catch (error) {
        console.error(`[import_data] Error importing ${file.name}:`, error);
        throw error;
      }
    }

    console.log('[import_data] Successfully imported all CSV files');

    // Close the connection
    await conn.close();
    console.log('[import_data] Closed DuckDB connection');

  } catch (error) {
    console.error('[import_data] Error importing CSV files:', error);
    throw error;
  }
} 