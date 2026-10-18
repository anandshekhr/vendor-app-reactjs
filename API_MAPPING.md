# API Mapping — TheNearByShop Vendor Portal

This document maps every portal feature to the **actual** Django REST endpoints
found by inspecting the backend source, and lists every gap where the backend
does not (yet) support a feature. Nothing in the portal calls an endpoint that
is not listed here.

## Sources inspected

| Repository | What it is | Commit inspected |
|---|---|---|
| `vams-mechatronica/api-services` (`src/`) | Main Django 4.2 + DRF monolith. Owns the DB schema. | `4424589` |
| `vams-mechatronica/tnbs-vendor-service` | Standalone vendor-dashboard service sharing the same DB and `SECRET_KEY` (JWTs valid on both). Adds POS endpoints. | `e05d299` |
| `anandshekhr/vendor-app-reactjs` (previous React Native app, now in `legacy-react-native/`) | Its `src/api/*` targets paths such as `/vendor/dashboard/stats` and `/vendor/notifications` **that do not exist in either backend**, so it was not used as a contract source. | `23a1860` |

## Base URLs and clients

| Env var | Purpose | Default |
|---|---|---|
| `VITE_API_BASE_URL` | Main API (`api-services`) origin, e.g. `https://api.thenearbyshop.com` | — (required) |
| `VITE_VENDOR_API_BASE_URL` | Vendor service origin. Only POS endpoints require it. If your gateway routes `/api/v2/vendors/pos/*` to the vendor service, leave it empty and the main origin is used. | `VITE_API_BASE_URL` |
| `VITE_USE_MOCK_API` | `true` enables the in-browser mock adapter (development only). | `false` |
| `VITE_GOOGLE_MAPS_API_KEY` | Reserved for the delivery map; the map is disabled until the backend exposes vendor-scoped rider coordinates (see gap G-6). | empty |

Two prefixes are used on the main API:

* `/api/v2/...` — public/customer/vendor v2 tree (`src/api/v2/urls.py`).
* `/vendor/dashboard/api/...` — **shop-scoped vendor API** (`src/vendor_dashboard/api/`). Every view uses `IsVendorWithShop`, which resolves `request.shop` from the JWT user, so a vendor can only ever see its own data. **The portal prefers this tree wherever it exists.**

Pagination: DRF `PageNumberPagination`, `PAGE_SIZE = 10`, responses `{count, next, previous, results}`; `page_size` is **not** honoured on the default paginator. Lists that are not paginated return a bare array — the client normalises both shapes (`src/services/api/pagination.ts`).

Authentication: `Authorization: Bearer <access>`; refresh via `POST /api/v2/token/refresh/ {refresh}` → `{access}` (`ROTATE_REFRESH_TOKENS` is off on the vendor service). Access lifetime 1 day, refresh 30 days.

---

## 1. Authentication

| Feature | Method & path | Request | Response | Notes |
|---|---|---|---|---|
| Request login OTP | `POST /api/v2/login/request-otp` | `{phone_number}` | `{message}` | OTP sent via WhatsApp. No trailing slash. |
| Verify OTP / login | `POST /api/v2/login/verify-otp` | `{phone_number, otp, role: "vendor"}` | `{token: {access, refresh}, user_id, vendorUserId, bdaUserId}` | Returns **403** `{"error": "No vendor profile found..."}` when the phone has no vendor profile — the portal routes those users to onboarding. |
| Refresh | `POST /api/v2/token/refresh/` | `{refresh}` | `{access}` | |
| Logout | `POST /api/v2/logout` | — | `{message}` | Server only clears the Django session; JWTs are not blacklisted (gap G-1). The portal clears tokens locally regardless. |

## 2. Vendor identity & business type

