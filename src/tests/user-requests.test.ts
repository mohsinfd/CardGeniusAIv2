import { expect, describe, test, beforeEach, jest } from '@jest/globals'
import { parseUserRequest } from '../utils/request-parser'
import { POST } from '../app/api/card-recommendations/route'

interface TestCase {
  name: string
  input: string
  expected: {
    [key: string]: any
    followUpQuestions?: RegExp[]
  }
}

// Test cases for different types of user requests
const testCases: TestCase[] = [
  {
    name: 'Basic Rent + Offers Request',
    input: 'I want a card for my rent payments and something that gives offers',
    expected: {
      hasRent: true,
      hasOffers: true,
      followUpQuestions: [
        /rent/i,
        /offers/i
      ]
    }
  },
  {
    name: 'Specific Merchant Offers',
    input: 'Looking for a card with good offers on Amazon and Flipkart',
    expected: {
      hasMerchantOffers: true,
      merchants: ['amazon', 'flipkart'],
      followUpQuestions: [
        /spending/i,
        /rewards/i
      ]
    }
  },
  {
    name: 'Travel Benefits Focus',
    input: 'Need a card with good travel benefits and lounge access',
    expected: {
      hasTravelBenefits: true,
      hasLoungeAccess: true,
      followUpQuestions: [
        /travel/i,
        /lounge/i
      ]
    }
  },
  {
    name: 'Cashback Focus',
    input: 'I want maximum cashback on my daily spends',
    expected: {
      hasCashback: true,
      followUpQuestions: [
        /spending/i,
        /categories/i
      ]
    }
  },
  {
    name: 'Multiple Requirements',
    input: 'Looking for a card that gives good rewards on dining, has lounge access, and no annual fee',
    expected: {
      hasDiningRewards: true,
      hasLoungeAccess: true,
      hasAnnualFeeWaiver: true,
      followUpQuestions: [
        /dining/i,
        /lounge/i
      ]
    }
  },
  {
    name: 'Vague Benefits Request',
    input: 'I want a card with good benefits',
    expected: {
      hasGenericBenefits: true,
      followUpQuestions: [
        /benefits/i,
        /spending/i
      ]
    }
  },
  {
    name: 'Specific Category Focus',
    input: 'Need a card for my grocery and fuel expenses',
    expected: {
      hasGrocery: true,
      hasFuel: true,
      followUpQuestions: [
        /grocery/i,
        /fuel/i
      ]
    }
  },
  {
    name: 'Premium Benefits',
    input: 'Looking for a premium card with concierge service and airport transfers',
    expected: {
      hasPremiumBenefits: true,
      hasConcierge: true,
      hasAirportTransfers: true,
      followUpQuestions: [
        /premium/i,
        /service/i
      ]
    }
  },
  {
    name: 'Business Focus',
    input: 'Need a business card with expense tracking and employee cards',
    expected: {
      isBusinessCard: true,
      hasExpenseTracking: true,
      hasEmployeeCards: true,
      followUpQuestions: [
        /business/i,
        /expense/i
      ]
    }
  },
  {
    name: 'Credit Score Focus',
    input: 'Want a card that helps improve my credit score',
    expected: {
      hasCreditScoreFocus: true,
      followUpQuestions: [
        /credit/i,
        /score/i
      ]
    }
  }
]

// Mock fetch with proper typing
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>

describe('User Request Parser', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('should parse basic rent and offers request', async () => {
    const userInput = 'I pay 20k rent and want offers on Amazon and Flipkart'
    
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            spending_data: {
              monthly: {
                rent: 20000,
                amazon_spends: 5000,
                flipkart_spends: 3000
              }
            },
            offer_preferences: {
              preferred_merchants: ['amazon', 'flipkart'],
              offer_types: ['cashback', 'discount'],
              expected_value: '10-15%',
              follow_up_questions: ['What is your average monthly spend on Amazon?']
            }
          })
      }) as Promise<Response>
    )

    const result = await parseUserRequest(userInput)
    
    expect(result.spending_data.monthly.rent).toBe(20000)
    expect(result.offer_preferences.preferred_merchants).toContain('amazon')
    expect(result.offer_preferences.preferred_merchants).toContain('flipkart')
  })

  it('should parse generic offers request', async () => {
    const userInput = 'I want good offers on my card'
    
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            spending_data: {
              monthly: {}
            },
            offer_preferences: {
              preferred_merchants: [],
              offer_types: ['cashback', 'discount', 'rewards'],
              expected_value: '5-10%',
              follow_up_questions: [
                'Which merchants do you frequently shop with?',
                'What type of offers interest you most?'
              ]
            }
          })
      }) as Promise<Response>
    )

    const result = await parseUserRequest(userInput)
    
    expect(result.spending_data.monthly).toEqual({})
    expect(result.offer_preferences.offer_types).toContain('cashback')
    expect(result.offer_preferences.follow_up_questions).toHaveLength(2)
  })
})

