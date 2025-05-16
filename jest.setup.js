// Mock fetch globally
global.fetch = jest.fn();

// Mock console.error to keep test output clean
console.error = jest.fn();

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
}); 