| Feature | Method & path | Notes |
|---|---|---|
| Vendor profile | `GET /api/v2/vendors/me/` | `{id, business_name, slug, is_verified, user, bda, bank_details, shop: {id, name, category, category_name, address, location, documents, is_accepting_orders, ...}, wallet_balance}` |
| Shop profile (+ business type) | `GET /vendor/dashboard/api/store/profile/` | `{id, name, tagline, description, shop_image, cover_image, delivery_time_min, delivery_time_max, minimum_order, free_delivery_threshold, is_accepting_orders, is_service_provider}` |
| Update shop profile | `PATCH /vendor/dashboard/api/store/profile/` | Partial update of the fields above (multipart for images). |
| Store hours | `GET` / `PUT /vendor/dashboard/api/store/hours/` | Rows `{day_of_week: 0=Mon..6=Sun, opening_time, closing_time, is_open}`. `PUT` body is the array. |
| Tax/registration documents | `GET` / `PATCH /vendor/dashboard/api/store/documents/` | `{id, registration_number, gstin, pan_card}` or `null`. |

**Business type** is derived from `shop.is_service_provider` (single boolean):
`false` → product vendor, `true` → service provider. There is no "hybrid" flag in the schema (gap G-2), so the portal's capability model (`src/features/auth/capabilities.ts`) supports `hybrid` but never infers it.

## 3. Onboarding (new vendors)

The self-service application flow from `apps/vendor_onboarding` (reviewed by admins before a `Vendor`/`Shop` is created):

| Step | Method & path | Notes |
|---|---|---|
| Category tree | `GET /api/vendor-onboarding/categories/` | `[{id, name, parent_category, category_type: product|service, children: [...]}]` |
| Send phone OTP | `POST /api/vendor-onboarding/send-otp/` `{phone}` | ⚠ The response contains the OTP (see **Security S-1**). The portal **never reads or displays** that field. |
| Verify phone OTP | `POST /api/vendor-onboarding/verify-otp/` `{phone, otp}` | `{verified: true}` |
| Submit application | `POST /api/vendor-onboarding/applications/` (multipart) | Fields: `vendor_name, email, phone, phone_verified, business_name, gst_tax_id, address, city, state, zip_code, latitude, longitude, category_ids[]`, `shop_hours_payload` (JSON string of `{day_of_week, start_time "HH:MM", end_time}`), `employees_payload` (JSON string of `{client_id, full_name, phone, role, specialties, availability[]}`; **required for service categories**), files `business_license_files`, `id_proof_files`, `bank_detail_files`, `supporting_files`. Returns the application with `status`. |

Not supported by the application API: vendor bank account entry (bank documents can be uploaded; bank accounts are added after approval from **Bank accounts**), delivery/service radius, application status lookup after submission (gap G-3).

## 4. Dashboard

| Widget | Source | Field |
|---|---|---|
| Revenue today / this month | `GET /vendor/dashboard/api/dashboard/` | `stats.revenue_today`, `stats.revenue_month` (delivered orders) |
| Total / pending / completed / cancelled orders | same | `stats.total_orders`, `pending_orders` (all active statuses), `completed_orders`, `cancelled_orders` |
| Products / low stock | same | `stats.total_products`, `stats.low_stock_products` (stock ≤ `low_stock_threshold`) |
| Wallet balance / pending payout | same | `stats.wallet_balance`, `stats.pending_payout` |
| Revenue trend | same | `daily_sales: [{date, total}]` — last 14 days |
| Sales by category | same | `orders_by_category: [{name, count}]` — top 8 |
| Service KPIs | `GET /api/v2/vendors/service-dashboard/` | `active_shop_services, total/active_service_providers, total/scheduled/completed_service_bookings, wallet_balance, is_verified` |
| Upcoming appointments | `GET /vendor/dashboard/api/bookings/?status=SCHEDULED` | |
| Recent orders | `GET /vendor/dashboard/api/orders/` | first page |

Date filters: the backend computes fixed windows only. The portal's range filter (Today / 7 / 14 days) slices the server-provided `daily_sales` series; "Yesterday", "Last 30 days" and "Custom range" need a `from`/`to` parameter (gap G-4) and are shown disabled with an explanation. Payment-method distribution and best-sellers have no aggregate endpoint (gap G-4).

## 5. Orders

