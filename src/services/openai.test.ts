import { parseIntentAndSpends } from './openai.js';

describe('parseIntentAndSpends', () => {
  test('falls back to UNKNOWN when OpenAI is not configured', async () => {
    const result = await parseIntentAndSpends('test message');
    expect(result).toEqual({ intent: 'UNKNOWN', spend: {}, ambiguous: ['test message'] });
  });
});
