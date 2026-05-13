# CardGenius Recommendation API

The app calls a configurable recommendation backend from `src/lib/cardGeniusAPI.ts`.

Set the endpoint in `.env.local`:

```bash
CARD_RECOMMENDATION_API_URL=https://api.example.com/cardgenius/recommendations
CARDGENIUS_API_KEY=<optional_cardgenius_api_key>
```

Expected request shape:

```json
{
  "amazon_spends": 5000,
  "flipkart_spends": 0,
  "grocery_spends_online": 3000,
  "online_food_ordering": 2000,
  "other_online_spends": 0,
  "selected_card_id": null
}
```

Expected response shape:

```json
{
  "success": true,
  "message": "Recommendations generated.",
  "savings": []
}
```

The public repo intentionally uses placeholder URLs. Replace them with your own backend or a future public Great.cards MCP-compatible bridge.
