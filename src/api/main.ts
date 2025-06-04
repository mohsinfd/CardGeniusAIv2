import express, { Express, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initDB, getConnection } from './db.js';
import { calcTopN } from '../calc_savings.js';
import { SpendSchema } from '../calc_savings.js';
import { z } from 'zod';
import * as fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app: Express = express();
const port = process.env.MCP_SERVER_PORT || 3001;

// Initialize database
const initializeDatabase = async () => {
  console.log('[MCP Server/DB]: Initializing database...');
  try {
    const connection = await initDB();
    console.log('DuckDB initialized successfully');

    // Read and execute the ETL script
    const etlScriptPath = join(__dirname, '../../scripts/generate_reward_rules.sql');
    const etlScript = await import('fs').then(fs => fs.readFileSync(etlScriptPath, 'utf8'));

    console.log('[MCP Server/DB]: Executing ETL script...');
    await connection.run(etlScript);
    console.log('[MCP Server/DB]: ETL script executed successfully.');

    // Load category map
    const categoryMapPath = join(__dirname, '../../data/Spending Categories New.csv');
    console.log(`[MCP Server/DB]: Loading category_map from ${categoryMapPath}`);
    await connection.run(`CREATE TABLE IF NOT EXISTS category_map AS SELECT * FROM read_csv_auto('${categoryMapPath}', HEADER=TRUE)`);
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
  const filePath = join(__dirname, '../../data', filename);
  
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
    fileStream.on('error', (error: Error) => {
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
  try {
    const spendData = SpendSchema.parse(req.body);
    const connection = await getConnection();
    const recommendations = await calcTopN(connection, spendData, 3);
    res.json(recommendations);
  } catch (error: unknown) {
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
  try {
    const { card_name } = req.query;
    if (!card_name) {
      res.status(400).send({ error: 'card_name is required' });
      return;
    }
    const connection = await getConnection();
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
    const results = await connection.all(query, [card_name]);
    res.json(results.length > 0 ? results[0] : { error: 'Card not found' });
  } catch (error) {
    console.error('[MCP Server/API]: Error in card_facts:', error);
    res.status(500).send({ error: 'Internal server error' });
  }
}));

// Suggest categories endpoint
app.get('/suggest_categories', asyncHandler(async (req, res) => {
  try {
    const { asked } = req.query;
    const askedCategories = asked ? (asked as string).split(',') : [];
    const connection = await getConnection();
    const query = `
      SELECT DISTINCT category
      FROM category_map
      WHERE category NOT IN (${askedCategories.map(() => '?').join(',') || "''"})
      ORDER BY priority DESC
      LIMIT 1
    `;
    const results = await connection.all(query, askedCategories);
    res.json(results.length > 0 ? results[0] : { category: null });
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
    const connection = await getConnection();
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
    const results = await connection.all(query, [card_name]);
    const rows = results.toArray();
    res.json(rows.length > 0 ? rows[0] : { error: 'Card not found' });
  } catch (error) {
    console.error('Error fetching card details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/next-category', async (req: Request, res: Response) => {
  try {
    const { asked } = req.query;
    const askedCategories = asked ? (asked as string).split(',') : [];
    const connection = await getConnection();
    const query = `
      SELECT DISTINCT category
      FROM category_map
      WHERE category NOT IN (${askedCategories.map(() => '?').join(',')})
      ORDER BY category
      LIMIT 1
    `;
    const results = await connection.all(query, askedCategories);
    const rows = results.toArray();
    res.json(rows.length > 0 ? rows[0] : { category: null });
  } catch (error) {
    console.error('Error fetching next category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// serve CSVs for the front-end, if needed
app.use('/csv', express.static(join(__dirname, 'data')));

// -------- CHAT-LIKE CARD LOOKUP ENDPOINT --------
app.post('/api/card', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const connection = await getConnection();
    const results = await connection.all(`
      SELECT * FROM cards 
      WHERE card_name LIKE '%${prompt}%'
      OR welcome_benefit LIKE '%${prompt}%'
      OR milestone_benefit LIKE '%${prompt}%'
      OR travel_benefit LIKE '%${prompt}%'
    `);

    res.json(results.length > 0 ? results[0] : { error: 'Card not found' });
  } catch (error) {
    console.error('Error processing card query:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/card/:id', async (req: Request, res: Response) => {
  try {
    const connection = await getConnection();
    const results = await connection.all(
      `SELECT * FROM cards WHERE id = ?`,
      [req.params.id]
    );
    
    if (results && results.length > 0) {
      res.json(results[0]);
    } else {
      res.status(404).json({ error: 'Card not found' });
    }
  } catch (error) {
    console.error('Error fetching card:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/category/:name', async (req: Request, res: Response) => {
  try {
    const connection = await getConnection();
    const results = await connection.all(
      `SELECT * FROM category_map WHERE "Category Name" = ?`,
      [req.params.name]
    );
    
    if (results && results.length > 0) {
      res.json(results[0]);
    } else {
      res.json({ category: null });
    }
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/card/:id/rewards', async (req: Request, res: Response) => {
  try {
    const spendData = SpendSchema.parse(req.body);
    const connection = await getConnection();
    const results = await calcTopN(connection, spendData, 1);
    res.json(results);
  } catch (error) {
    console.error('Error calculating rewards:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/analyze', async (req: Request, res: Response) => {
  try {
    const { spendingProfile, conversationHistory } = req.body;
    const connection = await getConnection();

    // Ensure spendingProfile is an object, even if empty
    const currentSpendingProfile = spendingProfile || {};

    const spendingEntries = Object.entries(currentSpendingProfile);
    const spendingValuesClause = spendingEntries.length > 0 ?
      `FROM (VALUES ${spendingEntries.map(([cat, amt]) => `('${cat}', ${amt})`).join(',')}) as t(category, amount)` :
      'FROM (SELECT NULL as category, NULL as amount WHERE 1=0) as t'; // Empty set if no spending

    const spendingAnalysis = await connection.all(`
      WITH spending_analysis AS (
        SELECT 
          category,
          amount,
          CASE 
            WHEN amount > 50000 THEN 'high'
            WHEN amount > 20000 THEN 'medium'
            ELSE 'low'
          END as spend_level
        ${spendingValuesClause}
      )
      SELECT 
        spend_level,
        COUNT(category) as category_count, -- COUNT(category) instead of COUNT(*) to handle empty set
        COALESCE(SUM(amount), 0) as total_spend -- COALESCE for SUM on potentially empty set
      FROM spending_analysis
      GROUP BY spend_level
    `);

    const preferences = extractPreferencesFromContext(conversationHistory);
    const preferencesCondition = preferences.length > 0 ?
      preferences.map(p => `cb.tags LIKE '%${p}%'`).join(' OR ') :
      '1=1'; // Select all cards if no preferences

    const eligibilityCondition = spendingEntries.length > 0 ?
      spendingEntries.map(([cat, amt]) => `('${cat}' = cb.benefit_type AND ${amt} >= cb.min_spend)`).join(' OR ') :
      '1=0'; // Not eligible if no spending to match against

    let matchingCardsQueryResults = await connection.all(`
      WITH card_benefits AS (
        SELECT 
          c.*,
          b.benefit_type,
          b.benefit_value,
          b.min_spend,
          b.max_reward
        FROM cards c
        LEFT JOIN benefits b ON c.id = b.card_id
      )
      SELECT DISTINCT
        cb.*,
        CASE 
          WHEN ${eligibilityCondition}
          THEN 'eligible'
          ELSE 'not_eligible'
        END as eligibility
      FROM card_benefits cb
      WHERE ${preferencesCondition}
    `);

    let processedMatchingCards: any[];
    if (matchingCardsQueryResults && typeof matchingCardsQueryResults.toArray === 'function') {
      console.log('[MCP Server/API DEBUG]: matchingCardsQueryResults has toArray. Calling toArray().');
      processedMatchingCards = matchingCardsQueryResults.toArray();
      console.log('[MCP Server/API DEBUG]: Value of processedMatchingCards after toArray():', JSON.stringify(processedMatchingCards));
      console.log('[MCP Server/API DEBUG]: Is processedMatchingCards an array after toArray()?', Array.isArray(processedMatchingCards));
    } else if (Array.isArray(matchingCardsQueryResults)) {
      console.log('[MCP Server/API DEBUG]: matchingCardsQueryResults is Array.isArray true. Assigning directly.');
      processedMatchingCards = matchingCardsQueryResults;
      console.log('[MCP Server/API DEBUG]: Value of processedMatchingCards:', JSON.stringify(processedMatchingCards));
    } else {
      console.error('[MCP Server/API DEBUG]: matchingCardsQueryResults was not a recognizable array or table and could not be processed. Defaulting to []. Value:', matchingCardsQueryResults);
      processedMatchingCards = [];
    }

    const matchingCards = processedMatchingCards;
    console.log('[MCP Server/API DEBUG]: Final matchingCards before generateExpertInsights:', JSON.stringify(matchingCards));
    console.log('[MCP Server/API DEBUG]: Is final matchingCards an array?', Array.isArray(matchingCards));

    res.json({
      spendingAnalysis,
      matchingCards,
      expertInsights: generateExpertInsights(spendingAnalysis, matchingCards)
    });
  } catch (error) {
    console.error('Error analyzing data in /api/analyze:', error);
    res.status(500).json({ error: 'Internal server error in /api/analyze' });
  }
});

function extractPreferencesFromContext(conversationHistory: Array<{role: string, content: string}>): string[] {
  const preferences: string[] = [];
  const lastMessage = conversationHistory[conversationHistory.length - 1];
  
  if (lastMessage.content.toLowerCase().includes('travel')) {
    preferences.push('travel');
  }
  if (lastMessage.content.toLowerCase().includes('shopping')) {
    preferences.push('shopping');
  }
  if (lastMessage.content.toLowerCase().includes('dining')) {
    preferences.push('dining');
  }

  return preferences;
}

function generateExpertInsights(spendingAnalysis: any[], matchingCards: any[]) {
  return {
    cardRecommendations: {
      bestMatches: matchingCards
        .filter(card => card.eligibility === 'eligible')
        .slice(0, 3)
        .map(card => ({
          card_name: card.card_name,
          benefit_type: card.benefit_type,
          benefit_value: card.benefit_value,
          reward_amount: card.max_reward,
          id: card.id
        }))
    },
    optimizationTips: {
      spendingOptimization: generateSpendingTips(spendingAnalysis),
      cardUsageTips: generateCardUsageTips(matchingCards)
    }
  };
}

function generateSpendingTips(spendingAnalysis: any[]): string[] {
  const tips: string[] = [];
  
  const highSpend = spendingAnalysis.find(row => row.spend_level === 'high');
  if (highSpend) {
    tips.push(`Consider getting a card that offers higher rewards for your high-spend category of ₹${highSpend.total_spend}`);
  }

  return tips;
}

function generateCardUsageTips(matchingCards: any[]): Record<string, string> {
  const tips: Record<string, string> = {};
  
  matchingCards.forEach(card => {
    if (card.eligibility === 'eligible') {
      tips[card.id] = `Use this card for ${card.benefit_type} purchases to maximize rewards.`;
    }
  });

  return tips;
}

// Start the server
initializeDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`⚡️[MCP Server]: Server is running at http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database and start server:', error);
    process.exit(1);
  });

export default app; 