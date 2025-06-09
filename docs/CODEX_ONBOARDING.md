# CardGenius AI – Codex On-Boarding & Technical Skeleton  
*(branch: `fix/duckdb-typescript-issues` – June 2025)*

---

## 0  TL;DR

*CardGenius AI* aims to expose a **Model Context Protocol (MCP) server** that ChatGPT (or any
OpenAI-compatible client) can query to receive **data-driven credit-card recommendations**
based on spend patterns.  
Under the hood we:

1. **Load CSVs ➜ DuckDB (WASM)** to keep everything serverless & embeddable.  
2. **Expose a `/api/card` chat-style endpoint (OpenAI JSON)** that runs SQL on DuckDB and
   returns the top cards with savings math baked in.  
3. Serve two static JSON files that make the service discoverable:

   * `/.well-known/ai-plugin.json`
   * `/mcp/model.json`

The branch currently boots, but TypeScript & module-resolution issues keep the API from
running end-to-end.

---

## 1  High-Level Architecture

CSV files ─┐
│ import_data.ts (one-time)
▼
DuckDB WASM ◄───────── getConnection() (singleton)
▲
│ SQL
┌───────────┴─────────────┐
│ ExpressJS API (Node) │ « /api/card (POST Chat-like payload)
└───────────┬─────────────┘
│ JSON (OpenAI schema)
▼
Front-end (React + Vite)
│ fetch('/api/card', {prompt})
▼
End-user / ChatGPT

---

## 2  Primary Goals (MVP)

| ID | Description | Acceptance Criteria |
|----|-------------|---------------------|
| G-1 | **Single DuckDB implementation** | Only `@duckdb/duckdb-wasm` in *package.json*; no native `duckdb` binary present |
| G-2 | **CSV → DuckDB loader** | Script populates `cards` table; `SELECT COUNT(*)` prints >0 |
| G-3 | **Chat-style endpoint** (`POST /api/card`) | Accepts `{prompt:string}` and returns an OpenAI-compatible JSON completion with recommended cards |
| G-4 | **TypeScript clean build** | `ts-node --esm -P tsconfig.api.json src/api/main.ts` runs without runtime or compile errors |
| G-5 | **MCP metadata** | Hitting site root shows `.well-known/ai-plugin.json` that points to `mcp/model.json`, which in turn points to `/api/card` |

---

## 3  Repository Layout (expected)

.
├── data/ # CSVs (checked in, small)
├── src/
│ ├── api/
│ │ ├── db.ts # DuckDB singleton bootstrapper
│ │ ├── import_data.ts # CSV → DuckDB loader
│ │ └── main.ts # Express server
│ └── web/ … # Vite/React (minimal for now)
├── tsconfig.api.json
└── docs/CODEX_ONBOARDING.md # ← THIS FILE

---

## 4  Current Pain-Points

| Symptom | Root Cause |
|---------|------------|
| **“Property `length` does not exist on type `Table<any>`”** | DuckDB WASM returns an Arrow **`Table`**. Needs `.toArray()` or Arrow getters (`numRows`) before using JS array helpers |
| **“Property `query` does not exist on type `AsyncDuckDB`”** | You must create a **connection** (`await db.connect()`) and call `conn.query(...)` |
| **“Unknown file extension ‘.ts’ when running with ts-node”** | `ts-node` needs `--esm` (or transpilation); `tsconfig.api.json` still targets "module": "CommonJS" |
| Native `duckdb` & WASM pkg both in node_modules | Causes duplicate type exports and random symbol leaks |
| Front-end stuck on loading CSV | API wasn’t proxying CSV folder + fetch path mismatch |

---

## 5  Key Dependencies

```jsonc
"dependencies": {
  "@duckdb/duckdb-wasm": "^1.29.0",
  "duckdb-nodefs": "^1.29.0",          // FS shim for Node WASM
  "express": "^4.19.0",
  "cors": "^2.8.5",
  "dotenv": "^16.4.0"
},
"devDependencies": {
  "typescript": "^5.5.0",
  "ts-node": "^10.9.2",
  "cross-env": "^7.0.3"
}
```

