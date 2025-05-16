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

if (!process.env.SESSION_PASSWORD) {
  throw new Error('SESSION_PASSWORD environment variable is not set. Please ensure it is in your .env.local file and is at least 32 characters long.');
}

export const sessionOptions: SessionOptions = {
  cookieName: 'cardgenius-ai-session', // You can name your cookie whatever you like
  password: process.env.SESSION_PASSWORD as string, // Cast is safe due to the check above
  cookieOptions: {
    // secure: true should be used in production (HTTPS) but false for localhost (HTTP)
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true, // Recommended for security
    sameSite: 'lax', // Recommended for security
    // You might also want to set maxAge or expires for the cookie
    // maxAge: 60 * 60 * 24, // 24 hours in seconds, for example
  },
}; 