| Feature | Method & path | Notes |
|---|---|---|
| List | `GET /vendor/dashboard/api/orders/?status=<status|all>&q=<search>&page=` | Items `{id, customer_name, customer_phone, items_count, total_amount, status, status_display, is_paid, created_at}`. Search covers customer name/phone, external id, numeric id. |
| New-order polling | `GET /vendor/dashboard/api/orders/poll/?since=<last id>` | `{orders, latest_id}` |
| Detail (scoped) | `GET /vendor/dashboard/api/orders/<id>/` | `{id, external_id, customer_name, customer_phone, total_amount, status, status_display, is_paid, rejection_reason, created_at, delivered_at, history[]}` |
| Items, address, totals breakdown, source | `GET /api/v2/vendors/orders/<id>/` | Adds `items[] {product, product_snapshot, quantity, unit_price, line_total}`, `customer_address`, `item_total`, `discount_amount`, `tax_amount`, `source (online|pos)`, `invoice_url`. Only requested **after** the scoped detail call succeeds (see S-3). |
| Status action | `POST /vendor/dashboard/api/orders/<id>/action/` `{action, note}` | Actions → statuses: `accept→accepted`, `reject→rejected`, `mark_preparing→preparing`, `mark_processing→processing`, `mark_ready→ready-for-pickup`, `cancel→cancelled`. Runs `orders.services.order_service.change_vendor_order_status` (syncs customer order + delivery). |

Permitted transitions (mirrored from `VENDOR_ORDER_TRANSITIONS`; the server remains authoritative):

```
created          → accepted | rejected | cancelled
accepted         → preparing | cancelled
preparing        → processing | ready-for-pickup | cancelled
processing       → ready-for-pickup | cancelled
ready-for-pickup → cancelled
rejected, cancelled, out-for-delivery, delivered → (none — driven by the delivery system)
```

`mark_out_for_delivery` / `mark_delivered` exist as action names but the transition table rejects them for vendors; the portal does not offer them. Returns are not modelled (gap G-5).

## 6. Delivery

| Feature | Method & path | Notes |
|---|---|---|
| Orders awaiting pickup / in transit | Orders list with `status=ready-for-pickup` / `out-for-delivery` / `delivered` | Real order status. |
| Nearby delivery partners | `GET /api/v2/delivery/nearby-partners/?latitude&longitude&radius_km` | Uses the shop location from `vendors/me`. Portal shows only name, vehicle type and availability (see S-4). |
| Assign partner | `POST /api/v2/o/vendor-orders/<id>/assign-delivery/` `{delivery_partner_id (uuid), notes}` | Ownership enforced server-side. Returns `{assignment_id, status}`. |

Gap G-6: there is **no vendor-scoped read endpoint** for the `DeliveryAssignment` (partner, status, `last_latitude/longitude`, ETA). The portal therefore shows order-level delivery state only and labels partner/ETA/live map as "not available from the server". It never fabricates a location or ETA.

## 7. Products & catalogue

| Feature | Method & path | Notes |
|---|---|---|
| List | `GET /vendor/dashboard/api/products/?search=&status=active|inactive|low_stock&page=` | `{id, name, sku, category_name, price, mrp, stock, low_stock_threshold, is_active, image, created_at}` |
| Detail / create / update / delete | `GET|POST /vendor/dashboard/api/products/`, `GET|PATCH|DELETE /vendor/dashboard/api/products/<id>/` | Writable: `name, category, description, price, mrp, unit, stock, low_stock_threshold, image, product_type, discount_type (percentage|fixed), discount_value, discount_start, discount_end, is_active`. `sku` is **generated by the server** (read-only). |
| Barcode lookup (own catalogue) | `GET /api/v2/vendors/barcode/scan/?barcode=` | Full `ProductSerializer` (includes `barcode`, `final_price`) or 404. |
| Register barcode on a product | `POST /api/v2/vendors/barcode/register/vendor-product/` `{product_id, barcode, barcode_type}` | Rejects duplicates within the shop. Used after create because `barcode` is not writable on the scoped product serializer. |
| Bulk activate/deactivate | `POST /api/v2/products/bulk-update/` `{product_ids, updates: {is_active}}` | Scoped to `shop__vendor__user`. |
| Bulk delete | `POST /api/v2/products/bulk-delete/` `{product_ids}` | Scoped. |
| Categories | `GET /api/v2/categories/?all=1` | |
| Units | `GET /api/v2/units/` | |
| Master catalogue browse / bulk add | `GET /vendor/dashboard/api/products/master-catalog/?search=&category=`, `POST /vendor/dashboard/api/products/bulk-add/ {product_ids}` | |

