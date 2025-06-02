import express, { Express, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import * as duckdb from '@duckdb/duckdb-wasm';
import { initDB } from './db';
import { calcTopN } from '../calc_savings';
import { SpendSchema } from '../calc_savings';
import { z } from 'zod';

dotenv.config();

const app: Express = express();
const port = process.env.MCP_SERVER_PORT || 3001;

// Initialize DuckDB
let db: duckdb.AsyncDuckDB | null = null;

const initializeDatabase = async () => {
  console.log('[MCP Server/DB]: Initializing database...');
  try {
    db = await initDB();
    console.log('DuckDB initialized successfully');

    // Read and execute the ETL script
    const etlScriptPath = path.join(__dirname, '../../scripts/generate_reward_rules.sql');
    const etlScript = fs.readFileSync(etlScriptPath, 'utf8');

    console.log('[MCP Server/DB]: Executing ETL script...');
    await db.query(etlScript);
    console.log('[MCP Server/DB]: ETL script executed successfully.');

    // Load category map
    const categoryMapPath = path.join(__dirname, '../../data/Spending Categories New.csv');
    console.log(`[MCP Server/DB]: Loading category_map from ${categoryMapPath}`);
    await db.query(`CREATE TABLE IF NOT EXISTS category_map AS SELECT * FROM read_csv_auto('${categoryMapPath}', HEADER=TRUE)`);
    console.log('[MCP Server/DB]: Successfully loaded category_map.');
    console.log('[MCP Server/DB]: Database initialized successfully.');
  } catch (error) {
    console.error('[MCP Server/DB]: Error initializing database:', error);
    throw error;
  }
};

app.use(cors());
app.use(express.json());

// Serve CSV files from the data directory
app.get('/data/:filename', (req: Request, res: Response) => {
  const filename = req.params.filename;
  const filePath = path.resolve(__dirname, '../../data', filename);
  
  console.log(`[MCP Server/API]: Serving CSV file: ${filename}`);
  console.log(`[MCP Server/API]: File path: ${filePath}`);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.error(`[MCP Server/API]: File not found: ${filePath}`);
    return res.status(404).json({ error: 'File not found' });
  }

  try {
    // Set appropriate headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.on('error', (error) => {
      console.error(`[MCP Server/API]: Error streaming file ${filename}:`, error);
      res.status(500).json({ error: 'Error streaming file' });
    });
    fileStream.pipe(res);
  } catch (error) {
    console.error(`[MCP Server/API]: Error serving file ${filename}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/healthz', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Helper to wrap async route handlers
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return function (req: Request, res: Response, next: NextFunction) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Calculate savings endpoint
app.post('/calculate-savings', asyncHandler(async (req, res) => {
  if (!db) {
    return res.status(500).json({ error: 'Database not initialized' });
  }
  try {
    const spendData = SpendSchema.parse(req.body);
    const recommendations = await calcTopN(db, spendData, 3);
    res.json(recommendations);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid spend data', details: error.errors });
    } else {
      console.error('Error calculating savings:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}));

// Get card facts endpoint
app.get('/card_facts', asyncHandler(async (req, res) => {
  if (!db) {
    return res.status(500).json({ error: 'Database not initialized' });
  }
  try {
    const { card_name } = req.query;
    if (!card_name) {
      res.status(400).send({ error: 'card_name is required' });
      return;
    }
    const query = `
      SELECT 
        c.*,
        wb.benefit as welcome_benefit,
        mb.benefit as milestone_benefit,
        tb.benefit as travel_benefit
      FROM cards c
      LEFT JOIN welcome_benefits wb ON c.id = wb.card_id
      LEFT JOIN milestone_benefits mb ON c.id = mb.card_id
      LEFT JOIN travel_benefits tb ON c.id = tb.card_id
      WHERE c.card_name = ?
    `;
    const results = await db.query(query, [card_name]);
    const rows = await results.toArray();
    res.json(rows.length > 0 ? rows[0] : { error: 'Card not found' });
  } catch (error) {
    console.error('[MCP Server/API]: Error in card_facts:', error);
    res.status(500).send({ error: 'Internal server error' });
  }
}));

// Suggest categories endpoint
app.get('/suggest_categories', asyncHandler(async (req, res) => {
  if (!db) {
    return res.status(500).json({ error: 'Database not initialized' });
  }
  try {
    const { asked } = req.query;
    const askedCategories = asked ? (asked as string).split(',') : [];
    const query = `
      SELECT DISTINCT category
      FROM category_map
      WHERE category NOT IN (${askedCategories.map(() => '?').join(',') || "''"})
      ORDER BY priority DESC
      LIMIT 1
    `;
    const results = await db.query(query, askedCategories);
    const rows = await results.toArray();
    res.json(rows.length > 0 ? rows[0] : { category: null });
  } catch (error) {
    console.error('[MCP Server/API]: Error in suggest_categories:', error);
    res.status(500).send({ error: 'Internal server error' });
  }
}));

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'CardGenius API is running' });
});

app.get('/api/card/:name', async (req: Request, res: Response) => {
  try {
    const { name: card_name } = req.params;
    if (!db) {
      res.status(500).json({ error: 'Database not initialized' });
      return;
    }
    const query = `
      SELECT 
        c.ID,
        c."Card Name" as card_name,
        c."Joining Fees" as joining_fee,
        c."Annual Fees" as annual_fee,
        c."Joining Waiver Threshold" as joining_waiver,
        c."Annual Fee Waiver Threshold" as annual_waiver,
        c.Tags,
        c.Type
      FROM cards c
      WHERE c."Card Name" = ?
    `;
    const stmt = db.prepare(query);
    stmt.all(card_name, (err: Error | null, rows: any[]) => {
      stmt.finalize();
      if (err) {
        res.status(500).json({ error: 'Database error', details: err.message });
      } else {
        res.json(rows.length > 0 ? rows[0] : { error: 'Card not found' });
      }
    });
  } catch (error) {
    console.error('Error fetching card details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/next-category', async (req: Request, res: Response) => {
  try {
    const { asked } = req.query;
    const askedCategories = asked ? (asked as string).split(',') : [];
    if (!db) {
      res.status(500).json({ error: 'Database not initialized' });
      return;
    }
    const query = `
      SELECT DISTINCT category
      FROM category_map
      WHERE category NOT IN (${askedCategories.map(() => '?').join(',')})
      ORDER BY category
      LIMIT 1
    `;
    const stmt = db.prepare(query);
    stmt.all(...askedCategories, (err: Error | null, rows: any[]) => {
      stmt.finalize();
      if (err) {
        res.status(500).json({ error: 'Database error', details: err.message });
      } else {
        res.json(rows.length > 0 ? rows[0] : { category: null });
      }
    });
  } catch (error) {
    console.error('Error fetching next category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server after DB initialization
initializeDatabase().then(() => {
  app.listen(port, () => {
    console.log(`⚡️[MCP Server]: Server is running at http://localhost:${port}`);
  });
}).catch(error => {
  console.error("Failed to initialize database and start server:", error);
  process.exit(1);
});

export default app; 