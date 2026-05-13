# CardGenius AI v2

A Next.js prototype for conversational credit-card recommendations. The app turns natural-language spending descriptions into structured spend profiles, asks follow-up questions when details are missing, and calls a configurable recommendation backend.

This public version is source-only. Internal planning notes, live partner endpoints, debug traces, and local credentials are intentionally excluded.

## What It Shows

- Conversational spend collection with session state
- OpenAI-powered parsing for initial intent and follow-up answers
- Brand/category mapping for common spend descriptions
- Recommendation display with error handling and retry support
- Configurable backend integration for a future public CardGenius or Great.cards MCP bridge
- Next.js App Router API routes and React UI components

## Stack

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- OpenAI SDK
- Iron Session
- Jest

## Local Setup

```bash
npm install
copy .env.example .env.local
npm run dev
```

Update `.env.local` with your own values:

```bash
OPENAI_API_KEY=<openai_api_key>
SESSION_PASSWORD=<replace_with_32_plus_character_secret>
CARD_RECOMMENDATION_API_URL=https://api.example.com/cardgenius/recommendations
CARDGENIUS_API_KEY=<optional_cardgenius_api_key>
```

The recommendation endpoint is intentionally a placeholder. Point it to your own service or MCP-compatible bridge before using the app end to end.

## Scripts

```bash
npm run dev
npm run build
npm test
```

## Public-Readiness Notes

Before publishing future changes:

- Keep real `.env*` files out of git
- Do not commit live partner endpoints or generated debug traces
- Avoid logging request bodies, API keys, session secrets, or full provider responses
- Keep public docs focused on architecture and setup rather than internal planning

