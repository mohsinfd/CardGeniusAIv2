# OpenAI Integration Issues

## Issue #1: Incorrect Spending Data Interpretation
**Date Reported**: [Current Date]

### Description
When user requests a card with specific benefits (fuel, dining, lounge), the OpenAI response incorrectly handles the spending data structure:

1. **Incorrect Time Periods**:
   - Fuel and dining are monthly spends, but response treats them as quarterly
   - Domestic lounge access is a quarterly number of visits, but response doesn't handle this correctly

2. **Redundant Questions**:
   - Response includes both `content` and `follow_up_question` with similar questions
   - This creates a repetitive user experience

### Example
**User Request**: "I want a card with fuel, dining and lounge benefits"

**Current Response**:
```json
{
  "content": "Could you please specify how much you spend on fuel, dining and lounge usage?",
  "follow_up_question": "How much do you spend quarterly on fuel, dining, domestic lounge usage, and international lounge usage?",
  "ready_for_recommendations": false,
  "recommendations": null,
  "spending_data": {
    // All fields initialized to 0
  }
}
```

### Expected Behavior
1. Should correctly identify:
   - Fuel and dining as monthly spends
   - Lounge access as quarterly number of visits
2. Should not repeat questions in both `content` and `follow_up_question`
3. Should initialize only relevant spending fields

### Impact
- Confuses users with redundant questions
- May lead to incorrect spending calculations
- Could affect card recommendation accuracy

### Priority
Medium - Affects user experience and data accuracy

### Status
Open - Needs prompt engineering review

## Issue #2: API Response Validation Error
**Date Reported**: [Current Date]

### Description
The application is experiencing a critical error in the card recommendations API flow:

1. **Error Pattern**:
   - First prompt works successfully
   - Second prompt fails with 500 Internal Server Error
   - Error occurs in the card recommendations validation

2. **Error Details**:
   ```
   Response validation error: Error: Missing required field: image
   at validateCardRecommendation
   ```

3. **Console Logs**:
   - Shows repeated placeholder cycling
   - Multiple empty array logs (`[] ' MMMMM '`)
   - Eventual failure in card recommendations API call

### Impact
- Breaks the user flow after the first interaction
- Prevents users from getting card recommendations
- Creates a poor user experience with error messages

### Root Cause
The error suggests that the card validation is failing because the `image` field is missing in the response. This could be due to:
1. Incomplete card data in the response
2. Validation being too strict
3. Data transformation issues between API calls

### Priority
High - This is a critical flow-breaking issue

### Status
Open - Needs immediate investigation

### Notes
- Need to check the response validator implementation
- Review the card data structure requirements
- Consider adding fallback values for missing fields
- May need to update the validation logic to handle partial data

## Notes
- This issue should be addressed through prompt engineering
- May require updates to the spending data structure
- Consider adding validation for time periods in the response 