// Test suite for user request parsing
describe('User Request Parsing', () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    global.fetch.mockReset()
  })

  testCases.forEach(({ name, input, expected }) => {
    test(name, async () => {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input })
      })

      const data = await response.json()

      // Basic response structure validation
      expect(data).toHaveProperty('spending_data')
      expect(data).toHaveProperty('follow_up_messages')
      expect(data).toHaveProperty('confidence')

      // Validate specific expectations
      Object.entries(expected).forEach(([key, value]) => {
        if (key === 'followUpQuestions') {
          const followUpQuestions = value as RegExp[]
          followUpQuestions.forEach(regex => {
            expect(data.follow_up_messages.some(msg => regex.test(msg))).toBe(true)
          })
        }
      })
    })
  })
})

// Test suite for offer preferences
describe('Offer Preferences Parsing', () => {
  beforeEach(() => {
    global.fetch.mockReset()
  })

  const offerTestCases: TestCase[] = [
    {
      name: 'Generic Offers Request',
      input: 'I want a card with good offers',
      expected: {
        hasGenericOffers: true,
        followUpQuestions: [
          /offers/i,
          /spending/i
        ]
      }
    },
    {
      name: 'Specific Merchant Offers',
      input: 'Looking for offers on Amazon and dining',
      expected: {
        hasMerchantOffers: true,
        merchants: ['amazon', 'dining'],
        followUpQuestions: [
          /amazon/i,
          /dining/i
        ]
      }
    },
    {
      name: 'Cashback Focus',
      input: 'I want maximum cashback offers',
      expected: {
        hasCashbackOffers: true,
        followUpQuestions: [
          /cashback/i,
          /spending/i
        ]
      }
    },
    {
      name: 'Reward Points Focus',
      input: 'Looking for a card with good reward points',
      expected: {
        hasRewardPoints: true,
        followUpQuestions: [
          /points/i,
          /rewards/i
        ]
      }
    },
    {
      name: 'Welcome Benefits',
      input: 'I want good welcome benefits',
      expected: {
        hasWelcomeBenefits: true,
        followUpQuestions: [
          /welcome/i,
          /benefits/i
        ]
      }
    }
  ]

  offerTestCases.forEach(({ name, input, expected }) => {
    test(name, async () => {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input })
      })

      const data = await response.json()

      // Validate offer preferences structure
      expect(data).toHaveProperty('offer_preferences')
      expect(data.offer_preferences).toHaveProperty('preferred_merchants')
      expect(data.offer_preferences).toHaveProperty('preferred_offer_types')
      expect(data.offer_preferences).toHaveProperty('minimum_expected_value')
      expect(data.offer_preferences).toHaveProperty('follow_up_questions')

      // Validate specific expectations
      Object.entries(expected).forEach(([key, value]) => {
        if (key === 'followUpQuestions') {
          const followUpQuestions = value as RegExp[]
          followUpQuestions.forEach(regex => {
            expect(data.follow_up_messages.some(msg => regex.test(msg))).toBe(true)
          })
        } else if (key === 'merchants') {
          const merchants = value as string[]
          expect(data.offer_preferences.preferred_merchants).toEqual(expect.arrayContaining(merchants))
        }
      })
    })
  })

  test('Generic Offers Request', async () => {
    const userInput = 'I want good offers on my card'
    
    global.fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          offer_preferences: {
            offer_types: ['cashback', 'discounts', 'rewards'],
            expected_value: 'medium',
            follow_up_questions: [
              'What type of offers are you most interested in?',
              'Do you have any preferred merchants?'
            ]
          }
        })
      })
    )

    const result = await parseUserRequest(userInput)
    
    expect(result.offer_preferences.offer_types).toContain('cashback')
    expect(result.offer_preferences.expected_value).toBe('medium')
    expect(result.offer_preferences.follow_up_questions).toHaveLength(2)
  })
})