Not in the schema: variants, tax rate per product, weight/dimensions, batch/expiry, reserved stock (gap G-7). The form omits them rather than collecting data the server would drop. **Stock is not editable on the edit form** — it is changed only through stock operations.

## 8. Inventory & stock

| Feature | Method & path | Notes |
|---|---|---|
| Summary | `GET /api/v2/vendors/stock/summary/` | `{summary: {total_products, total_stock_value, out_of_stock_count, low_stock_count, in_stock_count}, low_stock_products[]}` (server uses a fixed threshold of 10) |
| Stock list | `GET /api/v2/vendors/stock/?search=&low_stock=10&out_of_stock=true&page=&page_size=` | |
| Single adjustment | `POST /api/v2/vendors/stock/update/` `{product_id | barcode, quantity ≥ 0, operation: add|subtract|set}` | `{previous_stock, new_stock, change}` — the portal displays these **server** values. Subtract below zero is rejected server-side. |
| Bulk adjustment | `POST /api/v2/vendors/stock/bulk-update/` `{updates: [...]}` | |

Gap G-8 (high priority): there is **no stock-movement ledger** (no model, no endpoint), no reason/reference/actor recorded, and `StockUpdateAPIView` does not lock the row (`select_for_update`). The portal sends the operation type mapped to `add|subtract|set`, shows the reason field as "not stored by the server yet", and keeps a **device-local, clearly-labelled** journal of adjustments this browser made (never used as authoritative stock). See `BACKEND_GAPS` below for the required contract.

## 9. POS

| Feature | Method & path | Notes |
|---|---|---|
| Lookup by barcode | `GET {vendor}/api/v2/vendors/pos/lookup/?barcode=` | `{id, name, sku, barcode, category_name, price, mrp, final_price, stock, image}` or 404 |
| Search / catalogue cache | `GET {vendor}/api/v2/vendors/pos/lookup/?q=` | Max 20 rows. Full cache built from the paginated products list. |
| Checkout | `POST {vendor}/api/v2/vendors/pos/checkout/` | `{items: [{product_id, quantity}], payment_method: cash|card|upi, customer_name, customer_phone}`. Atomic with `select_for_update`; prices from `final_price`; creates `VendorOrder(source='pos', status='delivered', is_paid=True)`. Returns order detail incl. `invoice_url`. |
| Sales history | `GET /api/v2/vendors/orders/` (filter `source === 'pos'` client-side) | No server-side `source` filter (gap G-9). |

Gap G-9: checkout has **no idempotency key** and no server-side discount/tax rules (tax is always 0, discount always 0), and it marks UPI/card as paid immediately with no payment-provider confirmation. See the offline policy below.

## 10. Services, bookings, employees (service providers)

| Feature | Method & path | Notes |
|---|---|---|
| Service catalogue (global) | `GET /api/v2/services/` | `Service` (uuid id, name, category, service_type, pricing_type, image) |
| Shop services | `GET|POST /vendor/dashboard/api/services/?status=&search=`, `GET|PATCH|DELETE .../services/<id>/` | `{service (uuid), base_price, minimum_price, estimated_duration_minutes, service_radius_km, is_available, cover_image}`; duplicates rejected. |
| Bookings | `GET /vendor/dashboard/api/bookings/?status=SCHEDULED|IN_PROGRESS|COMPLETED|CANCELLED|all&q=&page=` | |
| Booking detail | `GET /vendor/dashboard/api/bookings/<id>/` | incl. `payment_detail`, `service_detail`, `amount_paid`, `amount_due` |
| Booking actions | `POST /vendor/dashboard/api/bookings/<id>/action/` | `start`, `complete`, `cancel`, `reschedule {start_time, end_time}`, `collect_balance` |
| New booking polling | `GET /vendor/dashboard/api/bookings/poll/?since=` | |
| Employees (providers) | `GET /api/v2/shops/providers/list/?shop_id=` , `POST /api/v2/shops/providers/create/` | Create requires a `user` id (Provider is 1:1 with User) — see gap G-10. |
| Weekly availability | `GET|POST|PATCH /api/v2/shops/providers/<id>/availability/` | `GET ?date=` returns computed `slots`; `POST {provider_availability: [{day_of_week, start_time, end_time, is_available}]}` |

