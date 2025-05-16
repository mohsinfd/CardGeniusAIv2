import { NextRequest } from 'next/server';
import { POST } from '../app/api/chat/route';
import { DialogueState, SpendingData } from '../types';

describe('Dialogue State Management', () => {
  // Helper function to create a mock request
  const createMockRequest = (message: string, dialogueState?: DialogueState, spendingData?: SpendingData) => {
    return new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message, dialogueState, spendingData })
    });
  };

  // Initial state test
  test('initializes state correctly with first message', async () => {
    const req = createMockRequest('I spend 5k on amazon');
    const response = await POST(req);
    const data = await response.json();

    expect(data.dialogueState).toBeDefined();
    expect(data.dialogueState.askedFields).toContain('amazon_spends');
    expect(data.dialogueState.spendingData.monthly.amazon_spends).toBe(5000);
    expect(data.dialogueState.chainStep).toBe(1);
  });

  // Test spending amount extraction
  test('correctly extracts spending amounts', async () => {
    const testCases = [
      { input: '5k', expected: 5000 },
      { input: '10000', expected: 10000 },
      { input: '2.5k', expected: 2500 },
      { input: 'I spend about 3k', expected: 3000 },
    ];

    for (const testCase of testCases) {
      const req = createMockRequest(testCase.input);
      const response = await POST(req);
      const data = await response.json();

      expect(data.spendingData).toBeDefined();
      // Check if any spending category has the expected amount
      const hasExpectedAmount = Object.values(data.spendingData.monthly)
        .some(amount => amount === testCase.expected);
      expect(hasExpectedAmount).toBe(true);
    }
  });

  // Test state persistence between requests
  test('maintains state between requests', async () => {
    // First request
    let req = createMockRequest('I spend 5k on amazon');
    let response = await POST(req);
    let data = await response.json();

    expect(data.dialogueState.askedFields).toContain('amazon_spends');
    expect(data.dialogueState.spendingData.monthly.amazon_spends).toBe(5000);

    // Second request with previous state
    req = createMockRequest(
      'I spend 3k on dining',
      data.dialogueState,
      data.spendingData
    );
    response = await POST(req);
    data = await response.json();

    expect(data.dialogueState.askedFields).toContain('amazon_spends');
    expect(data.dialogueState.askedFields).toContain('dining_or_going_out');
    expect(data.dialogueState.spendingData.monthly.amazon_spends).toBe(5000);
    expect(data.dialogueState.spendingData.monthly.dining_or_going_out).toBe(3000);
  });

  // Test category mapping and follow-up questions
  test('follows category mapping for follow-up questions', async () => {
    // First request for dining
    let req = createMockRequest('I spend 5k on dining');
    let response = await POST(req);
    let data = await response.json();

    expect(data.followUpQuestion).toContain('entertainment');  // Assuming entertainment is mapped to dining
    expect(data.dialogueState.currentField).toBe('entertainment_spends');
    expect(data.dialogueState.previousField).toBe('dining_or_going_out');

    // Second request with entertainment spending
    req = createMockRequest(
      'I spend 2k on entertainment',
      data.dialogueState,
      data.spendingData
    );
    response = await POST(req);
    data = await response.json();

    expect(data.dialogueState.askedFields).toContain('entertainment_spends');
    expect(data.dialogueState.spendingData.monthly.entertainment_spends).toBe(2000);
  });

  // Test invalid state handling
  test('handles invalid state gracefully', async () => {
    const invalidState = {
      askedFields: null,  // Invalid
      pendingFields: [],
      currentField: 'invalid_field',
      previousField: null,
      chainStep: 'not_a_number',  // Invalid
      spendingData: {}
    };

    const req = createMockRequest('test message', invalidState as any);
    const response = await POST(req);
    const data = await response.json();

    expect(data.dialogueState).toBeDefined();
    expect(Array.isArray(data.dialogueState.askedFields)).toBe(true);
    expect(typeof data.dialogueState.chainStep).toBe('number');
  });

  // Test multiple related categories
  test('handles multiple related categories correctly', async () => {
    // First request for travel
    let req = createMockRequest('I spend 50k on flights');
    let response = await POST(req);
    let data = await response.json();

    expect(data.dialogueState.askedFields).toContain('flights_annual');
    expect(data.followUpQuestion).toContain('hotels');  // Should ask about hotels next

    // Second request for hotels
    req = createMockRequest(
      'I spend 30k on hotels',
      data.dialogueState,
      data.spendingData
    );
    response = await POST(req);
    data = await response.json();

    expect(data.dialogueState.askedFields).toContain('hotels_quarterly');
    expect(data.dialogueState.spendingData.annual.flights_annual).toBe(50000);
    expect(data.dialogueState.spendingData.quarterly.hotels_quarterly).toBe(30000);
  });

  // Test completion of all categories
  test('handles completion of all categories', async () => {
    let dialogueState: DialogueState = {
      askedFields: ['amazon_spends', 'dining_or_going_out', 'entertainment_spends', 'flights_annual', 'hotels_quarterly'],
      pendingFields: [],
      currentField: null,
      previousField: 'hotels_quarterly',
      chainStep: 5,
      spendingData: {
        monthly: { amazon_spends: 5000, dining_or_going_out: 3000, entertainment_spends: 2000 },
        quarterly: { hotels_quarterly: 30000 },
        annual: { flights_annual: 50000 }
      }
    };

    const req = createMockRequest('What card do you recommend?', dialogueState);
    const response = await POST(req);
    const data = await response.json();

    expect(data.dialogueState.currentField).toBeNull();
    expect(data.dialogueState.pendingFields).toHaveLength(0);
    expect(data.content).toContain('recommend');  // Should contain recommendation
  });
}); 