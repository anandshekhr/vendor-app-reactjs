/**
 * Development-only in-browser mock of the endpoints listed in API_MAPPING.md, enabled with VITE_USE_MOCK_API=true.
 * It mirrors response shapes (including DRF pagination) so the UI can be exercised without a backend. It is never
 * bundled into the request path unless explicitly enabled.
 *
 * Switch business type with: localStorage.setItem('tnbs.mock.type', 'service'); then reload.
 */
import { AxiosError, AxiosHeaders, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { installMockAdapter } from '../client';
import { createMockDb, type MockDb } from './data';

type Handler = (ctx: { params: Record<string, string>; query: URLSearchParams; body: any; db: MockDb }) => [number, unknown];

const PAGE = 10;

function paginate<T>(rows: T[], query: URLSearchParams, size = PAGE) {
  const page = Number(query.get('page') ?? 1) || 1;
  const pageSize = Number(query.get('page_size') ?? size) || size;
  const start = (page - 1) * pageSize;
  return {
    count: rows.length,
    next: start + pageSize < rows.length ? `?page=${page + 1}` : null,
    previous: page > 1 ? `?page=${page - 1}` : null,
    results: rows.slice(start, start + pageSize),
  };
}

const routes: [string, string, Handler][] = [];
const on = (method: string, pattern: string, handler: Handler) => routes.push([method, pattern, handler]);

// ─── Auth ───
on('POST', '/api/v2/login/request-otp', () => [200, { message: 'OTP sent via WhatsApp.' }]);
on('POST', '/api/v2/login/verify-otp', ({ body }) =>
  body?.otp === '1234'
    ? [200, { token: { access: fakeJwt(), refresh: 'mock-refresh' }, user_id: 1, vendorUserId: 1, bdaUserId: null }]
    : [400, { error: 'Invalid or expired OTP' }],
);
on('POST', '/api/v2/token/refresh/', () => [200, { access: fakeJwt() }]);
on('POST', '/api/v2/logout', () => [200, { message: 'Logged out successfully' }]);

// ─── Vendor ───
on('GET', '/api/v2/vendors/me/', ({ db }) => [200, db.me]);
on('GET', '/vendor/dashboard/api/store/profile/', ({ db }) => [200, db.shop]);
on('PATCH', '/vendor/dashboard/api/store/profile/', ({ db, body }) => {
  if (!(body instanceof FormData)) Object.assign(db.shop, body);
  return [200, db.shop];
});
on('GET', '/vendor/dashboard/api/store/hours/', ({ db }) => [200, db.hours]);
on('PUT', '/vendor/dashboard/api/store/hours/', ({ db, body }) => {
  db.hours = (body as any[]).map((r) => ({ day_of_week: r.day, opening_time: r.opening_time, closing_time: r.closing_time, is_open: r.is_open }));
  return [200, db.hours];
});
on('GET', '/vendor/dashboard/api/store/documents/', ({ db }) => [200, db.documents]);
on('PATCH', '/vendor/dashboard/api/store/documents/', ({ db, body }) => {
  db.documents = { id: 1, registration_number: '', gstin: '', pan_card: '', ...db.documents, ...body };
  return [200, db.documents];
});

// ─── Dashboard ───
on('GET', '/vendor/dashboard/api/dashboard/', ({ db }) => [200, db.dashboard()]);
on('GET', '/api/v2/vendors/service-dashboard/', ({ db }) => [200, db.serviceDashboard()]);

// ─── Orders ───
on('GET', '/vendor/dashboard/api/orders/', ({ db, query }) => {
  const status = query.get('status') ?? 'all';
  const q = (query.get('q') ?? '').toLowerCase();
  const rows = db.orders
    .filter((o) => status === 'all' || o.status === status)
    .filter((o) => !q || o.customer_name.toLowerCase().includes(q) || o.customer_phone.includes(q) || String(o.id) === q)
    .map(db.orderListItem);
  return [200, paginate(rows, query)];
});
on('GET', '/vendor/dashboard/api/orders/poll/', ({ db, query }) => {
  const since = Number(query.get('since') ?? 0);
  const rows = db.orders.filter((o) => o.id > since).map(db.orderListItem);
  return [200, { orders: rows, latest_id: rows[0]?.id ?? since }];
});
on('GET', '/vendor/dashboard/api/orders/:id/', ({ db, params }) => {
  const o = db.orders.find((x) => x.id === Number(params.id));
  return o ? [200, db.orderDetail(o)] : [404, { detail: 'Not found.' }];
});
on('POST', '/vendor/dashboard/api/orders/:id/action/', ({ db, params, body }) => {
  const o = db.orders.find((x) => x.id === Number(params.id));
  if (!o) return [404, { detail: 'Not found.' }];
  const result = db.applyOrderAction(o, body.action, body.note);
  return result ? [400, { action: result }] : [200, db.orderDetail(o)];
});
on('GET', '/api/v2/vendors/orders/', ({ db, query }) => [200, paginate(db.orders, query)]);
on('GET', '/api/v2/vendors/orders/:id/', ({ db, params }) => {
  const o = db.orders.find((x) => x.id === Number(params.id));
  return o ? [200, o] : [404, { detail: 'Not found.' }];
});
on('GET', '/api/v2/delivery/nearby-partners/', () => [200, [{ id: '5f1e2c1a-0000-4000-8000-000000000001', name: 'Ravi Kumar', vehicle_type: 'bike' }, { id: '5f1e2c1a-0000-4000-8000-000000000002', name: 'Sunita Devi', vehicle_type: 'scooter' }]]);
on('POST', '/api/v2/o/vendor-orders/:id/assign-delivery/', () => [200, { assignment_id: 11, status: 'assigned' }]);

// ─── Products / stock ───
on('GET', '/vendor/dashboard/api/products/', ({ db, query }) => {
  const s = (query.get('search') ?? '').toLowerCase();
  const status = query.get('status');
  const rows = db.products
    .filter((p) => !s || p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s))
    .filter((p) => (status === 'active' ? p.is_active : status === 'inactive' ? !p.is_active : status === 'low_stock' ? p.stock <= p.low_stock_threshold : true))
    .map(db.productListItem);
  return [200, paginate(rows, query)];
});
on('POST', '/vendor/dashboard/api/products/', ({ db, body }) => [201, db.createProduct(body)]);
on('GET', '/vendor/dashboard/api/products/:id/', ({ db, params }) => {
  const p = db.products.find((x) => x.id === Number(params.id));
  return p ? [200, p] : [404, { detail: 'Not found.' }];
});
on('PATCH', '/vendor/dashboard/api/products/:id/', ({ db, params, body }) => {
  const p = db.products.find((x) => x.id === Number(params.id));
  if (!p) return [404, { detail: 'Not found.' }];
  if (!(body instanceof FormData)) Object.assign(p, body, { updated_at: new Date().toISOString() });
  return [200, p];
});
on('DELETE', '/vendor/dashboard/api/products/:id/', ({ db, params }) => {
  db.products = db.products.filter((x) => x.id !== Number(params.id));
  return [204, null];
});
on('GET', '/api/v2/vendors/product/:id', ({ db, params }) => {
  const p = db.products.find((x) => x.id === Number(params.id));
  return p ? [200, db.v2Product(p)] : [404, { detail: 'Not found.' }];
});
on('GET', '/api/v2/vendors/products', ({ db, query }) => [200, paginate(db.products.map(db.v2Product), query)]);
on('POST', '/api/v2/products/bulk-update/', ({ db, body }) => {
  const ids = new Set(body.product_ids);
  db.products.filter((p) => ids.has(p.id)).forEach((p) => Object.assign(p, body.updates));
  return [200, { updated_count: ids.size }];
});
on('POST', '/api/v2/products/bulk-delete/', ({ db, body }) => {
  const ids = new Set(body.product_ids);
  db.products = db.products.filter((p) => !ids.has(p.id));
  return [200, { deleted_count: ids.size }];
});
on('GET', '/api/v2/vendors/barcode/scan/', ({ db, query }) => {
  const p = db.products.find((x) => x.barcode === query.get('barcode'));
  return p ? [200, db.v2Product(p)] : [404, { found: false, message: 'No product found with this barcode' }];
});
on('POST', '/api/v2/vendors/barcode/register/vendor-product/', ({ db, body }) => {
  if (db.products.some((p) => p.barcode === body.barcode && p.id !== body.product_id)) return [400, { error: 'This barcode is already registered to another product in your shop' }];
  const p = db.products.find((x) => x.id === body.product_id);
  if (p) Object.assign(p, { barcode: body.barcode, barcode_type: body.barcode_type });
  return [200, { message: 'Barcode registered successfully' }];
});
on('GET', '/api/v2/categories/', ({ db, query }) => [200, paginate(db.categories, query, 100)]);
on('GET', '/api/v2/units/', ({ db }) => [200, db.units]);
on('GET', '/vendor/dashboard/api/products/master-catalog/', ({ db, query }) => {
  const q = (query.get('search') ?? '').toLowerCase();
  const added = new Set(db.products.map((p) => p.name));
  const rows = db.masterCatalog
    .filter((m) => !q || [m.name, m.sku, m.brand_name ?? ''].some((v) => v.toLowerCase().includes(q)))
    .map((m) => ({ ...m, already_added: m.already_added || added.has(m.name) }));
  return [200, paginate(rows, query)];
});
on('POST', '/vendor/dashboard/api/products/bulk-add/', ({ db, body }) => db.bulkAdd(body));
on('GET', '/vendor/dashboard/api/store/qr/', ({ db }) => [200, db.qrPayload()]);
on('POST', '/vendor/dashboard/api/store/qr/', ({ db, body }) => db.createQr(body?.table_number ?? ''));
on('POST', '/api/v2/vendors/orders/:id/delivery/retry/', ({ db, params }) => db.riderSearch(Number(params.id), 'retry'));
on('POST', '/api/v2/vendors/orders/:id/delivery/stop/', ({ db, params }) => db.riderSearch(Number(params.id), 'stop'));
on('GET', '/api/v2/vendors/stock/summary/', ({ db }) => [200, db.stockSummary()]);
on('GET', '/api/v2/vendors/stock/', ({ db, query }) => {
  const s = (query.get('search') ?? '').toLowerCase();
  let rows = db.products.filter((p) => !s || [p.name, p.sku, p.barcode ?? ''].some((v) => v.toLowerCase().includes(s)));
  if (query.get('low_stock')) rows = rows.filter((p) => p.stock > 0 && p.stock <= 10);
  if (query.get('out_of_stock') === 'true') rows = rows.filter((p) => p.stock === 0);
  return [200, paginate(rows.map(db.stockItem), query)];
});
on('POST', '/api/v2/vendors/stock/update/', ({ db, body }) => db.updateStock(body));

