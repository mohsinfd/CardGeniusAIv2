export interface SpendingData {
  monthly: {
    amazon_spends?: number;
    dining_or_going_out?: number;
    entertainment_spends?: number;
    [key: string]: number | undefined;
  };
  quarterly: {
    hotels_quarterly?: number;
    [key: string]: number | undefined;
  };
  annual: {
    flights_annual?: number;
    [key: string]: number | undefined;
  };
}

export interface DialogueState {
  askedFields: string[];
  pendingFields: string[];
  currentField: string | null;
  previousField: string | null;
  chainStep: number;
  spendingData: SpendingData;
}

export interface CategoryMapping {
  correlated: string[];
  variables: string[][];
}

export interface CategoryMappings {
  [key: string]: CategoryMapping;
} 