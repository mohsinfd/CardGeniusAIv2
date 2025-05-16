# CardGenius Migration Plan: Monolithic Prompt to JSON-mode + Function-calling

## Current Status
- **Phase**: Phase 0 (Guard-rail quick win)
- **Status**: In Progress
- **Last Update**: 2024-04-18

## Phase 0: Guard-rail Quick Win
- [x] Add Zod/Ajv schema validation around current parseOpenAIResponse
- [x] Drop temperature to 0.3 and add frequency_penalty: 0.2
- [ ] Test with real user scenarios
- [ ] Document any issues found

## Phase 1: Infrastructure
- [ ] Implement JSON-mode + single collect_spending function
- [ ] Pass asked_fields and current_chain in every request
- [ ] Keep full system prompt for now
- [ ] Add automated regression tests

## Phase 2: Logic Extraction
- [ ] Move correlation chains into TypeScript
- [ ] Shrink system prompt
- [ ] Keep VIP-greeting logic in prompt or code
- [ ] Test with real user scenarios

## Phase 3: Performance & UX
- [ ] Implement streaming chat completions
- [ ] Replace fallback card list with typed CardGeniusError union
- [ ] Optimize for sub-2s perceived latency

## Current Issues
1. **Error Handling**: 
   - Changed error response structure broke frontend compatibility
   - Need to maintain fallback card recommendations in error cases
   - Frontend expects actual card data even in error scenarios

2. **Data Representation**:
   - Changed default values from 0 to null
   - Need to ensure frontend can handle null values
   - May need to update validation logic

## Next Steps
1. Revert error handling changes while keeping null values
2. Test frontend compatibility with null values
3. Update validation logic if needed
4. Document any breaking changes for frontend team

## Notes
- Keep existing frontend compatibility as priority
- Document all changes that affect API response structure
- Test each change with real user scenarios
- Maintain fallback card recommendations in error cases 