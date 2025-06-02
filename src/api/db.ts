import * as duckdb from 'duckdb';

export async function initDB() {
  try {
    // Create a new database instance
    const db = new duckdb.Database(':memory:'); // Use in-memory database for simplicity
    
    // Create a connection
    const conn = new duckdb.Connection(db);
    
    // Initialize tables
    conn.run(`
      CREATE TABLE IF NOT EXISTS cards (
        id INTEGER PRIMARY KEY,
        card_name VARCHAR,
        annual_fee DECIMAL,
        welcome_benefit VARCHAR,
        milestone_benefit VARCHAR,
        travel_benefit VARCHAR
      );

      CREATE TABLE IF NOT EXISTS welcome_benefits (
        id INTEGER PRIMARY KEY,
        card_id INTEGER,
        benefit VARCHAR,
        FOREIGN KEY (card_id) REFERENCES cards(id)
      );

      CREATE TABLE IF NOT EXISTS milestone_benefits (
        id INTEGER PRIMARY KEY,
        card_id INTEGER,
        benefit VARCHAR,
        FOREIGN KEY (card_id) REFERENCES cards(id)
      );

      CREATE TABLE IF NOT EXISTS travel_benefits (
        id INTEGER PRIMARY KEY,
        card_id INTEGER,
        benefit VARCHAR,
        FOREIGN KEY (card_id) REFERENCES cards(id)
      );

      CREATE TABLE IF NOT EXISTS category_map (
        id INTEGER PRIMARY KEY,
        category VARCHAR,
        priority INTEGER
      );
    `);

    return conn;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
} 