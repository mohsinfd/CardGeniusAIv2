import brandMappingData from './brandMapping.json';
import { SpendingData } from '../types/spending';

// Convert the array of brand mappings to a Record
export const brandMapping: Record<string, keyof SpendingData['monthly']> = brandMappingData.reduce((acc, { brand_name, category_key }) => {
  acc[brand_name.toLowerCase()] = category_key as keyof SpendingData['monthly'];
  return acc;
}, {} as Record<string, keyof SpendingData['monthly']>); 