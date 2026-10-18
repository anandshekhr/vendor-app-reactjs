# Implementation Plan — TheNearByShop Vendor Portal (React)

## 1. Repository analysis (Phase 1 findings)

* This repository previously contained a **React Native** vendor app (RN 0.73, Redux Toolkit, Firebase).
  Its API layer targets endpoints (`/vendor/dashboard/stats`, `/vendor/analytics`, `/vendor/notifications`,
  `https://api.thenearbyshop.com/v1`) that do not exist in the Django backends, so it is not functional against
  the real API. It has been moved intact (with git history) to [`legacy-react-native/`](legacy-react-native/)
  so nothing is lost, and the web portal now lives at the repository root.
* The real contracts come from two Django projects that share one Postgres database:
  `api-services` (main monolith, owns the schema) and `tnbs-vendor-service` (vendor service, adds POS).
  Both were inspected at the source level: URLs, views, serializers, models, permissions and settings.
* A legacy vanilla-JS vendor dashboard exists in `tnbs-vendor-service/static/vendor-dashboard/`; its endpoint
  list confirmed which APIs are used in production today.
* Full endpoint mapping, backend gaps (G-1…G-14) and security findings (S-1…S-4) are in
  [`API_MAPPING.md`](API_MAPPING.md).

## 2. Architecture

```
src/
├── app/            router.tsx, store.ts, providers.tsx
├── components/     ui/ (design system), layout/, tables/, charts/, forms/, feedback/
├── features/       one folder per business domain (api.ts + pages + components + tests)
├── services/       api/ (axios clients, RTK Query base, errors, pagination), auth/ (token storage),
│                   offline/ (Dexie DB + sync engine), scanner/ (camera + keyboard-wedge), printing/
├── hooks/  types/  utils/  constants/  styles/
```

* **Data layer**: RTK Query with a custom axios base query (`src/services/api/baseQuery.ts`). Two axios
  instances (main API and vendor service) share one interceptor that attaches the JWT, performs a single-flight
  refresh on 401 and dispatches `sessionExpired` when refresh fails.
* **Capabilities**: `src/features/auth/capabilities.ts` turns the shop profile into a capability set
  (`products`, `inventory`, `pos`, `orders`, `delivery`, `services`, `bookings`, `employees`, …). The sidebar,
  quick actions, dashboard widgets and routes (`<RequireCapability>`) are all driven by it.
* **Server is authoritative**: stock, prices, taxes, discounts, wallet balances and statuses are only ever
  displayed from server responses. The client never computes a value it then persists.
* **Lazy routes** for every feature page; skeletons and error boundaries per route.

## 3. Offline POS design

* Dexie database `tnbs-pos` with tables `products` (catalogue snapshot + `syncedAt`), `sales` (offline sale
  queue), `meta` (last catalogue sync time, device id) and `stockJournal` (device-local adjustment log).
* Each offline sale gets a UUID `clientReference` (idempotency key) at creation, sent as the
  `Idempotency-Key` header and `client_reference` body field so the server can deduplicate once G-9 lands.
* Sale states: `pending → syncing → synced` with failure branches `conflict` (server rejected, e.g.
  insufficient stock — definitive, safe to edit/retry or void) and `unknown` (request may have reached the
  server but no response — **not auto-retried**, because the current backend is not idempotent).
* `syncing` is persisted **before** the request; on app start any sale left in `syncing` is moved to `unknown`.
* Unknown sales are reconciled by the user against recent server POS orders (the UI lists candidate matches by
  time window, total and item count) — "matched → mark synced" or "not on server → retry". When the
  backend supports idempotency, set `VITE_POS_SERVER_IDEMPOTENCY=true` and unknown sales retry automatically.
* Sync runs one sale at a time, on `online` events, on app focus and on demand. It never runs while another
  sync is in progress (Web Locks API with an in-memory fallback, so two tabs cannot sync the same queue).
* After any successful sync the catalogue snapshot is refreshed from the server.
* Offline payment policy (`VITE_OFFLINE_PAYMENT_METHODS`, default `cash`): only listed methods may be used
  offline. UPI/card require explicit cashier confirmation of receipt even online, because the backend marks
  POS orders paid without provider confirmation (G-9).
* The POS shows the catalogue snapshot age and warns when it is older than
  `VITE_POS_STALE_CATALOGUE_MINUTES` (default 60). Offline receipts are marked **PROVISIONAL — PENDING SYNC**.

## 4. Phases & status

| Phase | Scope | Status |
|---|---|---|
| 1 | Repository analysis, `IMPLEMENTATION_PLAN.md`, `API_MAPPING.md` | Done |
| 2 | Vite + TS, Tailwind design system, router, store, API layer, auth (OTP/JWT/refresh/expiry), layout | Done |
| 3 | Dashboard (product + service), onboarding wizard, business profile, hours, documents, settings | Done |
| 4 | Products (list/form/bulk/barcode), inventory (summary, adjustments, low stock, journal), scanner | Done |
| 5 | POS, receipts, Dexie persistence, offline queue, sync engine, reconciliation | Done |
| 6 | Orders list/detail/actions, new-order polling, delivery board, partner assignment | Done |
| 7 | Services, bookings (actions, reschedule), employees, availability | Done |
| 8 | Customers (order-derived), chat inbox (polling, failure-aware) | Done (backend chat broken — G-13) |
| 9 | Wallet, transactions, bank accounts, withdrawals | Done |
| 10 | Reports + CSV, notification centre, tests, Docker/nginx, README | Done |

Features blocked by backend gaps are implemented up to the contract boundary and are explicitly labelled in
the UI (see `src/components/feedback/BackendGap.tsx`) — they never show fabricated data.

## 5. Testing strategy

* **Vitest + React Testing Library + MSW** for unit/integration tests of critical flows: login, capability
  navigation, protected routes, product form, stock adjustment, barcode lookup, POS cart/checkout, offline
  queue, duplicate-sync prevention, sync conflicts, order actions, delivery state mapping, booking actions,
  chat failure handling, wallet display, bank validation, withdrawal validation.
* **fake-indexeddb** for Dexie in tests.
* **Playwright** smoke tests run against `vite preview` with `VITE_USE_MOCK_API=true`.
