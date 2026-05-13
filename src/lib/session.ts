import type { SessionOptions } from 'iron-session';
import type { SpendingData } from '../types/spending';

// Define the structure of the data we will store in the session.
// This will hold the serializable state of the ConversationManager.
export interface AppSessionData {
  spendProfile?: SpendingData;
  // Sets are not directly JSON serializable, so we'll store askedFields as an array.
  askedFields?: Array<keyof SpendingData['monthly']>; 
  ambiguousTerms?: string[];
  pendingBrandSpends?: Array<{ brand_name: string; amount: number | null }>;
  isInitialized?: boolean; // To track if a new session has the default manager state loaded
}

// Augment the IronSession an NextApiRequest types to include our AppSessionData
declare module 'iron-session' {
  interface IronSessionData {
    conversation?: AppSessionData;
  }
}

export function getSessionOptions(): SessionOptions {
  if (!process.env.SESSION_PASSWORD || process.env.SESSION_PASSWORD.length < 32) {
    throw new Error('SESSION_PASSWORD must be set to at least 32 characters.');
  }

  return {
    cookieName: 'cardgenius-ai-session',
    password: process.env.SESSION_PASSWORD,
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
    },
  };
}