// ─── POS ───
on('GET', '/api/v2/vendors/pos/lookup/', ({ db, query }) => {
  const barcode = query.get('barcode');
  if (barcode) {
    const p = db.products.find((x) => x.barcode === barcode && x.is_active);
    return p ? [200, db.posProduct(p)] : [404, { detail: 'No product found for this barcode.' }];
  }
  const q = (query.get('q') ?? '').toLowerCase();
  return [200, db.products.filter((p) => p.is_active && p.name.toLowerCase().includes(q)).slice(0, 20).map(db.posProduct)];
});
on('POST', '/api/v2/vendors/pos/checkout/', ({ db, body }) => db.posCheckout(body));

// ─── Services / bookings / employees ───
on('GET', '/vendor/dashboard/api/services/', ({ db, query }) => [200, paginate(db.shopServices.map((s) => ({ ...s, service_name: db.catalogName(s.service) })), query)]);
on('GET', '/vendor/dashboard/api/services/:id/', ({ db, params }) => {
  const s = db.shopServices.find((x) => x.id === Number(params.id));
  return s ? [200, s] : [404, { detail: 'Not found.' }];
});
on('POST', '/vendor/dashboard/api/services/', ({ db, body }) => {
  const s = { id: db.shopServices.length + 1, cover_image: null, created_at: new Date().toISOString(), ...body };
  db.shopServices.push(s);
  return [201, s];
});
on('GET', '/api/v2/services/', ({ db, query }) => [200, paginate(db.catalog, query, 100)]);
on('GET', '/vendor/dashboard/api/bookings/', ({ db, query }) => {
  const status = query.get('status') ?? 'all';
  return [200, paginate(db.bookings.filter((b) => status === 'all' || b.status === status), query)];
});
on('GET', '/vendor/dashboard/api/bookings/poll/', ({ db, query }) => {
  const since = Number(query.get('since') ?? 0);
  const rows = db.bookings.filter((b) => b.id > since);
  return [200, { bookings: rows, latest_id: rows[0]?.id ?? since }];
});
on('GET', '/vendor/dashboard/api/bookings/:id/', ({ db, params }) => {
  const b = db.bookings.find((x) => x.id === Number(params.id));
  return b ? [200, db.bookingDetail(b)] : [404, { detail: 'Not found.' }];
});
on('POST', '/vendor/dashboard/api/bookings/:id/action/', ({ db, params, body }) => {
  const b = db.bookings.find((x) => x.id === Number(params.id));
  if (!b) return [404, { detail: 'Not found.' }];
  db.applyBookingAction(b, body);
  return [200, db.bookingDetail(b)];
});
on('GET', '/api/v2/shops/providers/list/', ({ db, query }) => [200, paginate(db.providers, query, 100)]);
on('GET', '/api/v2/shops/providers/:id/availability/', ({ db, params, query }) => [200, db.providerAvailability(Number(params.id), query.get('date'))]);
on('POST', '/api/v2/shops/providers/:id/availability/', ({ db, params, body }) => {
  db.availability[Number(params.id)] = body.provider_availability.map((r: any, i: number) => ({ id: i + 1, ...r }));
  return [200, { message: 'Provider availability updated successfully' }];
});

