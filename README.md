# Stayle & More — Store Manager POS

Point-of-sale and store management UI for **Stayle & More**, with a React frontend and a PHP/MySQL API.

**Live API:** https://style.lecadeaupk.com/api

## What this project does

- Sell products with stock checks and seller tracking
- Track operating expenses (add / edit / delete) with cloud sync
- Reports for profit, with optional USD view using a store-wide exchange rate
- Currency exchange log (SYP ↔ USD), separate from sales reports
- Bulk price adjustments and per-sale price/cost snapshots so past profit stays accurate
- Works offline as an installable app (PWA): sales and edits are saved on the device and synced when the connection returns

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite 8, TypeScript, Tailwind CSS v4 |
| Backend | PHP API + MySQL (Hostinger) |
| Offline | `vite-plugin-pwa` (Workbox service worker) + a localStorage outbox |

## Project layout

```
src/                      React app (POS UI)
  App.tsx                 State + all mutations (each one is queued in the outbox)
  pages/, components/     Screens and shared UI
  hooks/useCloudSync.ts   Initial load, 15 s refresh, sync status, sync notifications
  lib/api.ts              HTTP client for the PHP API (typed errors, 20 s timeout)
  lib/cloudStore.ts       API ↔ app data mapping
  lib/syncOutbox.ts       Durable queue of writes waiting for the server
  lib/networkStatus.ts    Online/offline detection
  lib/notifications.ts    System notifications (permission + preference)
  lib/pwa.ts              Service worker registration + "update available"
  locales/                Arabic / English strings
public/
  .htaccess               HTTPS redirect + cache headers for the web root
  sw-notifications.js     Opens the app when a notification is tapped
backend/
  api/                    PHP endpoints (login, store, products, sales, expenses, …)
  sql/                    Schema + migrations
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

## Offline mode and sync

- **First sign-in needs internet.** After that the app opens and works with no connection (app files are cached by the service worker; data lives in `localStorage`).
- **Every write is queued** (`lib/syncOutbox.ts`) and sent in order when the server is reachable. The queue survives reloads, restarts and sign-out. Repeated edits to the same record are merged. API endpoints are idempotent, so a retry after a lost response is safe.
- **Two devices:** the server wins stock conflicts. If the other device sold the last pieces first, the server answers `409` and the sale is removed on this device with a warning. Background refreshes are skipped while edits are waiting, so unsynced work is never overwritten.
- **Failures:** network errors retry on reconnect; `5xx` retries with backoff and shows "sync issue" after 4 attempts; `401` signs the user out and keeps the queue for after the next sign-in; other `4xx` drop that one edit and refresh from the server.
- **Empty server:** the app never wipes local data because the server is empty — it asks before uploading this device's data.
- **Status:** header badge and sidebar card show Online / Saving / N pending / Offline / Sync issue. Settings has a Sync card (pending count, last sync, Sync now) and a Notifications switch.
- **Notifications:** asked once after sign-in. Offline / back online / synced are sent only while the app is in the background; stock conflicts and stuck syncs always. On iPhone they work only after **Add to Home Screen** (iOS 16.4+).
- **Updates:** a new deploy shows an "Update now" banner; the app never reloads itself in the middle of a sale.

### Deploying

- Serve over **HTTPS** — service workers and notifications don't work on `http://`. `public/.htaccess` redirects to HTTPS.
- `public/.htaccess` is copied into `dist/` and must end up in the web root next to `index.html`. It makes `index.html`, `sw.js` and `manifest.webmanifest` revalidate on every load (otherwise phones keep an old version) and caches hashed `assets/` for a year. Hosting dashboards sometimes hide dotfiles when uploading — check it is there.
- Subpath deploys work: `FIGMA_PUBLIC_URL=/sub npm run build` scopes the manifest and service worker to `/sub/`.

## Backend

See [backend/README.md](backend/README.md) for API routes, server paths, pricing rules, and SQL migrations.

Secrets stay outside the web root (`config.example.php` shows the shape; real credentials are not in this repo).

## Notes

- `.env` and `node_modules` / `dist` are gitignored.
- Expense category **شراء بضاعة جديدة** (stock purchases) is listed but not deducted from net profit; cost is counted when items sell.
