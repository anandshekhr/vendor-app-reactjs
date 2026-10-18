# TheNearByShop Vendor Portal

The business portal for vendors on TheNearByShop, for both **product vendors** (grocery, dairy, bakery, pharmacy, retail) and **service providers** (salons, electricians, plumbers, cleaning, repairs). It is a React + TypeScript single-page app that talks to the existing Django REST backends.

> The previous React Native app now lives in [`legacy-react-native/`](legacy-react-native/), unchanged. Its API layer pointed at endpoints the backend doesn't have, so this portal does not reuse it.

## Documentation

| Document | Contents |
|---|---|
| [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md) | Repository analysis, architecture, offline POS design, phase status |
| [`API_MAPPING.md`](API_MAPPING.md) | Every feature mapped to the real Django endpoint, plus **backend gaps (G-1…G-14)** and **security findings (S-1…S-4)** |

## Features

| Area | What works | Limited by the backend (see API_MAPPING) |
|---|---|---|
| Auth | Mobile OTP login, JWT with single-flight refresh, session expiry, protected routes, capability-based navigation | Server-side token revocation (G-1) |
| Onboarding | Multi-step application: phone OTP, business, categories, location, hours and staff (services), GSTIN, documents | Status lookup after submitting (G-3) |
| Dashboard | Product and service dashboards with live KPIs, a 14-day revenue trend, categories, quick actions, upcoming appointments | Custom date ranges, best sellers, payment mix (G-4) |
| Orders | List, search, status tabs, detail with items, timeline, permitted actions with confirmation, new-order polling | Returns (G-5) |
| Delivery | Delivery queue by stage, assigning a nearby partner, progress derived from order status | Partner location, ETA and live map (G-6) |
| Products | CRUD with server-generated SKU, barcode registration, bulk activate/deactivate/delete, master catalogue import | Variants, tax, batch/expiry (G-7) |
| Inventory | Stock summary, stock levels, typed adjustments showing the server's before/after values, low-stock reorder list, a local adjustment log | Server stock ledger and row locking (G-8) |
| Scanner | Camera (ZXing) with continuous scanning, USB/Bluetooth wedge scanners, manual entry, unknown barcode → create product | — |
| POS | Product grid, scan-to-add, quantity controls, walk-in or named customer, cash/UPI/card, printable receipt, sales history | Discounts and tax rules, refunds (G-9) |
| Offline POS | IndexedDB catalogue, offline cash sales, provisional receipts, idempotency keys, safe sync, conflict and unknown-outcome reconciliation | Server-side idempotency (G-9) |
| Services | Shop services from the catalogue, bookings with lifecycle actions, rescheduling, balance collection, staff list, weekly availability, server-computed slots | Accept/reject, assigning staff, staff CRUD (G-10) |
| Customers | Directory built from your own orders | Customer API (G-12) |
| Chat | Inbox and conversation over the existing chat API, polling, failed-message retry, explicit error states | Backend message endpoints are broken; no realtime (G-13) |
| Finance | Wallet balances, transactions, bank accounts (masked, with verification status), withdrawal flow with review and reference ID | Idempotency and balance reservation (G-11) |
| Profile | Storefront, logo/banner, opening hours, accepting-orders toggle, GSTIN/PAN/registration, KYC status | Address and map editing (S-3), holidays and coverage (G-2) |
| Reports | Sales, stock, bookings and payouts, with CSV export | Date-range reports (G-4) |
| Notifications | In-app feed for new orders and bookings, low stock and sync problems | Push and server-side feed (G-14) |

Each limitation shows up in the UI as a labelled notice (`BackendGap`). The portal never shows placeholder numbers, live locations or success messages it can't back up.

## Getting started

```bash
cp .env.example .env          # set VITE_API_BASE_URL
npm install
npm run dev                   # http://localhost:5173
```

To work without a backend, set `VITE_USE_MOCK_API=true` in `.env`. Then sign in with any valid mobile number and OTP **1234**. To see the service-provider portal, run `localStorage.setItem('tnbs.mock.type','service')` in the browser console and reload.

