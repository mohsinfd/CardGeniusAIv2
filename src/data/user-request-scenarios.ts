export const userRequestScenarios = [
  // Travel-related scenarios
  {
    id: 1,
    request: "I travel internationally 4 times a year, mostly with Emirates, spending about 2 lakhs annually",
    category: "travel",
    spends: {
      flights_annual: 200000,
      airline_preference: "Emirates"
    }
  },
  {
    id: 2,
    request: "I fly domestically every month, need lounge access, spend around 50k per month on flights",
    category: "travel",
    spends: {
      flights_annual: 600000,
      domestic_lounge_usage_quarterly: 12
    }
  },
  {
    id: 3,
    request: "I travel for business, stay in hotels 10 nights a month, budget 5k per night",
    category: "travel",
    spends: {
      hotels_annual: 600000
    }
  },
  {
    id: 4,
    request: "I'm a frequent flyer with Indigo, mostly domestic, spending 1 lakh annually",
    category: "travel",
    spends: {
      flights_annual: 100000,
      airline_preference: "Indigo"
    }
  },
  {
    id: 5,
    request: "I travel internationally twice a year for vacation, prefer luxury hotels",
    category: "travel",
    spends: {
      hotels_annual: 300000
    }
  },

  // Shopping-related scenarios
  {
    id: 6,
    request: "I shop a lot on Amazon and Flipkart, around 15k per month on each",
    category: "shopping",
    spends: {
      amazon_spends: 15000,
      flipkart_spends: 15000
    }
  },
  {
    id: 7,
    request: "I make luxury purchases worth 2-3 lakhs every quarter",
    category: "shopping",
    spends: {
      other_online_spends: 800000
    }
  },
  {
    id: 8,
    request: "I shop online for electronics and gadgets, spending about 50k monthly",
    category: "shopping",
    spends: {
      other_online_spends: 50000
    }
  },
  {
    id: 9,
    request: "I buy clothes and accessories online, spending 20k monthly",
    category: "shopping",
    spends: {
      other_online_spends: 20000
    }
  },
  {
    id: 10,
    request: "I prefer offline shopping in malls, spending 30k monthly",
    category: "shopping",
    spends: {
      other_offline_spends: 30000
    }
  },

  // Dining and entertainment
  {
    id: 11,
    request: "I eat out 3-4 times a week, spending about 2k per meal",
    category: "dining",
    spends: {
      dining_or_going_out: 24000
    }
  },
  {
    id: 12,
    request: "I watch movies twice a month and order food online 3 times a week",
    category: "entertainment",
    spends: {
      movie_usage: 24,
      online_food_ordering_usage: 156
    }
  },
  {
    id: 13,
    request: "I frequently visit restaurants and cafes, spending 15k monthly",
    category: "dining",
    spends: {
      dining_or_going_out: 15000
    }
  },
  {
    id: 14,
    request: "I order food online daily, spending about 500 per order",
    category: "dining",
    spends: {
      online_food_ordering: 15000
    }
  },
  {
    id: 15,
    request: "I enjoy fine dining experiences, spending 10k monthly",
    category: "dining",
    spends: {
      dining_or_going_out: 10000
    }
  },

  // Student-related scenarios
  {
    id: 16,
    request: "I'm a student who shops online for books and supplies, spending 5k monthly",
    category: "student",
    spends: {
      other_online_spends: 5000
    }
  },
  {
    id: 17,
    request: "I'm a college student who spends on movies and food delivery, about 3k monthly",
    category: "student",
    spends: {
      movie_mov: 3000,
      online_food_ordering: 3000
    }
  },
  {
    id: 18,
    request: "I'm a student who travels home monthly, spending 2k on train tickets",
    category: "student",
    spends: {
      other_offline_spends: 2000
    }
  },
  {
    id: 19,
    request: "I'm a student who shops for stationery and supplies, spending 1k monthly",
    category: "student",
    spends: {
      other_offline_spends: 1000
    }
  },
  {
    id: 20,
    request: "I'm a student who needs a card for online course subscriptions",
    category: "student",
    spends: {
      other_online_spends: 2000
    }
  },

  // Business-related scenarios
  {
    id: 21,
    request: "I run a small business and need a card for business expenses, monthly spends around 1 lakh",
    category: "business",
    spends: {
      other_offline_spends: 100000
    }
  },
  {
    id: 22,
    request: "I'm a corporate employee who travels for work and entertains clients",
    category: "business",
    spends: {
      flights_annual: 300000,
      dining_or_going_out: 20000
    }
  },
  {
    id: 23,
    request: "I need a card for business travel and hotel stays",
    category: "business",
    spends: {
      hotels_annual: 400000,
      flights_annual: 200000
    }
  },
  {
    id: 24,
    request: "I run an e-commerce business with monthly online spends of 2 lakhs",
    category: "business",
    spends: {
      other_online_spends: 200000
    }
  },
  {
    id: 25,
    request: "I need a card for business supplies and equipment purchases",
    category: "business",
    spends: {
      other_offline_spends: 50000
    }
  },

  // Fuel and transportation
  {
    id: 26,
    request: "I drive a lot for work, spending 15k monthly on fuel",
    category: "fuel",
    spends: {
      fuel: 15000
    }
  },
  {
    id: 27,
    request: "I own two cars and spend about 20k monthly on fuel and maintenance",
    category: "fuel",
    spends: {
      fuel: 20000
    }
  },
  {
    id: 28,
    request: "I commute daily by car, spending 8k monthly on fuel",
    category: "fuel",
    spends: {
      fuel: 8000
    }
  },
  {
    id: 29,
    request: "I need a card that gives good rewards on fuel purchases",
    category: "fuel",
    spends: {
      fuel: 10000
    }
  },
  {
    id: 30,
    request: "I travel frequently by car for business, spending 25k monthly on fuel",
    category: "fuel",
    spends: {
      fuel: 25000
    }
  },

  // Utility bills
  {
    id: 31,
    request: "My monthly utility bills are around 10k for electricity and 2k for water",
    category: "utilities",
    spends: {
      electricity_bills: 10000,
      water_bills: 2000
    }
  },
  {
    id: 32,
    request: "I pay 2k monthly for mobile bills and 1k for internet",
    category: "utilities",
    spends: {
      mobile_phone_bills: 2000,
      other_online_spends: 1000
    }
  },
  {
    id: 33,
    request: "I need a card for paying all my utility bills",
    category: "utilities",
    spends: {
      electricity_bills: 8000,
      water_bills: 1500,
      mobile_phone_bills: 1000
    }
  },
  {
    id: 34,
    request: "I pay 5k monthly for OTT subscriptions and internet",
    category: "utilities",
    spends: {
      ott_channels: 3000,
      other_online_spends: 2000
    }
  },
  {
    id: 35,
    request: "I need a card for paying rent and utility bills",
    category: "utilities",
    spends: {
      rent: 25000,
      electricity_bills: 5000,
      water_bills: 1000
    }
  },

  // Insurance and healthcare
  {
    id: 36,
    request: "I pay 25k annually for health insurance",
    category: "insurance",
    spends: {
      insurance_health_annual: 25000
    }
  },
  {
    id: 37,
    request: "I need a card for paying insurance premiums and medical bills",
    category: "insurance",
    spends: {
      insurance_health_annual: 30000,
      other_offline_spends: 10000
    }
  },
  {
    id: 38,
    request: "I pay 15k annually for car insurance",
    category: "insurance",
    spends: {
      insurance_car_or_bike_annual: 15000
    }
  },
  {
    id: 39,
    request: "I need a card that provides good travel insurance",
    category: "insurance",
    spends: {
      flights_annual: 200000
    }
  },
  {
    id: 40,
    request: "I want a card with comprehensive insurance coverage",
    category: "insurance",
    spends: {
      insurance_health_annual: 20000,
      insurance_car_or_bike_annual: 10000
    }
  },

  // Grocery and essentials
  {
    id: 41,
    request: "I order groceries online worth 8k monthly",
    category: "grocery",
    spends: {
      grocery_spends_online: 8000
    }
  },
  {
    id: 42,
    request: "I shop for groceries offline, spending 10k monthly",
    category: "grocery",
    spends: {
      other_offline_spends: 10000
    }
  },
  {
    id: 43,
    request: "I need a card for monthly grocery shopping",
    category: "grocery",
    spends: {
      other_offline_spends: 15000
    }
  },
  {
    id: 44,
    request: "I buy groceries from local stores, spending 5k monthly",
    category: "grocery",
    spends: {
      other_offline_spends: 5000
    }
  },
  {
    id: 45,
    request: "I order groceries online twice a month, spending 4k each time",
    category: "grocery",
    spends: {
      grocery_spends_online: 8000
    }
  },

  // Mixed spending patterns
  {
    id: 46,
    request: "I travel internationally twice a year (1 lakh each), spend 10k monthly on dining, and 5k on fuel",
    category: "mixed",
    spends: {
      flights_annual: 200000,
      dining_or_going_out: 10000,
      fuel: 5000
    }
  },
  {
    id: 47,
    request: "I spend 20k monthly on Amazon, 10k on dining, and 5k on movies",
    category: "mixed",
    spends: {
      amazon_spends: 20000,
      dining_or_going_out: 10000,
      movie_mov: 5000
    }
  },
  {
    id: 48,
    request: "I travel domestically monthly, spend 15k on shopping, and 8k on dining",
    category: "mixed",
    spends: {
      flights_annual: 180000,
      other_online_spends: 15000,
      dining_or_going_out: 8000
    }
  },
  {
    id: 49,
    request: "I need a card for both travel and shopping, spending 2 lakhs annually on each",
    category: "mixed",
    spends: {
      flights_annual: 200000,
      other_online_spends: 200000
    }
  },
  {
    id: 50,
    request: "I spend on multiple categories: 10k on fuel, 15k on dining, and 20k on shopping",
    category: "mixed",
    spends: {
      fuel: 10000,
      dining_or_going_out: 15000,
      other_online_spends: 20000
    }
  },

  // Specific card feature requests
  {
    id: 51,
    request: "I want a card with no annual fee and good rewards",
    category: "features",
    features: ["no_annual_fee", "rewards"]
  },
  {
    id: 52,
    request: "I need a card that gives me unlimited lounge access",
    category: "features",
    features: ["lounge_access"]
  },
  {
    id: 53,
    request: "I want a card with good cashback on all spends",
    category: "features",
    features: ["cashback"]
  },
  {
    id: 54,
    request: "I need a card with travel insurance and emergency assistance",
    category: "features",
    features: ["travel_insurance", "emergency_assistance"]
  },
  {
    id: 55,
    request: "I want a card with lifestyle benefits like spa and golf",
    category: "features",
    features: ["lifestyle_benefits"]
  },

  // Credit score related
  {
    id: 56,
    request: "I want a card to build my credit score, monthly spends around 10k",
    category: "credit_building",
    spends: {
      other_online_spends: 10000
    }
  },
  {
    id: 57,
    request: "I need a secured card to improve my credit history",
    category: "credit_building",
    spends: {
      other_online_spends: 5000
    }
  },
  {
    id: 58,
    request: "I want to start building credit with minimal spends",
    category: "credit_building",
    spends: {
      other_online_spends: 3000
    }
  },
  {
    id: 59,
    request: "I need a card to establish credit history",
    category: "credit_building",
    spends: {
      other_online_spends: 2000
    }
  },
  {
    id: 60,
    request: "I want to rebuild my credit score with regular spends",
    category: "credit_building",
    spends: {
      other_online_spends: 8000
    }
  },

  // Rewards and cashback focused
  {
    id: 61,
    request: "I want a card that gives maximum cashback on all spends",
    category: "cashback",
    spends: {
      other_online_spends: 30000
    }
  },
  {
    id: 62,
    request: "I want a card that gives the best travel rewards and miles",
    category: "travel",
    spends: {
      flights_annual: 300000
    }
  },
  {
    id: 63,
    request: "I need a card with good rewards on dining and entertainment",
    category: "rewards",
    spends: {
      dining_or_going_out: 15000,
      movie_mov: 5000
    }
  },
  {
    id: 64,
    request: "I want a card with maximum rewards on online shopping",
    category: "rewards",
    spends: {
      other_online_spends: 40000
    }
  },
  {
    id: 65,
    request: "I need a card with good rewards on fuel and travel",
    category: "rewards",
    spends: {
      fuel: 10000,
      flights_annual: 200000
    }
  },

  // Lifestyle specific
  {
    id: 66,
    request: "I want a card with good lifestyle benefits like spa, golf, etc.",
    category: "lifestyle",
    features: ["lifestyle_benefits"]
  },
  {
    id: 67,
    request: "I need a card with premium lifestyle experiences",
    category: "lifestyle",
    features: ["premium_experiences"]
  },
  {
    id: 68,
    request: "I want a card with exclusive event access",
    category: "lifestyle",
    features: ["event_access"]
  },
  {
    id: 69,
    request: "I need a card with luxury hotel benefits",
    category: "lifestyle",
    features: ["luxury_hotels"]
  },
  {
    id: 70,
    request: "I want a card with fine dining privileges",
    category: "lifestyle",
    features: ["fine_dining"]
  },

  // Emergency and safety features
  {
    id: 71,
    request: "I need a card with good emergency assistance and travel insurance",
    category: "safety",
    features: ["emergency_assistance", "travel_insurance"]
  },
  {
    id: 72,
    request: "I want a card with comprehensive insurance coverage",
    category: "safety",
    features: ["comprehensive_insurance"]
  },
  {
    id: 73,
    request: "I need a card with good fraud protection",
    category: "safety",
    features: ["fraud_protection"]
  },
  {
    id: 74,
    request: "I want a card with emergency medical assistance",
    category: "safety",
    features: ["medical_assistance"]
  },
  {
    id: 75,
    request: "I need a card with good travel safety features",
    category: "safety",
    features: ["travel_safety"]
  },

  // Additional scenarios can be added here...
  // (Continuing with more specific scenarios and combinations)
] 