<p align="center">
  <img
    src="./public/ira-logo.png"
    alt="IRA — Inventory Risk Assistant"
    width="420"
  />
</p>

<p align="center">
  AI-powered inventory planning platform for stockout risk analysis,
  SKU prioritization, inventory health, and replenishment decision support.
</p>

---

# IRA — Inventory Risk Assistant

IRA is a web application designed to help inventory planners investigate a portfolio of approximately 8,000 SKUs and decide which products deserve replenishment attention first.

The application combines:

- explainable inventory risk scoring;
- portfolio-level analytics;
- stale inventory analysis;
- supplier risk visibility;
- an interactive SKU explorer;
- and an AI assistant grounded in the actual inventory database.

The inventory dataset is synthetic and represents a snapshot taken on **March 31, 2026**.

## Live Application

https://inventory-risk-assistant.vercel.app

---

## Product Goal

Inventory planners typically need to answer questions such as:

- Which SKUs are most likely to stock out?
- Which products need replenishment before supplier lead time expires?
- Which suppliers concentrate the most inventory risk?
- Which products have been sitting in inventory without sales?
- Where is capital tied in stale stock?
- Which high-margin products deserve additional attention?
- Why was a particular SKU classified as High or Critical risk?

IRA turns a raw inventory export into a prioritized and explainable decision-support workflow.

---

# Core Features

## Inventory Dashboard

The dashboard provides a high-level portfolio view with:

- total SKUs;
- Critical-risk SKUs;
- High + Critical at-risk SKUs;
- current inventory value;
- risk distribution;
- inventory value by category;
- at-risk SKUs by category.

Current validated portfolio metrics:

| Metric | Value |
| --- | ---: |
| Total SKUs | 8,000 |
| Critical Risk | 141 |
| High + Critical Risk | 835 |
| Inventory Value | R$ 81,390,800.09 |

---

## Inventory Health

IRA intentionally separates **replenishment risk** from **inventory health**.

A product may have Low stockout risk while still representing inefficient capital allocation because it has not sold for a long period.

The Inventory Health section currently identifies:

| Metric | Value |
| --- | ---: |
| SKUs with no sale for 60+ days | 574 |
| Capital tied in stale inventory | R$ 4,206,801.68 |
| High-margin stale SKUs | 164 |

This prevents slow-moving products from being incorrectly classified as stockout risks.

---

## Interactive SKU Explorer

The SKU Explorer supports server-side:

- search by SKU ID or product name;
- category filtering;
- supplier filtering;
- risk-level filtering;
- maximum current stock;
- maximum coverage days;
- minimum margin percentage;
- sorting by replenishment risk;
- sorting by current stock;
- sorting by coverage days;
- sorting by margin;
- pagination.

Filtering and sorting happen in PostgreSQL before pagination, rather than loading all 8,000 records into the browser.

High and Critical rows are also visually highlighted to make prioritized SKUs easier to identify.

---

# Risk Prioritization Model

The dataset does not provide priority labels.

IRA therefore uses a transparent heuristic scoring model based on inventory-management signals.

Each SKU receives a score from **0 to 100**.

## 1. Inventory Coverage vs. Supplier Lead Time

Coverage is calculated as:

```text
coverageDays = currentStock / dailySales30dAvg
```

The coverage ratio is:

```text
coverageRatio = coverageDays / leadTimeDays
```

Rules:

| Condition | Score |
| --- | ---: |
| Coverage below 50% of supplier lead time | +50 |
| Coverage below supplier lead time | +40 |

Coverage is the primary replenishment signal because it compares how long current inventory is expected to last with how long replacement inventory takes to arrive.

---

## 2. Recent Stockout History

| Condition | Score |
| --- | ---: |
| More than 10 stockout days in the last 90 days | +20 |
| At least one stockout day in the last 90 days | +10 |

A SKU that repeatedly stocked out recently deserves additional attention because historical instability may indicate recurring replenishment problems.

---

## 3. Demand Acceleration

```text
dailySales30dAvg > dailySales90dAvg * 1.20
```

If recent demand is more than 20% above the 90-day average:

```text
+10 points
```

