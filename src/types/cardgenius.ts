export interface CardGeniusResponse {
  success: boolean;
  message: string;
  savings: CardRecommendation[];
}

export interface CardRecommendation {
  card_name: string;
  seo_card_alias: string;
  cg_network_url: string | null;
  ck_store_url: string | null;
  ck_store_url_2: string | null;
  id: number;
  joining_fees: string;
  total_savings: number;
  total_savings_yearly: number;
  total_extra_benefits: number;
  max_potential_savings: string;
  category_breakdown: Record<string, CategoryBreakdown>;
  spending_breakdown: Record<string, SpendingBreakdown>;
  total_beneficial_spends: number;
  total_spends: number;
  welcomeBenefits: WelcomeBenefit[];
  food_dining_benefits: any[];
  milestone_benefits: any[];
  roi: number;
  tags: string;
  bank_id: number;
  spending_breakdown_array: SpendingBreakdown[];
  card_bg_image: string;
  image: string;
  product_usps: ProductUSP[];
}

export interface CategoryBreakdown {
  spend: number;
  savings: number;
}

export interface SpendingBreakdown {
  on: string;
  spend: number;
  savings: number;
}

export interface WelcomeBenefit {
  id: number;
  card_id: number;
  minimum_spend: string;
  maximum_days: string;
  rp_bonus: string;
  cash_conversion: string;
  voucher_bonus: string;
  voucher_of: string;
  createdAt: string;
  updatedAt: string;
  cash_value: number;
}

export interface ProductUSP {
  id: number;
  product_id: number;
  tag_id: number;
  header: string;
  description: string;
  priority: number;
  createdAt: string;
  updatedAt: string;
} 