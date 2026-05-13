// Add any global setup for tests here
global.fetch = jest.fn()

// Mock the fetch function
const mockFetch = jest.fn()
global.fetch = mockFetch

// Reset mocks before each test
beforeEach(() => {
  mockFetch.mockReset()
  // Set up a default mock response
  mockFetch.mockImplementation(() => 
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        spending_data: {
          monthly: {
            rent: 20000,
            amazon_spends: 10000,
            flipkart_spends: 5000,
            dining_or_going_out: 8000
          },
          annual: {
            rent: 240000,
            amazon_spends: 120000,
            flipkart_spends: 60000,
            dining_or_going_out: 96000
          },
          quarterly: {
            rent: 60000,
            amazon_spends: 30000,
            flipkart_spends: 15000,
            dining_or_going_out: 24000
          }
        },
        offer_preferences: {
          preferred_merchants: ['amazon', 'flipkart'],
          offer_types: ['cashback', 'discounts'],
          expected_value: 'high',
          follow_up_questions: [
            'What type of offers are you most interested in?',
            'Do you have any preferred merchants?'
          ]
        }
      })
    })
  )
}) 