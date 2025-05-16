import { describe, test, expect, jest, beforeEach } from '@jest/globals'
import { POST } from '@/app/api/chat/route'
import { NextResponse } from 'next/server'

// Mock fetch with proper typing
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>
global.fetch = mockFetch

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data) => data)
  }
}))

describe('API Route Migration Tests', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    jest.clearAllMocks()
  })

  describe('Null Value Handling', () => {
    test('should use null for default values when no spending data provided', async () => {
      const response = await POST(new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({})
      }))

      expect(response).toEqual(expect.objectContaining({
        amazon_spends: null,
        flipkart_spends: null,
        dining_or_going_out: null
      }))
    })

    test('should merge partial spending data with null defaults', async () => {
      const response = await POST(new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          amazon_spends: 5000,
          dining_or_going_out: 3000
        })
      }))

      expect(response).toEqual(expect.objectContaining({
        amazon_spends: 5000,
        flipkart_spends: null,
        dining_or_going_out: 3000
      }))
    })
  })

  describe('API Error Handling', () => {
    test('should handle API timeout', async () => {
      mockFetch.mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 11000)
        )
      )

      const response = await POST(new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({})
      }))

      expect(response).toEqual(expect.objectContaining({
        cards: expect.any(Array)
      }))
    })

    test('should return fallback data on API failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'))

      const response = await POST(new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({})
      }))

      expect(response).toEqual(expect.objectContaining({
        cards: expect.any(Array)
      }))
    })
  })

  describe('Spending Data Processing', () => {
    test('should process different spending categories', async () => {
      const spendingData = {
        amazon_spends: 5000,
        flipkart_spends: 3000,
        dining_or_going_out: 2000
      }

      const response = await POST(new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify(spendingData)
      }))

      expect(response).toEqual(expect.objectContaining(spendingData))
    })

    test('should validate spending amounts', async () => {
      const response = await POST(new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          amazon_spends: -1000,
          flipkart_spends: 'invalid',
          dining_or_going_out: null
        })
      }))

      expect(response).toEqual(expect.objectContaining({
        amazon_spends: null,
        flipkart_spends: null,
        dining_or_going_out: null
      }))
    })
  })
}) 