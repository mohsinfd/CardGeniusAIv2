import { parseOpenAIResponse } from '@/utils/responseParser';

describe('parseOpenAIResponse', () => {
  it('parses a valid structured response', () => {
    const response = parseOpenAIResponse(JSON.stringify({
      content: 'I can help with that.',
      ready_for_recommendations: false,
      follow_up_question: 'How much do you spend on groceries each month?',
      spending_data: {
        amazon_spends: 5000
      },
      dialogue_state: {
        askedFields: ['amazon_spends'],
        pendingFields: ['grocery_spends_online'],
        chainStep: 1,
        currentField: 'grocery_spends_online'
      }
    }));

    expect(response.content).toBe('I can help with that.');
    expect(response.spending_data.amazon_spends).toBe(5000);
    expect(response.spending_data.flipkart_spends).toBe(0);
    expect(response.dialogue_state.askedFields).toContain('amazon_spends');
  });

  it('returns safe defaults for unstructured text', () => {
    const response = parseOpenAIResponse('not json');

    expect(response.ready_for_recommendations).toBe(false);
    expect(response.spending_data.amazon_spends).toBe(0);
    expect(response.dialogue_state.currentField).toBe('Initial');
  });
});