This identifies products whose recent consumption is increasing faster than their longer-term baseline.

---

## 4. Seasonal Demand

If:

```text
seasonalIndex > 1.20
```

the SKU receives:

```text
+5 points
```

Seasonality acts as a supporting signal rather than a primary risk driver.

---

## 5. Active Demand With Zero Inventory

A SKU with:

```text
currentStock = 0
```

and active recent demand receives:

```text
riskScore = 100
```

This represents an immediate replenishment problem.

---

## Risk Levels

| Score | Level |
| --- | --- |
| 0–19 | Low |
| 20–39 | Medium |
| 40–69 | High |
| 70–100 | Critical |

The final score is capped at 100.

### Important Design Decision

High margin, stale inventory, and general business impact are **not automatically treated as stockout probability**.

For example:

```text
High margin ≠ High stockout risk
```

and:

```text
Stale inventory ≠ High stockout risk
```

This distinction avoids mixing different business problems into a single misleading score.

---

# AI Inventory Assistant

IRA includes an AI decision-support interface powered by Google Gemini.

The assistant does not receive unrestricted database or SQL access.

Instead, Gemini can call a controlled set of **read-only inventory tools**.

## Available AI Tools

### `get_inventory_summary`

Returns:

- portfolio metrics;
- risk distribution;
- category-level analytics.

### `get_inventory_health`

Returns:

- stale inventory metrics;
- capital tied in stale stock;
- high-margin stale inventory;
- suppliers ranked by at-risk SKU concentration.

### `search_inventory`

Allows Gemini to search real inventory data by:

- SKU;
- category;
- supplier;
- risk level;
- prioritization order.

### `search_stale_inventory`

Allows the assistant to investigate products based on:

- days since last sale;
- minimum margin;
- category;
- supplier;
- inventory value.

### `get_sku_details`

Returns detailed information about one specific SKU and calculates its authoritative risk assessment using the same application risk engine.

---

## AI Grounding and Safety

The assistant is instructed to:

- use inventory tools for factual inventory questions;
- never invent SKUs or portfolio metrics;
- preserve canonical risk labels:
  - Low;
  - Medium;
  - High;
  - Critical;
- distinguish scoring reasons from supporting context;
- distinguish stale inventory from stockout risk;
- avoid claiming lost sales when the dataset does not establish them;
- avoid treating reorder point as safety stock automatically;
- avoid unsolicited recommendations when the user only requested factual results;
- keep all inventory tools read-only.

The assistant can answer in both English and Brazilian Portuguese.

Conversation history is maintained within the current browser session, allowing contextual follow-up questions such as:

```text
User:
Show me the 3 highest-risk FOOD products.

User:
Which of those has the highest margin?

User:
Who supplies it?
```

---

# Architecture

```mermaid
flowchart TD
    U[Inventory Planner]

    U --> UI[Next.js Web Application]

    UI --> D[Dashboard Analytics]
    UI --> E[SKU Explorer]
    UI --> C[AI Assistant]

    D --> P[(PostgreSQL / Supabase)]

    E --> API[/api/skus]
    API --> P

    C --> A[/api/assistant]
    A --> G[Google Gemini]

    G --> T[Controlled Read-Only Tools]

    T --> S[Inventory Summary]
    T --> H[Inventory Health]
    T --> Q[Inventory Search]
    T --> ST[Stale Inventory Search]
    T --> X[SKU Details]

    S --> P
    H --> P
    Q --> P
    ST --> P
    X --> P
```

---

# Technology Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 |
| UI | React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Database | PostgreSQL / Supabase |
| ORM | Prisma 7 |
| Database Adapter | `@prisma/adapter-pg` |
| Charts | Recharts |
| AI | Google Gemini |
| AI SDK | `@google/genai` |
| Markdown | React Markdown + Remark GFM |
| CSV Parsing | `csv-parse` |
| Deployment | Vercel |

---

# Data Layer

The provided CSV is stored in:

```text
data/skus.csv
```

It contains 8,000 synthetic inventory records.

The application imports the CSV into PostgreSQL and stores inventory fields such as:

