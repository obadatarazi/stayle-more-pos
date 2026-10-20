# Stayle & More — Store Manager POS

Point-of-sale and store management UI for **Stayle & More**, with a React frontend and a PHP/MySQL API.

**Live API:** https://style.lecadeaupk.com/api

## What this project does

- Sell products with stock checks and seller tracking
- Track operating expenses (add / edit / delete) with cloud sync
- Reports for profit, with optional USD view using a store-wide exchange rate
- Currency exchange log (SYP ↔ USD), separate from sales reports
- Bulk price adjustments and per-sale price/cost snapshots so past profit stays accurate

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite 8, TypeScript, Tailwind CSS v4 |
| Backend | PHP API + MySQL (Hostinger) |
| Optional sync | Supabase client helpers in `src/lib/` |

## Project layout

```
src/                 React app (POS UI)
  App.tsx            Main screens: sales, products, expenses, reports, settings
  lib/api.ts         HTTP client for the PHP API
  lib/cloudStore.ts  Cloud sync helpers (store, sales, expenses)
backend/
  api/               PHP endpoints (login, store, products, sales, expenses, …)
  sql/               Schema + migrations
supabase/            Optional Supabase schema
```

## Quick start (frontend)

```bash
npm install
cp .env.example .env   # if present; or set VITE_API_URL yourself
npm run dev
```

Environment:

```
VITE_API_URL=https://style.lecadeaupk.com/api
```

Build for production:

```bash
npm run build
```

## Backend

See [backend/README.md](backend/README.md) for API routes, server paths, pricing rules, and SQL migrations.

Secrets stay outside the web root (`config.example.php` shows the shape; real credentials are not in this repo).

## Notes

- `.env` and `node_modules` / `dist` are gitignored.
- Expense category **شراء بضاعة جديدة** (stock purchases) is listed but not deducted from net profit; cost is counted when items sell.