describe('User Request Scenarios', () => {
  // Travel-related requests
  test('International travel with specific airline', () => {
    const request = "I travel internationally 4 times a year, mostly with Emirates, spending about 2 lakhs annually"
    const result = parseUserRequest(request)
    expect(result.category).toBe('travel')
    expect(result.spends.flights_annual).toBe(200000)
  })

  test('Domestic travel with lounge access', () => {
    const request = "I fly domestically every month, need lounge access, spend around 50k per month on flights"
    const result = parseUserRequest(request)
    expect(result.category).toBe('travel')
    expect(result.spends.flights_annual).toBe(600000)
  })

  test('Business travel with hotel stays', () => {
    const request = "I travel for business, stay in hotels 10 nights a month, budget 5k per night"
    const result = parseUserRequest(request)
    expect(result.category).toBe('travel')
    expect(result.spends.hotels_annual).toBe(600000)
  })

  // Shopping-related requests
  test('Online shopping with specific platforms', () => {
    const request = "I shop a lot on Amazon and Flipkart, around 15k per month on each"
    const result = parseUserRequest(request)
    expect(result.spends.amazon_spends).toBe(15000)
    expect(result.spends.flipkart_spends).toBe(15000)
  })

  test('Luxury shopping', () => {
    const request = "I make luxury purchases worth 2-3 lakhs every quarter"
    const result = parseUserRequest(request)
    expect(result.spends.other_online_spends).toBe(800000)
  })

  // Dining and entertainment
  test('Frequent dining', () => {
    const request = "I eat out 3-4 times a week, spending about 2k per meal"
    const result = parseUserRequest(request)
    expect(result.spends.dining_or_going_out).toBe(24000)
  })

  test('Movie and entertainment', () => {
    const request = "I watch movies twice a month and order food online 3 times a week"
    const result = parseUserRequest(request)
    expect(result.spends.movie_usage).toBe(24)
    expect(result.spends.online_food_ordering_usage).toBe(156)
  })

  // Student-related requests
  test('Student with online purchases', () => {
    const request = "I'm a student who shops online for books and supplies, spending 5k monthly"
    const result = parseUserRequest(request)
    expect(result.category).toBe('student')
    expect(result.spends.other_online_spends).toBe(5000)
  })

  test('Student with entertainment spends', () => {
    const request = "I'm a college student who spends on movies and food delivery, about 3k monthly"
    const result = parseUserRequest(request)
    expect(result.category).toBe('student')
    expect(result.spends.movie_mov).toBe(3000)
  })

  // Business-related requests
  test('Small business owner', () => {
    const request = "I run a small business and need a card for business expenses, monthly spends around 1 lakh"
    const result = parseUserRequest(request)
    expect(result.category).toBe('business')
    expect(result.spends.other_offline_spends).toBe(100000)
  })

  test('Corporate employee', () => {
    const request = "I'm a corporate employee who travels for work and entertains clients"
    const result = parseUserRequest(request)
    expect(result.category).toBe('business')
  })

  // Fuel and transportation
  test('High fuel consumption', () => {
    const request = "I drive a lot for work, spending 15k monthly on fuel"
    const result = parseUserRequest(request)
    expect(result.spends.fuel).toBe(15000)
  })

  test('Multiple vehicle owners', () => {
    const request = "I own two cars and spend about 20k monthly on fuel and maintenance"
    const result = parseUserRequest(request)
    expect(result.spends.fuel).toBe(20000)
  })

  // Utility bills
  test('High utility bills', () => {
    const request = "My monthly utility bills are around 10k for electricity and 2k for water"
    const result = parseUserRequest(request)
    expect(result.spends.electricity_bills).toBe(10000)
    expect(result.spends.water_bills).toBe(2000)
  })

  // Insurance and healthcare
  test('Health insurance premium', () => {
    const request = "I pay 25k annually for health insurance"
    const result = parseUserRequest(request)
    expect(result.spends.insurance_health_annual).toBe(25000)
  })

  // Grocery and essentials
  test('Online grocery shopping', () => {
    const request = "I order groceries online worth 8k monthly"
    const result = parseUserRequest(request)
    expect(result.spends.grocery_spends_online).toBe(8000)
  })

  // Mixed spending patterns
  test('Mixed spending with travel focus', () => {
    const request = "I travel internationally twice a year (1 lakh each), spend 10k monthly on dining, and 5k on fuel"
    const result = parseUserRequest(request)
    expect(result.spends.flights_annual).toBe(200000)
    expect(result.spends.dining_or_going_out).toBe(10000)
    expect(result.spends.fuel).toBe(5000)
  })

  test('Mixed spending with shopping focus', () => {
    const request = "I spend 20k monthly on Amazon, 10k on dining, and 5k on movies"
    const result = parseUserRequest(request)
    expect(result.spends.amazon_spends).toBe(20000)
    expect(result.spends.dining_or_going_out).toBe(10000)
    expect(result.spends.movie_mov).toBe(5000)
  })

  // Specific card feature requests
  test('Card with no annual fee', () => {
    const request = "I want a card with no annual fee and good rewards"
    const result = parseUserRequest(request)
    expect(result.features).toContain('no_annual_fee')
  })

  test('Card with airport lounge access', () => {
    const request = "I need a card that gives me unlimited lounge access"
    const result = parseUserRequest(request)
    expect(result.features).toContain('lounge_access')
  })

  // Credit score related
  test('Building credit score', () => {
    const request = "I want a card to build my credit score, monthly spends around 10k"
    const result = parseUserRequest(request)
    expect(result.category).toBe('credit_building')
  })

  // Rewards and cashback focused
  test('Maximum cashback', () => {
    const request = "I want a card that gives maximum cashback on all spends"
    const result = parseUserRequest(request)
    expect(result.category).toBe('cashback')
  })

  test('Travel rewards', () => {
    const request = "I want a card that gives the best travel rewards and miles"
    const result = parseUserRequest(request)
    expect(result.category).toBe('travel')
  })

  // Lifestyle specific
  test('Lifestyle benefits', () => {
    const request = "I want a card with good lifestyle benefits like spa, golf, etc."
    const result = parseUserRequest(request)
    expect(result.features).toContain('lifestyle_benefits')
  })

  // Emergency and safety features
  test('Emergency features', () => {
    const request = "I need a card with good emergency assistance and travel insurance"
    const result = parseUserRequest(request)
    expect(result.features).toContain('emergency_assistance')
  })

  // Additional test cases can be added here...
  // (Continuing with more specific scenarios and combinations)
})