- SKU ID;
- product name;
- category;
- supplier;
- unit cost;
- unit price;
- current stock;
- reorder point;
- reorder quantity;
- supplier lead time;
- 30-day average sales;
- 90-day average sales;
- last sale date;
- last reorder date;
- historical stockout days;
- seasonal index;
- margin.

Indexes are defined for category and supplier to support common filtering operations.

---

# Local Setup

## Requirements

Recommended:

```text
Node.js 20+
npm
PostgreSQL-compatible database
Google Gemini API key
```

The project was developed using Node.js 24.

---

## 1. Clone the Repository

```bash
git clone https://github.com/VictorMCN/inventory-risk-assistant.git
cd inventory-risk-assistant
```

---

## 2. Install Dependencies

```bash
npm install
```

The `postinstall` script automatically generates the Prisma Client:

```text
prisma generate --schema=prisma/schema.prisma
```

---

## 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL=
DIRECT_URL=
GEMINI_API_KEY=
```

### `DATABASE_URL`

Runtime PostgreSQL connection used by the application.

For Supabase, the transaction pooler is appropriate for application runtime and serverless workloads.

### `DIRECT_URL`

Direct or session-based PostgreSQL connection used by Prisma migrations.

### `GEMINI_API_KEY`

Server-side API key used by the AI assistant.

Do not expose this variable using a `NEXT_PUBLIC_` prefix.

Environment files are excluded from Git.

---

## 4. Apply Database Migrations

```bash
npx prisma migrate deploy
```

---

## 5. Import the Dataset

```bash
npx tsx scripts/import-skus.ts
```

The importer validates the source dataset and inserts inventory records in batches.

---

## 6. Start the Development Server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

# Project Structure

```text
inventory-risk-assistant/
├── data/
│   └── skus.csv
│
├── docs/
│   ├── product-requirements.md
│   └── risk-engine.md
│
├── prisma/
│   ├── migrations/
│   └── schema.prisma
│
├── public/
│   └── ira-logo.png
│
├── scripts/
│   ├── import-skus.ts
│   ├── test-ai-tools.ts
│   ├── test-case-completion-tools.ts
│   ├── test-gemini.ts
│   ├── test-inventory-assistant.ts
│   ├── validate-dashboard-metrics.ts
│   ├── validate-inventory-analytics.ts
│   ├── validate-inventory-health.ts
│   ├── validate-sku-explorer.ts
│   └── validate-sku-explorer-filters.ts
│
└── src/
    ├── app/
    │   ├── api/
    │   │   ├── assistant/
    │   │   └── skus/
    │   ├── layout.tsx
    │   └── page.tsx
    │
    ├── components/
    │   ├── analytics/
    │   ├── assistant/
    │   ├── dashboard/
    │   └── inventory/
    │
    ├── lib/
    │   ├── ai/
    │   ├── analytics/
    │   ├── data/
    │   ├── database/
    │   └── risk/
    │
    └── types/
```

---

# Validation Strategy

Because the risk model is implemented in TypeScript while several portfolio queries are calculated directly in PostgreSQL for performance, validation scripts compare both implementations.

This helps prevent SQL-based analytics from silently drifting away from the application's canonical risk logic.

## Risk Distribution

Validated portfolio distribution:

```text
Low:       6,795
Medium:      370
High:        694
Critical:    141
```

```text
High + Critical: 835
```

---

## Inventory Health

```text
Stale SKUs:
JavaScript = 574
SQL        = 574

Stale inventory value:
JavaScript = R$ 4,206,801.68
SQL        = R$ 4,206,801.68

High-margin stale SKUs:
JavaScript = 164
SQL        = 164
```

---

## SKU Explorer Numeric Filters

```text
Maximum stock:
Expected = 2,797
SQL      = 2,797

Maximum coverage:
Expected = 1,072
SQL      = 1,072

Minimum margin:
Expected = 4,187
SQL      = 4,187
```

Combined validation:

```text
Category: FOOD
Risk: Critical
Coverage <= 7 days
Margin >= 40%

