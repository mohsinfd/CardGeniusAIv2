import * as duckdb from 'duckdb';
import { calcTopN, SpendProfile } from './calc_savings.js';

describe('calcTopN', () => {
  test('returns top card based on rewards', async () => {
    const db = new duckdb.Database(':memory:');
    const conn = new duckdb.Connection(db);

    conn.run(`
      CREATE TABLE cards (id INTEGER, card_name VARCHAR, annual_fee DECIMAL);
      CREATE TABLE category_caps (card_id INTEGER, category VARCHAR, reward_rate DECIMAL);
    `);

    conn.run(`INSERT INTO cards VALUES (1, 'Card A', 0), (2, 'Card B', 0);`);
    conn.run(`INSERT INTO category_caps VALUES (1, 'amazon_spends', 0.02), (2, 'amazon_spends', 0.01);`);

    const spend: SpendProfile = { amazon_spends: 1000 } as SpendProfile;
    const results = await calcTopN(conn, spend, 1);

    expect(results[0]).toMatchObject({ card_id: 1, card_name: 'Card A' });
    expect(results[0].annual_total).toBeCloseTo(240);
  });
});