// Test suite for API route changes
describe('API Route Changes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = mockFetch
  })

  describe('Null Value Handling', () => {
    test('should use null for default values when no spending data provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          spendingData: {
            amazon_spends: null,
            flipkart_spends: null,
            dining_or_going_out: null,
            grocery_spends: null,
            travel_spends: null,
            other_spends: null
          }
        })
      } as Response)

      const response = await POST(new Request('http://test.com', {
        method: 'POST',
        body: JSON.stringify({})
      }))
      const data = await response.json()
      
      expect(data.spendingData).toEqual({
        amazon_spends: null,
        flipkart_spends: null,
        dining_or_going_out: null,
        grocery_spends: null,
        travel_spends: null,
        other_spends: null
      })
    })

    test('should merge partial spending data with null defaults', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          spendingData: {
            amazon_spends: 5000,
            flipkart_spends: null,
            dining_or_going_out: 3000,
            grocery_spends: null,
            travel_spends: null,
            other_spends: null
          }
        })
      } as Response)

      const response = await POST(new Request('http://test.com', {
        method: 'POST',
        body: JSON.stringify({
          amazon_spends: 5000,
          dining_or_going_out: 3000
        })
      }))
      const data = await response.json()
      
      expect(data.spendingData).toEqual({
        amazon_spends: 5000,
        flipkart_spends: null,
        dining_or_going_out: 3000,
        grocery_spends: null,
        travel_spends: null,
        other_spends: null
      })
    })
  })

  describe('API Error Handling', () => {
    test('should handle API timeout', async () => {
      mockFetch.mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), 11000)
        )
      )

      const response = await POST(new Request('http://test.com', {
        method: 'POST',
        body: JSON.stringify({})
      }))
      const data = await response.json()
      
      expect(data.cards).toBeDefined()
      expect(console.error).toHaveBeenCalled()
    })

    test('should return fallback data on API failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'))

      const response = await POST(new Request('http://test.com', {
        method: 'POST',
        body: JSON.stringify({})
      }))
      const data = await response.json()
      
      expect(data.cards).toBeDefined()
      expect(data.cards.length).toBeGreaterThan(0)
    })
  })

  describe('Spending Data Processing', () => {
    test('should process different spending categories', async () => {
      const spendingData = {
        amazon_spends: 5000,
        flipkart_spends: 3000,
        dining_or_going_out: 2000,
        grocery_spends: 4000,
        travel_spends: 10000,
        other_spends: 1500
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          spendingData
        })
      } as Response)

      const response = await POST(new Request('http://test.com', {
        method: 'POST',
        body: JSON.stringify(spendingData)
      }))
      const data = await response.json()
      
      expect(data.spendingData).toEqual(spendingData)
    })

    test('should validate spending amounts', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          spendingData: {
            amazon_spends: null,
            flipkart_spends: null,
            dining_or_going_out: null,
            grocery_spends: null,
            travel_spends: null,
            other_spends: null
          }
        })
      } as Response)

      const response = await POST(new Request('http://test.com', {
        method: 'POST',
        body: JSON.stringify({
          amazon_spends: -1000,
          dining_or_going_out: 'invalid'
        })
      }))
      const data = await response.json()
      
      expect(data.spendingData.amazon_spends).toBeNull()
      expect(data.spendingData.dining_or_going_out).toBeNull()
    })
  })
}) 