Expected = 10
SQL      = 10
```

---

# Key Engineering Decisions

## Server-Side Inventory Exploration

The application does not send all 8,000 SKUs to the browser.

Search, filtering, sorting, risk calculation, counting, and pagination happen on the server.

The browser receives only the current page of results.

This improves:

- initial payload size;
- responsiveness;
- scalability;
- separation of presentation and data logic.

---

## PostgreSQL Aggregation

Dashboard metrics and analytics are calculated directly in PostgreSQL rather than loading the complete dataset into application memory.

This keeps portfolio-level operations efficient while still allowing the TypeScript implementation to act as the validated reference for risk behavior.

---

## Controlled AI Function Calling

Gemini cannot execute arbitrary SQL.

Instead, it chooses from a small set of controlled read-only functions whose parameters are validated by the application.

The flow is:

```text
User
  ↓
Gemini
  ↓
Controlled function call
  ↓
Application validation
  ↓
PostgreSQL / Prisma
  ↓
Validated inventory data
  ↓
Gemini response
```

This provides contextual AI capabilities while keeping database access constrained.

---

## Explainability Over Black-Box Complexity

The risk engine intentionally uses understandable heuristics rather than an opaque predictive model.

Since the supplied dataset has no priority labels, a supervised classification model could not be objectively trained or evaluated against known priority outcomes.

The scoring model therefore favors:

- business interpretability;
- explicit assumptions;
- deterministic behavior;
- easy validation;
- explainable decisions.

---

## Risk and Inventory Health Are Separate Concepts

Stockout risk answers:

```text
Could this product run out before replenishment arrives?
```

Inventory health answers:

```text
Is capital inefficiently tied in this inventory?
```

Treating them separately prevents contradictory inventory situations from being hidden inside one score.

---

## Reorder Point Is Context, Not Ground Truth

The source dataset includes a historical `reorderPoint`, but the case explicitly indicates that it may be outdated.

For this reason, IRA does not use reorder point as an independent primary risk signal.

Coverage relative to supplier lead time is treated as a more direct operational indicator.

---

# Current Scope and Trade-offs

IRA is designed as a functional decision-support prototype.

Current decisions include:

- conversation memory lasts for the current browser session rather than being persisted;
- inventory tools are intentionally read-only;
- authentication is not included;
- the inventory snapshot is fixed to March 31, 2026;
- replenishment recommendations support planner decisions but do not automatically create purchase orders;
- reorder point is displayed as context but is not trusted as a standalone risk signal;
- risk SQL is optimized for server-side analytics and validated against the TypeScript risk engine.

These choices prioritize the core inventory-planning workflow, explainability, and end-to-end reliability.

---

# Useful Commands

Development:

```bash
npm run dev
```

Lint:

```bash
npm run lint
```

Production build:

```bash
npm run build
```

Generate Prisma Client:

```bash
npx prisma generate
```

Apply production migrations:

```bash
npx prisma migrate deploy
```

Import SKU data:

```bash
npx tsx scripts/import-skus.ts
```

Validate dashboard metrics:

```bash
npx tsx scripts/validate-dashboard-metrics.ts
```

Validate inventory analytics:

```bash
npx tsx scripts/validate-inventory-analytics.ts
```

Validate inventory health:

```bash
npx tsx scripts/validate-inventory-health.ts
```

Validate SKU Explorer:

```bash
npx tsx scripts/validate-sku-explorer.ts
```

Validate numeric SKU Explorer filters:

```bash
npx tsx scripts/validate-sku-explorer-filters.ts
```

Test AI inventory tools:

```bash
npx tsx scripts/test-ai-tools.ts
```

Test case-completion AI tools:

```bash
npx tsx scripts/test-case-completion-tools.ts
```

---

# Security Notes

Sensitive configuration is stored only in environment variables.

The following files are ignored by Git:

```text
.env*
```

Secrets such as:

```text
DATABASE_URL
DIRECT_URL
GEMINI_API_KEY
```

must never be committed to the repository.

The Gemini key is used only on the server.

The AI assistant has read-only access to controlled application functions and cannot execute arbitrary SQL or modify inventory records.

---

# Author

**Victor Macene**

Built as an inventory planning and product engineering case focused on explainable prioritization, usable analytics, scalable data access, and grounded AI assistance.