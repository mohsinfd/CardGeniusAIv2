import { SpendProfile } from '../types';
import * as duckdb from '@duckdb/duckdb-wasm';

export interface CardExpertContext {
  spendingProfile: SpendProfile;
  conversationHistory: Array<{role: string, content: string}>;
  currentFocus: string | null;
}

export class CardExpert {
  private db: duckdb.AsyncDuckDB | null = null;
  private conn: duckdb.AsyncDuckDBConnection | null = null;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.initializeDB();
  }

  private async initializeDB() {
    try {
      const bundle = await duckdb.selectBundle({
        mvp: {
          mainModule: '/duckdb-mvp.wasm',
          mainWorker: '/duckdb-browser-mvp.worker.js',
        },
      });

      const worker = new Worker(bundle.mainWorker!, { type: 'module' });
      const logger = new duckdb.ConsoleLogger();
      this.db = new duckdb.AsyncDuckDB(logger, worker);
      await this.db.instantiate(bundle.mainModule, bundle.pthreadWorker);
      this.conn = await this.db.connect();
      console.log('DuckDB initialized successfully');
    } catch (error) {
      console.error('Failed to initialize DuckDB:', error);
      throw error;
    }
  }

  private async ensureInitialized() {
    if (!this.initPromise) {
      this.initPromise = this.initializeDB();
    }
    await this.initPromise;
    if (!this.conn) {
      throw new Error('Database not initialized');
    }
    return this.conn;
  }

  // Core analysis tools for the LLM
  async analyzeSpendingPattern(spendingProfile: SpendProfile) {
    const conn = await this.ensureInitialized();
    const query = `
      WITH spending_analysis AS (
        SELECT 
          category,
          amount,
          CASE 
            WHEN amount > 50000 THEN 'high'
            WHEN amount > 20000 THEN 'medium'
            ELSE 'low'
          END as spend_level
        FROM (VALUES ${Object.entries(spendingProfile)
          .map(([cat, amt]) => `('${cat}', ${amt})`)
          .join(',')}) as t(category, amount)
      )
      SELECT 
        spend_level,
        COUNT(*) as category_count,
        SUM(amount) as total_spend
      FROM spending_analysis
      GROUP BY spend_level
    `;
    const result = await conn.query(query);
    return result.toArray();
  }

  async findMatchingCards(spendingProfile: SpendProfile, preferences: string[]) {
    const conn = await this.ensureInitialized();
    const query = `
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
          WHEN ${Object.entries(spendingProfile)
            .map(([cat, amt]) => `'${cat}' = cb.benefit_type AND ${amt} >= cb.min_spend`)
            .join(' OR ')}
          THEN 'eligible'
          ELSE 'not_eligible'
        END as eligibility
      FROM card_benefits cb
      WHERE ${preferences.map(p => `cb.tags LIKE '%${p}%'`).join(' OR ')}
    `;
    const result = await conn.query(query);
    return result.toArray();
  }

  async calculateDetailedRewards(cardId: string, spendingProfile: SpendProfile) {
    const conn = await this.ensureInitialized();
    const query = `
      WITH reward_calc AS (
        SELECT 
          c.*,
          b.benefit_type,
          b.benefit_value,
          b.min_spend,
          b.max_reward,
          s.amount as spend_amount,
          CASE 
            WHEN s.amount >= b.min_spend 
            THEN LEAST(s.amount * b.benefit_value, b.max_reward)
            ELSE 0
          END as reward_amount
        FROM cards c
        JOIN benefits b ON c.id = b.card_id
        JOIN (VALUES ${Object.entries(spendingProfile)
          .map(([cat, amt]) => `('${cat}', ${amt})`)
          .join(',')}) as s(category, amount)
        ON b.benefit_type = s.category
        WHERE c.id = '${cardId}'
      )
      SELECT 
        card_name,
        benefit_type,
        spend_amount,
        reward_amount,
        benefit_value as reward_rate,
        min_spend,
        max_reward
      FROM reward_calc
    `;
    const result = await conn.query(query);
    return result.toArray();
  }

  async getCardComparison(cardIds: string[]) {
    const conn = await this.ensureInitialized();
    const query = `
      SELECT 
        c.*,
        b.benefit_type,
        b.benefit_value,
        b.min_spend,
        b.max_reward,
        wb.benefit as welcome_benefit,
        mb.benefit as milestone_benefit
      FROM cards c
      LEFT JOIN benefits b ON c.id = b.card_id
      LEFT JOIN welcome_benefits wb ON c.id = wb.card_id
      LEFT JOIN milestone_benefits mb ON c.id = mb.card_id
      WHERE c.id IN (${cardIds.map(id => `'${id}'`).join(',')})
    `;
    const result = await conn.query(query);
    return result.toArray();
  }

  // Expert-level analysis methods
  async provideExpertAnalysis(context: CardExpertContext) {
    await this.ensureInitialized();
    const spendingAnalysis = await this.analyzeSpendingPattern(context.spendingProfile);
    const matchingCards = await this.findMatchingCards(
      context.spendingProfile,
      this.extractPreferencesFromContext(context)
    );

    return {
      spendingAnalysis,
      matchingCards,
      expertInsights: this.generateExpertInsights(spendingAnalysis, matchingCards)
    };
  }

  private extractPreferencesFromContext(context: CardExpertContext): string[] {
    // Extract user preferences from conversation history
    const preferences: string[] = [];
    const lastMessage = context.conversationHistory[context.conversationHistory.length - 1];
    
    if (lastMessage.content.toLowerCase().includes('travel')) {
      preferences.push('travel');
    }
    if (lastMessage.content.toLowerCase().includes('shopping')) {
      preferences.push('shopping');
    }
    if (lastMessage.content.toLowerCase().includes('dining')) {
      preferences.push('dining');
    }
    // Add more preference extraction logic

    return preferences;
  }

  private generateExpertInsights(spendingAnalysis: any, matchingCards: any) {
    // Generate expert-level insights based on spending patterns and matching cards
    return {
      spendingPattern: this.analyzeSpendingPattern(spendingAnalysis),
      cardRecommendations: this.analyzeCardMatches(matchingCards),
      optimizationTips: this.generateOptimizationTips(spendingAnalysis, matchingCards)
    };
  }

  private analyzeCardMatches(cards: any) {
    // Analyze card matches and provide recommendations
    return {
      bestMatches: this.identifyBestMatches(cards),
      alternativeOptions: this.identifyAlternatives(cards)
    };
  }

  private generateOptimizationTips(spendingAnalysis: any, matchingCards: any) {
    // Generate tips for optimizing rewards
    return {
      spendingOptimization: this.optimizeSpendingPattern(spendingAnalysis),
      cardUsageTips: this.generateCardUsageTips(matchingCards)
    };
  }

  private identifyPrimaryCategories(analysis: any) {
    // Implementation needed
    return [];
  }

  private identifyOptimizationOpportunities(analysis: any) {
    // Implementation needed
    return [];
  }

  private identifyBestMatches(cards: any) {
    // Implementation needed
    return [];
  }

  private identifyAlternatives(cards: any) {
    // Implementation needed
    return [];
  }

  private optimizeSpendingPattern(analysis: any) {
    // Implementation needed
    return [];
  }

  private generateCardUsageTips(cards: any) {
    // Implementation needed
    return {};
  }
} 