// ─── Wallet ───
on('GET', '/vendor/dashboard/api/wallet/', ({ db }) => [200, { wallet: { id: 1, balance: db.balance.toFixed(2) }, pending_payout: db.pendingWithdrawals().toFixed(2), transactions: db.transactions }]);
on('GET', '/api/v2/vendors/wallet/balance/', ({ db }) => [200, { balance: db.balance.toFixed(2), available_balance: Math.max(0, db.balance - db.pendingWithdrawals()).toFixed(2), pending_withdrawals: db.pendingWithdrawals().toFixed(2) }]);
on('GET', '/api/v2/wallet/transactions/', ({ db, query }) => [200, paginate(db.transactions, query)]);
on('GET', '/api/v2/vendors/bank-accounts/', ({ db }) => [200, db.bankAccounts]);
on('POST', '/vendor/dashboard/api/bank-accounts/', ({ db, body }) => [201, db.addBankAccount(body)]);
on('DELETE', '/vendor/dashboard/api/bank-accounts/:id/', ({ db, params }) => {
  db.bankAccounts = db.bankAccounts.filter((a) => a.id !== Number(params.id));
  return [204, null];
});
on('GET', '/api/v2/vendors/withdrawals/', ({ db, query }) => [200, paginate(db.withdrawals, query)]);
on('GET', '/api/v2/vendors/withdrawals/:id/', ({ db, params }) => {
  const w = db.withdrawals.find((x) => x.id === Number(params.id));
  return w ? [200, w] : [404, { detail: 'Not found.' }];
});
on('POST', '/api/v2/vendors/withdrawals/', ({ db, body }) => db.createWithdrawal(body));

