# CardGenius AI - Issue Tracking & Todo List

## Critical Issues (P0)

### 1. API Performance
- [ ] Optimize API call time (currently ~5s)
- [ ] Implement request caching
- [ ] Add request debouncing
- [ ] Optimize payload size
- [ ] Add loading states for better UX during API calls

### 2. Conversation Flow & State Management
- [ ] Improve prompt engineering for more natural conversation
- [~] Fix state maintenance issues (repeated questions) - Will be addressed by JSON-mode migration
- [ ] Implement better context tracking across messages
- [~] Add correlated question pairs (flights + hotels, insurance + pharmacy) - Will be addressed by TypeScript correlation chains
- [ ] Make follow-up questions more friendly and natural

### 3. Error Handling
- [~] Add proper error states for card results page - Will be addressed by typed CardGeniusError union
- [x] Implement user-friendly error messages
- [x] Add retry mechanisms
- [~] Complete API error handling - Will be improved by schema validation
- [ ] Add error logging and monitoring
- [ ] Fix error response structure compatibility with frontend
- [ ] Maintain fallback card recommendations in error cases

### 4. Card Results UI
- [ ] Complete UI overhaul for card display
- [ ] Add interactive elements
- [ ] Implement card comparison features
- [ ] Add detailed card information view
- [ ] Add sorting/filtering options

### 5. Extended Functionality
- [ ] Add specific card inquiry handling
- [ ] Implement card comparison features
- [ ] Add detailed card information view
- [ ] Improve user preferences handling
- [ ] Add save/share recommendations feature

### 6. Search Restart
- [ ] Add clear restart functionality
- [ ] Handle edge cases in conversation flow
- [ ] Implement proper state reset
- [ ] Add confirmation before restart

### 7. Migration to JSON-mode + Function-calling
- [ ] Add Zod/Ajv schema validation
- [ ] Drop temperature to 0.3 and add frequency_penalty: 0.2
- [ ] Test with real user scenarios
- [ ] Document any issues found
- [ ] Implement JSON-mode + single collect_spending function
- [ ] Pass asked_fields and current_chain in every request
- [ ] Move correlation chains into TypeScript
- [ ] Shrink system prompt
- [ ] Implement streaming chat completions
- [ ] Replace fallback card list with typed CardGeniusError union

## High Priority Improvements (P1)

### 1. UI/UX Enhancements
- [ ] Implement dark theme with neon accents
- [ ] Add animations and transitions
- [ ] Improve mobile responsiveness
- [x] Add loading states
- [ ] Improve visual feedback

### 2. Data Collection
- [ ] Improve spending category mapping
- [ ] Better handle ambiguous inputs
- [ ] Add validation for collected data
- [ ] Implement smarter defaults
- [ ] Handle partial information better
- [ ] Update frontend to handle null values in spending data
- [ ] Update validation logic for null values

### 3. Performance
- [ ] Optimize API calls
- [x] Implement better caching
- [ ] Reduce unnecessary re-renders
- [ ] Improve loading times

## Medium Priority (P2)

### 1. Testing
- [x] Add unit tests
- [ ] Implement integration tests
- [ ] Add end-to-end tests
- [x] Test error scenarios
- [ ] Add performance testing

### 2. Documentation
- [ ] Update API documentation
- [ ] Add usage examples
- [ ] Document error handling
- [ ] Add troubleshooting guide
- [ ] Document breaking changes for frontend team

### 3. Security
- [ ] Implement proper API key management
- [ ] Add rate limiting
- [ ] Improve data validation
- [ ] Add input sanitization

## Low Priority (P3)

### 1. Analytics
- [ ] Add user interaction tracking
- [ ] Implement conversion tracking
- [~] Add error logging
- [ ] Track user preferences

## Notes
- Priority levels:
  - P0: Critical issues affecting core functionality
  - P1: High priority improvements
  - P2: Medium priority enhancements
  - P3: Low priority features

- Status indicators:
  - [ ] Not started
  - [~] In progress
  - [x] Completed

## Updates
- 2024-04-18: Initial document creation
  - Compiled list of critical issues
  - Organized by priority levels
  - Added tracking structure
- 2024-04-18: Added API Performance as P0
  - Added API call time optimization
  - Added caching and debouncing requirements
- 2024-04-18: Implemented core error handling
  - Added error boundary components
  - Implemented retry mechanisms
  - Added user-friendly error messages
  - Integrated error handling into ChatInterface
- 2024-04-18: Added Migration Issues
  - Added error response structure compatibility issues
  - Added null value handling requirements
  - Added migration to JSON-mode tasks
  - Marked existing issues that will be addressed by migration 