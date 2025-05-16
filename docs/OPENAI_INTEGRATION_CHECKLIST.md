# OpenAI API Integration Checklist

## Phase 1: Basic API Integration
- [ ] Create new API route for OpenAI integration (`src/app/api/chat/route.ts`)
- [ ] Implement basic prompt handling for single message
- [ ] Test API endpoint with simple request
- [ ] Verify OpenAI API key is properly loaded from .env

## Phase 2: Conversation Context
- [ ] Implement conversation history tracking
- [ ] Add system prompt for spend extraction
- [ ] Test multi-turn conversation
- [ ] Verify context is maintained between messages

## Phase 3: Spend Extraction Logic
- [ ] Implement spend category mapping
- [ ] Add validation for numeric values
- [ ] Create follow-up question logic
- [ ] Test spend extraction from various message formats

## Phase 4: Correlated Questions
- [ ] Implement dependent question pairs:
  - Flights + Hotels
  - Insurance + Pharmacy
  - Flights + Lounge Access
  - Amazon + Other Online Shopping
  - Online Food + Dining
- [ ] Add logic to determine when to ask follow-ups
- [ ] Test question flow with different user inputs

## Phase 5: CardGenius API Integration
- [ ] Create API route for CardGenius
- [ ] Implement spend data formatting
- [ ] Add validation for minimum required fields
- [ ] Test API call with sample data

## Phase 6: Frontend Integration
- [ ] Create new page for chat interface (`src/app/chat/page.tsx`)
- [ ] Implement message display
- [ ] Add loading states
- [ ] Test end-to-end flow

## Phase 7: Testing & Refinement
- [ ] Test with various user scenarios
- [ ] Optimize prompt for better extraction
- [ ] Add error handling
- [ ] Document API endpoints

## Dependencies
- OpenAI API key in .env.local
- CardGenius API endpoint
- Required npm packages:
  - openai
  - axios
  - next
  - react
  - typescript

## Notes
- Keep existing frontend untouched
- Create new components for chat interface
- Maintain conversation context
- Focus on correlated spend questions
- Minimum 2-step confirmation process
- Call CardGenius API when sufficient data is collected 