### Environment variables

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Main API origin (`api-services`), e.g. `https://api.thenearbyshop.com` (**required**) |
| `VITE_VENDOR_API_BASE_URL` | Vendor-service origin for POS endpoints. Leave empty if your gateway already routes `/api/v2/vendors/pos/*` |
| `VITE_USE_MOCK_API` | `true` turns on the in-browser mock (development only) |
| `VITE_GOOGLE_MAPS_API_KEY` | Reserved for the delivery map (stays disabled until G-6 is fixed) |
| `VITE_OFFLINE_PAYMENT_METHODS` | Payment methods allowed offline (default `cash`) |
| `VITE_POS_STALE_CATALOGUE_MINUTES` | Age after which the offline catalogue is flagged stale (default 60) |
| `VITE_POS_SERVER_IDEMPOTENCY` | Set `true` only after POS checkout honours `Idempotency-Key`. Enables automatic retry of sales whose sync outcome is unknown |
| `VITE_POLL_INTERVAL_MS` | Polling interval for new orders, bookings and deliveries (default 20000) |

The backend must allow your portal origin in CORS (`DJANGO_CORS_EXTRA_ORIGINS`).

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Type-check and production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | TypeScript only |
| `npm test` | Unit and integration tests (Vitest + React Testing Library, fake IndexedDB) |
| `npm run test:e2e` | Playwright end-to-end tests against the mock API, at desktop and mobile sizes |

In environments with a pre-installed Chromium, point Playwright at it:

```bash
PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run test:e2e
```

## Offline POS: how it stays safe

* Each offline sale gets a UUID idempotency key and is stored in IndexedDB as `pending`, along with the shop it belongs to. A shared device never syncs one vendor's sales into another vendor's account.
* A sale is marked `syncing` *before* its request is sent, and `synced` only after the server returns the created order.
* A request that may have reached the server without an answer (timeout, connection reset, 5xx) becomes **Needs review** and is not resent automatically, because checkout isn't idempotent server-side yet. The cashier matches it to a server sale or explicitly re-queues it.
* If the server rejects a sale (for example, not enough stock), it becomes a **conflict**. Server stock is never overwritten. The cashier can reduce quantities and retry, or void the sale and settle with the customer.
* Only one sync runs at a time, even across browser tabs (Web Locks). After a sync, the catalogue is refreshed from the server.
* Only the methods in `VITE_OFFLINE_PAYMENT_METHODS` are allowed offline. Online UPI/card sales need the cashier to confirm the payment arrived, because the backend records POS sales as paid without checking with the payment provider.

## Deployment

```bash
docker build --build-arg VITE_API_BASE_URL=https://api.thenearbyshop.com -t tnbs-vendor-portal .
docker run -p 8080:8080 tnbs-vendor-portal
```

The image is a static nginx server ([`deploy/nginx.conf`](deploy/nginx.conf)). Its SPA fallback means refreshing a nested route like `/orders/123` returns the app, not a 404. Hashed assets are cached for a year and `index.html` is never cached. `/healthz` is the health check. Because `VITE_*` values are baked in at build time, build one image per environment.

### Monitoring recommendations

* Send errors from `ErrorBoundary.componentDidCatch` (`src/components/feedback/ErrorBoundary.tsx`) to an error tracker such as Sentry, with source maps (already produced by `vite build`) uploaded privately rather than served.
* Alert on API 5xx rates and on POS sales stuck in **Needs review**. Adding a server-side reconciliation report once G-9 is fixed is recommended.
* Uptime-check `/healthz` and the API's own health endpoint.

## Project structure

```
src/
├── app/            router, store, providers, UI slice
├── components/     ui (design system), layout, tables, charts, forms, feedback
├── features/       auth, onboarding, dashboard, orders, delivery, products, inventory, scanner,
│                   pos, offline-sync, customers, chat, services, bookings, employees, wallet,
│                   bank-accounts, withdrawals, profile, notifications, reports
├── services/       api (axios clients, RTK Query, errors, mock), auth (tokens), offline (Dexie, sync engine),
│                   scanner (camera, wedge, dedupe), printing (receipt)
├── hooks/  types/  utils/  constants/  styles/  test/
e2e/                Playwright specs
deploy/             nginx config
```

## Security notes

* The access token lives in memory only. The refresh token is in `localStorage` so offline POS and page reloads keep working (the backend has no httpOnly-cookie flow). Signing out clears tokens and cached data on the device. Unsynced sales are kept, scoped to their shop.
* Bank account numbers are sent straight to the server and never stored in the browser. Lists show only the server-masked number.
* Frontend permission checks are for UX only. The portal uses the shop-scoped `/vendor/dashboard/api/` endpoints wherever they exist. See **S-1…S-4** in API_MAPPING.md for backend issues that need fixing, including a **critical OTP disclosure** in the onboarding API.