// ─── Chat ───
on('GET', '/api/v2/chat/conversations/', ({ db, query }) => [200, paginate(db.threadList(), query, 20)]);
on('GET', '/api/v2/chat/conversations/:key/messages/', ({ db, params, query }) => [200, paginate([...(db.messages[params.key] ?? [])].reverse(), query, 20)]);
on('POST', '/api/v2/chat/conversations/:key/messages/', ({ db, params, body }) => [201, db.sendMessage(params.key, body instanceof FormData ? String(body.get('text') ?? '') : body.text)]);
on('POST', '/api/v2/chat/conversations/:key/read/', ({ db, params }) => [200, { message_ids: db.markRead(params.key) }]);
on('POST', '/api/v2/chat/conversations/:key/close/', ({ db, params }) => {
  const t = db.threads.find((x) => x.id === params.key);
  if (!t) return [404, { detail: 'Not found.' }];
  t.status = 'CLOSED';
  return [200, t];
});

// ─── Onboarding ───
on('GET', '/api/vendor-onboarding/categories/', ({ db }) => [200, db.onboardingCategories]);
on('POST', '/api/vendor-onboarding/send-otp/', () => [200, { detail: 'OTP has been sent to your phone.' }]);
on('POST', '/api/vendor-onboarding/verify-otp/', ({ body }) => (body.otp === '1234' ? [200, { verified: true }] : [400, { detail: 'Invalid or expired OTP.', verified: false }]));
on('POST', '/api/vendor-onboarding/applications/', ({ body }) => [
  201,
  { id: 1, vendor_name: (body as FormData).get('vendor_name'), business_name: (body as FormData).get('business_name'), phone: (body as FormData).get('phone'), status: 'submitted', created_at: new Date().toISOString() },
]);