Gap G-10: booking accept/reject, assign employee, provider update/delete, and conflict-checked reschedule are not exposed to vendors. Booking actions perform **no transition validation** server-side (e.g. a completed booking can be "started" again); the portal restricts the offered actions by status, but the backend must enforce it.

## 11. Wallet, bank accounts, withdrawals

| Feature | Method & path | Notes |
|---|---|---|
| Wallet + recent transactions | `GET /vendor/dashboard/api/wallet/` | `{wallet: {id, balance}, pending_payout, transactions[100]}` |
| Balance breakdown | `GET /api/v2/vendors/wallet/balance/` | `{balance, available_balance, pending_withdrawals}` (strings) |
| Transactions (paginated) | `GET /api/v2/wallet/transactions/?page=` | `{transaction_type, amount, timestamp, description, reference_id, balance_after}` |
| Bank accounts — list | `GET /api/v2/vendors/bank-accounts/` | Vendor-scoped. `account_number` is write-only; returns `account_masked` and read-only `is_verified` (set by admins). The portal lists from here so full numbers never reach the browser. |
| Bank accounts — create / delete | `POST /vendor/dashboard/api/bank-accounts/`, `DELETE .../bank-accounts/<id>/` | `{account_holder_name, bank_name, account_number, ifsc_code, account_type: savings|current, upi_id, is_primary}`. Created through the scoped API because the main API's v2 create serializer looks up a non-existent `request.user.vendor` (noted in tnbs-vendor-service). No update endpoint is used: changes are made by removing and re-adding, which triggers re-verification. |
| Withdrawals | `GET|POST /api/v2/vendors/withdrawals/`, `GET .../withdrawals/<id>/` | Create `{amount ≥ 100, bank_account_id, notes}`; read `{id, amount, status, status_display, notes, bank_name, account_masked, transaction_id, created_at, processed_at}` |

Statuses: `pending | processing | completed | rejected` (no `failed`/`reversed` in the schema).
Gap G-11: withdrawal creation has **no idempotency key, no balance reservation, no row lock** (two concurrent requests can both pass the balance check), and does not require `bank_account.is_verified`. The portal disables double-submit and only offers verified accounts, but the backend must enforce both. Minimum (₹100) is from the serializer; there is no endpoint for max/fees/processing time.

## 12. Customers, chat, notifications, reports

| Feature | Status |
|---|---|
| Customers | No vendor customer endpoint. The portal derives a customer directory **from the vendor's own orders** (`customer_name`, `customer_phone`, order count, totals across fetched pages) and labels it as such (gap G-12). |
| Chat | `GET /api/v2/chat/rooms/` lists threads where the user is customer or vendor. Message list/send (`/api/v2/chat/rooms/<uuid>/messages/[send/]`) filter on a non-existent `room_id` field and have **no participant check**; `ChatRoomSerializer.vendor_name` reads a non-existent attribute. No WebSocket server (plain ASGI, no Channels). The portal implements the inbox against this contract with 15s polling and shows a clear "chat service unavailable" state when the backend errors (gap G-13). |
| Notifications | No vendor notification feed/mark-read API (only device-token registration). The portal's notification centre is fed by **real** order/booking polling (`orders/poll`, `bookings/poll`) and low-stock data; read state is device-local (gap G-14). |
| Reports | Built from the endpoints above (dashboard series, orders, POS sales, stock, wallet, withdrawals, bookings). CSV export is generated client-side from fetched data. No server-side report/date-range endpoints (gap G-4). |

---

## BACKEND_GAPS — required changes

