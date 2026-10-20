# Style More POS — Hostinger PHP API

Deployed at `https://style.lecadeaupk.com/api`

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | no | Health check |
| POST | `/login` | no | `{username,password}` → token |
| GET | `/store` | yes | products + sales + expenses + settings + exchanges |
| PUT | `/store` | yes | replace full store (exchanges only if included) |
| PUT | `/settings` | yes | `{usdRate}` store-wide USD rate |
| POST | `/products` | yes | upsert product |
| POST | `/sales` | yes | upsert sale; `409 Out of stock` if it exceeds remaining stock |
| DELETE | `/sales/{id}` | yes | delete sale |
| POST | `/expenses` | yes | upsert expense |
| DELETE | `/expenses/{id}` | yes | delete expense |
| POST | `/exchanges` | yes | upsert currency exchange (SYP ↔ USD) |
| DELETE | `/exchanges/{id}` | yes | delete currency exchange |

## Server layout

- App + API: `/home/u119189099/domains/lecadeaupk.com/public_html/style`
- Secrets (outside web root): `/home/u119189099/domains/lecadeaupk.com/private/style_pos_config.php`
- DB: `u119189099_pos_app`

## Frontend env

```
VITE_API_URL=https://style.lecadeaupk.com/api
```

## Pricing model

- `products.cost_usd` × `products.usd_rate` = `products.cost` (SYP) for USD-costed products; others keep a manual SYP cost.
- Changing the USD rate in Settings recalculates those costs and scales the selling price to keep the same profit %.
- Each sale stores `unit_price`, `unit_cost` and `unit_cost_usd` at sale time, so later price changes don't alter past profit.
- Expenses in the "شراء بضاعة جديدة" category are listed but not deducted from net profit (stock cost is counted when items sell).
- Currency exchanges are a separate log and are not part of any report.

## Migrations (in order, for an existing database)

1. `sql/migrate_quick_sale.sql`
2. `sql/migrate_sold_by.sql`
3. `sql/migrate_unit_cost.sql`
4. `sql/migrate_price_usd.sql`
5. `sql/migrate_usd_rate.sql`
6. `sql/migrate_cost_usd.sql`
7. `sql/migrate_exchanges.sql`