function fakeJwt() {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, user_id: 1 })).replace(/=+$/, '');
  return `eyJhbGciOiJub25lIn0.${payload}.mock`;
}

function match(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split('/');
  const a = path.split('/');
  if (p.length !== a.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) {
      // `:id` mirrors Django's <int:pk>; `:key` accepts any segment (uuids, codes).
      if (p[i] === ':id' && !/^\d+$/.test(a[i])) return null;
      params[p[i].slice(1)] = decodeURIComponent(a[i]);
    }
    else if (p[i] !== a[i]) return null;
  }
  return params;
}

export function createMockAdapter(db: MockDb = createMockDb()) {
  return async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
    await new Promise((r) => setTimeout(r, 120 + Math.random() * 180));
    const url = new URL(config.url ?? '', 'http://mock.local');
    const path = url.pathname;
    const query = new URLSearchParams(url.search);
    Object.entries(config.params ?? {}).forEach(([k, v]) => v !== undefined && query.set(k, String(v)));
    let body: unknown = config.data;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        /* keep raw */
      }
    }
    const method = (config.method ?? 'get').toUpperCase();
    for (const [m, pattern, handler] of routes) {
      if (m !== method) continue;
      const params = match(pattern, path);
      if (!params) continue;
      const [status, raw] = handler({ params, query, body, db });
      // Clone so the store's frozen copies never alias the mock's mutable records.
      const data = raw === null || raw === undefined ? raw : structuredClone(raw);
      const response: AxiosResponse = { data, status, statusText: String(status), headers: {}, config: { ...config, headers: config.headers ?? new AxiosHeaders() } };
      if (status >= 400) throw new AxiosError(`Request failed with status code ${status}`, String(status), config, null, response);
      return response;
    }
    const response: AxiosResponse = { data: { detail: `Mock: no handler for ${method} ${path}` }, status: 404, statusText: 'Not Found', headers: {}, config };
    throw new AxiosError('Not found', '404', config, null, response);
  };
}

export function enableMockApi() {
  installMockAdapter(createMockAdapter());
  console.info('%c[mock api] enabled — sign in with any mobile number and OTP 1234', 'color:#C23C3C');
}