## 6  Outstanding Work (for Codex)

1. **Dependency Sweep**

   remove duckdb (native) everywhere, keep only WASM.
2. **Create src/api/db.ts**

   Bootstrap WASM once, return singleton connection.
3. **Patch src/api/main.ts**

   Replace direct db.query with getConnection() helper.

   Convert Arrow result to JS array before .length etc.
4. **Write src/api/import_data.ts**

   CREATE TABLE IF NOT EXISTS cards AS SELECT * FROM read_csv_auto('data/Cards sheet.csv', header=true);
5. **Update tsconfig.api.json**

   "module": "ESNext", "moduleResolution": "NodeNext", "types": ["node"].
6. **Package Scripts**

```jsonc
"scripts": {
  "dev:api": "cross-env NODE_NO_WARNINGS=1 ts-node --esm -P tsconfig.api.json src/api/main.ts",
  "seed": "ts-node -P tsconfig.api.json src/api/import_data.ts"
}
```
7. **Add MCP metadata**

   public/.well-known/ai-plugin.json

   public/mcp/model.json
8. **Write front-end fetch helper (src/web/utils/fetchCard.ts) that posts {prompt}.**
9. **End-to-end test**

   pnpm seed && pnpm dev:api ➜ curl -XPOST /api/card {prompt:"Flipkart 10k"} returns JSON with rows.

---

## 7  Data Source Reference

(all CSVs live under /data, UTF-8, header row present)

| File | Key columns (examples) |
|------|-----------------------|
| Cards sheet.csv | name, issuer, cashback_rate, annual_fee |
| Category Caps.csv | card_name, category, monthly_cap |
| Spending Categories New.csv | category, description |
| Welcome benefits.csv | card_name, bonus_value |
| Food Benefits.csv | card_name, zomato_rate, swiggy_rate |
| Travel Benefits.csv | card_name, lounge_visits, airmiles_rate |
| Milestone benefits.csv | card_name, spend_threshold, milestone_bonus |

(Codex: infer column types with read_csv_auto and create additional tables if needed.)

---

## 8  MCP Metadata – Minimal Example

`/.well-known/ai-plugin.json`

```json
{
  "schema_version": "v1",
  "name_for_model": "cardgenius",
  "type": "openai-mcp",
  "mcp_spec_version": "v1",
  "model_spec_url": "https://<HOST>/mcp/model.json"
}
```

`/mcp/model.json`

```json
{
  "version": "v1",
  "model_id": "cardgenius",
  "model_name": "CardGenius",
  "model_capabilities": ["chat"],
  "chat_completion_url": "https://<HOST>/api/card",
  "input_format": "openai",
  "output_format": "openai"
}
```

---

## 9  Future (Post-MVP) Roadmap

| Stage | Feature |
|------|---------|
| P2 | Natural-language → SQL via GPT-4 (internal) for richer prompts |
| P2 | Full spend-pattern calculator (accepts structured JSON of monthly spends) |
| P3 | Streaming responses (OpenAI chunk format) |
| P3 | Caching layer (SQLite / Redis) for repeated prompts |
| P4 | Auth & rate limiting; production hosting on Render / Vercel Functions |

---

## 10  How to Run (once fixes land)

```bash
# install deps
pnpm i

# seed DB
pnpm run seed

# start API
pnpm run dev:api        # => http://localhost:8080

# optional front-end
pnpm --filter web dev   # => http://localhost:5173
```

### Test:

```bash
curl -X POST http://localhost:8080/api/card \
     -H "Content-Type: application/json" \
     -d '{"prompt":"Best card for 10k Flipkart shopping"}'
```

---

**End of On-Boarding**

Please keep this document updated whenever major architectural changes land.