| ID | Gap | Required change (suggested contract) | Priority |
|---|---|---|---|
| G-1 | JWT logout does not invalidate refresh tokens | Install `token_blacklist`, `POST /api/v2/logout {refresh}` blacklists it | Medium |
| G-2 | No hybrid vendor flag | `Shop.business_type: product|service|hybrid` exposed on `store/profile/` | Low |
| G-3 | No application status lookup | `GET /api/vendor-onboarding/applications/status/?phone=` (OTP-gated) returning `status`, `admin_review_note`, `requested_documents_note` | Medium |
| G-4 | No date-range analytics | `GET /vendor/dashboard/api/reports/summary/?from=&to=` → revenue, counts, by-category, by-payment-method, top products/services, POS vs online | Medium |
| G-5 | No returns model | `VendorOrderReturn` + action `return` | Low |
| G-6 | No vendor-readable delivery tracking | `GET /vendor/dashboard/api/orders/<id>/delivery/` → `{assignment_id, status, partner: {name, phone, vehicle_type}, last_latitude, last_longitude, last_location_at, estimated_delivery_time, pickup, drop}`; optional SSE stream | High |
| G-7 | Product variants, tax rate, batch/expiry, reserved stock | New fields/models + serializer exposure | Medium |
| G-8 | **No stock ledger, no locking** | `StockMovement(product, operation, quantity_before, delta, quantity_after, reason, reference, actor, created_at)`; `StockUpdateAPIView` uses `select_for_update` and writes a movement; accept `reason`, `reference`, `movement_type` (`restock|damaged|expired|returned|correction|sale`); `GET /api/v2/vendors/stock/movements/?product=&from=&to=` | **High** |
| G-9 | **POS checkout not idempotent; online payments auto-marked paid; no tax/discount rules** | Accept `Idempotency-Key` header / `client_reference` (unique per shop) and return the original order on replay; accept `sold_at` for offline sales; for `upi|card` create the order `is_paid=False` until a payment confirmation endpoint/webhook; server-side tax & discount computation; `?source=pos` filter | **High** |
| G-10 | Booking accept/reject/assign employee; provider CRUD; transition validation | Actions `accept`, `reject`, `assign {provider_id}`; validate transitions; `PATCH/DELETE /api/v2/shops/providers/<id>/`; create provider without pre-existing `user` | High |
| G-11 | **Withdrawal race / no idempotency / unverified accounts allowed** | `select_for_update` on wallet, reserve amount, `Idempotency-Key`, require `bank_account.is_verified`, expose limits/fees via `GET /api/v2/vendors/withdrawals/config/` | **High** |
| G-12 | No vendor customer API | `GET /vendor/dashboard/api/customers/` aggregated per customer for this shop only | Medium |
| G-13 | Chat endpoints broken & unscoped, no realtime | Fix `room_id`→`thread_id`, restrict to participants, vendor-safe serializer, `POST .../read/`, attachments; Django Channels at `/ws/chat/<thread>/` | High |
| G-14 | No notification feed | `GET /vendor/dashboard/api/notifications/`, `POST .../<id>/read/`, `POST .../read-all/` | Medium |

## Security findings (backend)

| ID | Finding | Location |
|---|---|---|
| **S-1 (critical)** | `POST /api/vendor-onboarding/send-otp/` is unauthenticated and **returns the OTP** for any phone. OTPs are stored in the shared `OTPRecord` table used by `/api/v2/login/verify-otp`, so anyone can obtain a login OTP for any registered phone and receive a JWT — full account takeover (vendors, customers, riders). `verify_otp` also never consumes the record, so a code is reusable for 5 minutes. | `apps/vendor_onboarding/api_views.py::SendOTPAPIView`, `accounts/services.py::OTPService.verify_otp` |
| S-2 | Chat message list/send have no participant check. | `api/v2/views.py::MessageListAPI/MessageCreateAPI` |
| S-3 | Several `/api/v2/...` vendor views are not scoped to the requesting vendor (IDOR): `vendors/orders/<pk>/` (GET/PATCH/DELETE), `vendors/orders/<id>/action/`, `vendors/orders/items/`, `vendors/product/<pk>`, `vendors/shop/product/<pk>/`, `vendors/shop/<pk>/`, `vendors/shop/location/<pk>/`, `vendors/shop-documents/*`, `vendors/profile/<pk>/`, `delivery/track/<uuid>/`. The portal uses the scoped `/vendor/dashboard/api/` equivalents and only calls `vendors/orders/<pk>/` (read-only) after the scoped detail confirms ownership. | both backends |
| S-4 | `delivery/nearby-partners/` returns riders' licence numbers, government-ID images and live coordinates to any authenticated user. | `api/v2/views.py::NearbyDeliveryPartnersAPIView` |
