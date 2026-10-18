/* Development-only fixture data for the mock API. Shapes follow the Django serializers. */
import type {
  BankAccount,
  BookingListItem,
  Category,
  ChatMessage,
  ChatRoom,
  CatalogService,
  OnboardingCategory,
  ProductDetail,
  Provider,
  ShopProfile,
  StoreHour,
  VendorMe,
  VendorOrderFull,
  VendorOrderStatus,
  WalletTransaction,
  Withdrawal,
} from '@/types/api';

type Product = ProductDetail & { barcode: string | null; barcode_type: string | null; category_name: string | null };
type Booking = BookingListItem & { end_time: string; created_at: string };

const TRANSITIONS: Record<string, string[]> = {
  created: ['accepted', 'rejected', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['processing', 'ready-for-pickup', 'cancelled'],
  processing: ['ready-for-pickup', 'cancelled'],
  'ready-for-pickup': ['cancelled'],
};
const ACTION_TO_STATUS: Record<string, VendorOrderStatus> = {
  accept: 'accepted',
  reject: 'rejected',
  mark_preparing: 'preparing',
  mark_processing: 'processing',
  mark_ready: 'ready-for-pickup',
  mark_out_for_delivery: 'out-for-delivery',
  mark_delivered: 'delivered',
  cancel: 'cancelled',
};

function finalPrice(p: Product): number {
  const price = Number(p.price);
  if (!p.discount_type || p.discount_value == null) return price;
  const d = Number(p.discount_value);
  const v = p.discount_type === 'percentage' ? price - (price * d) / 100 : price - d;
  return Math.max(0, v);
}

export function createMockDb() {
  const isService = (() => {
    try {
      return localStorage.getItem('tnbs.mock.type') === 'service';
    } catch {
      return false;
    }
  })();
  const now = Date.now();
  const iso = (offsetMin: number) => new Date(now - offsetMin * 60_000).toISOString();

  const categories: Category[] = [
    { id: 1, name: 'Dairy', parent_category: null, category_type: 'product' },
    { id: 2, name: 'Bakery', parent_category: null, category_type: 'product' },
    { id: 3, name: 'Beverages', parent_category: null, category_type: 'product' },
    { id: 4, name: 'Snacks', parent_category: null, category_type: 'product' },
  ];
  const names: [string, number, number, number, number][] = [
    ['Amul Taaza Milk 500ml', 1, 27, 28, 40],
    ['Amul Butter 100g', 1, 56, 58, 18],
    ['Mother Dairy Curd 400g', 1, 45, 50, 4],
    ['Paneer 200g', 1, 90, 95, 0],
    ['Brown Bread', 2, 45, 50, 12],
    ['Butter Croissant', 2, 60, 60, 7],
    ['Chocolate Muffin', 2, 40, 45, 22],
    ['Masala Chai Premix', 3, 120, 130, 9],
    ['Fresh Orange Juice 1L', 3, 110, 125, 15],
    ['Coca-Cola 750ml', 3, 40, 40, 48],
    ['Lays Classic 52g', 4, 20, 20, 60],
    ['Haldiram Bhujia 200g', 4, 55, 60, 3],
  ];
  const products: Product[] = names.map(([name, cat, price, mrp, stock], i) => ({
    id: i + 1,
    name,
    category: cat,
    category_name: categories.find((c) => c.id === cat)!.name,
    description: '',
    price: price.toFixed(2),
    mrp: mrp.toFixed(2),
    unit: 1,
    stock,
    low_stock_threshold: 5,
    image: null,
    product_type: 'PRODUCT',
    discount_type: i === 6 ? 'percentage' : null,
    discount_value: i === 6 ? '10.00' : null,
    discount_start: null,
    discount_end: null,
    is_active: i !== 11,
    sku: `SKU-${String(1000 + i)}`,
    barcode: `890100000${String(100 + i)}`,
    barcode_type: 'EAN13',
    created_at: iso(60 * 24 * (30 - i)),
    updated_at: iso(60),
  }));

  const statuses: VendorOrderStatus[] = ['created', 'created', 'accepted', 'preparing', 'ready-for-pickup', 'out-for-delivery', 'delivered', 'delivered', 'delivered', 'rejected', 'cancelled', 'delivered'];
  const customers = [
    ['Priya Sharma', '9876543210'],
    ['Rahul Verma', '9812345678'],
    ['Anita Desai', '9898989898'],
    ['', ''],
  ];
  const orders: VendorOrderFull[] = statuses.map((status, i) => {
    const [cname, cphone] = customers[i % customers.length];
    const lines = [products[i % products.length], products[(i + 3) % products.length]].map((p, j) => ({
      id: i * 10 + j,
      order: 100 + i,
      product: p.id,
      product_snapshot: { id: p.id, name: p.name, sku: p.sku },
      quantity: j + 1,
      unit_price: finalPrice(p).toFixed(2),
      line_total: (finalPrice(p) * (j + 1)).toFixed(2),
    }));
    const total = lines.reduce((s, l) => s + Number(l.line_total), 0);
    const pos = !cname;
    return {
      id: 1100 - i,
      order: pos ? null : 5000 + i,
      vendor: 1,
      shop: 1,
      external_id: pos ? null : `TNBS-${5000 + i}`,
      customer_name: cname,
      customer_phone: cphone,
      customer_address: pos ? null : { address_line1: '12 MG Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
      item_total: total.toFixed(2),
      discount_amount: '0.00',
      tax_amount: '0.00',
      total_amount: total.toFixed(2),
      status: pos ? 'delivered' : status,
      status_display: status,
      source: pos ? 'pos' : 'online',
      invoice_token: crypto.randomUUID(),
      is_paid: pos || status === 'delivered',
      accepted_at: null,
      rejected_at: null,
      ready_at: null,
      out_for_delivery_at: null,
      delivered_at: status === 'delivered' || pos ? iso(i * 90) : null,
      cancelled_at: null,
      rejection_reason: status === 'rejected' ? 'Item out of stock' : '',
      created_at: iso(i * 95 + 5),
      updated_at: iso(i * 60),
      items: lines,
    };
  });
  const history: Record<number, { id: number; from_status: string | null; to_status: string; note: string | null; changed_by: number | null; created_at: string }[]> = {};

  const catalog: CatalogService[] = [
    { id: 'svc-1', name: 'Haircut', category_name: 'Salon', pricing_type: 'FIXED', service_type: 'ON_SITE' },
    { id: 'svc-2', name: 'AC Service', category_name: 'Appliance repair', pricing_type: 'FIXED', service_type: 'HOME_SERVICE' },
    { id: 'svc-3', name: 'Deep Cleaning', category_name: 'Cleaning', pricing_type: 'HOURLY', service_type: 'HOME_SERVICE' },
  ];
  const shopServices: any[] = [
    { id: 1, service: 'svc-1', base_price: '250.00', minimum_price: '200.00', estimated_duration_minutes: 45, service_radius_km: null, is_available: true, cover_image: null, created_at: iso(5000) },
    { id: 2, service: 'svc-2', base_price: '599.00', minimum_price: null, estimated_duration_minutes: 90, service_radius_km: '8.00', is_available: true, cover_image: null, created_at: iso(4000) },
  ];
  const providers: Provider[] = [
    { id: 1, name: 'Arjun Mehta', profile_image: null, role: 'Senior stylist', shop: 1, phone: '9900112233', specialties: 'Haircut, Beard', specializations: ['Haircut', 'Beard'], rating: '4.70', review_count: 32, experience_years: 6, is_available: true },
    { id: 2, name: 'Meena Iyer', profile_image: null, role: 'Technician', shop: 1, phone: '9900445566', specialties: 'AC, Fridge', specializations: ['AC', 'Fridge'], rating: '4.40', review_count: 12, experience_years: 3, is_available: true },
  ];
  const availability: Record<number, any[]> = {
    1: [0, 1, 2, 3, 4, 5].map((d) => ({ id: d + 1, day_of_week: d, start_time: '10:00', end_time: '19:00', is_available: true })),
    2: [],
  };
  const bookingStatuses: Booking['status'][] = ['SCHEDULED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'SCHEDULED'];
  const bookings: Booking[] = bookingStatuses.map((status, i) => ({
    id: 300 - i,
    customer_name: ['Kavya Rao', 'Imran Khan', 'Neha Gupta'][i % 3],
    customer_phone: '98450' + String(10000 + i),
    service_name: catalog[i % 2].name,
    staff: providers[i % 2].name,
    start_time: new Date(now + (i - 2) * 3 * 3600_000).toISOString(),
    end_time: new Date(now + (i - 2) * 3 * 3600_000 + 3600_000).toISOString(),
    status,
    status_display: status.replace('_', ' ').toLowerCase(),
    booking_amount: '100.00',
    total_amount: i % 2 ? '599.00' : '250.00',
    payment_status: status === 'COMPLETED' ? 'PAID' : 'PARTIALLY_PAID',
    payment_status_display: status === 'COMPLETED' ? 'Paid' : 'Partially paid',
    balance_due: i % 2 ? '499.00' : '150.00',
    created_at: iso(i * 300),
  }));

  let balance = 12450.5;
  const transactions: WalletTransaction[] = Array.from({ length: 14 }, (_, i) => ({
    id: 900 - i,
    transaction_type: i % 4 === 3 ? 'debit' : 'credit',
    amount: (i % 4 === 3 ? 1500 : 320 + i * 41).toFixed(2),
    description: i % 4 === 3 ? 'Withdrawal payout' : `Order settlement #${1100 - i}`,
    timestamp: iso(i * 600),
    reference_id: `REF${900 - i}`,
    balance_after: null,
  }));
  let bankAccounts: BankAccount[] = [
    { id: 1, account_holder_name: 'Sharma General Store', bank_name: 'State Bank of India', account_masked: '********4521', ifsc_code: 'SBIN0001234', account_type: 'current', upi_id: null, is_primary: true, is_verified: true },
    { id: 2, account_holder_name: 'R Sharma', bank_name: 'HDFC Bank', account_masked: '********9087', ifsc_code: 'HDFC0000123', account_type: 'savings', upi_id: 'rsharma@hdfc', is_primary: false, is_verified: false },
  ];
  const withdrawals: Withdrawal[] = [
    { id: 41, amount: '1500.00', status: 'completed', status_display: 'Completed', notes: '', bank_account: 1, bank_name: 'State Bank of India', account_masked: '********4521', transaction_id: 'UTR123456789', created_at: iso(6000), processed_at: iso(5000) },
    { id: 42, amount: '2000.00', status: 'pending', status_display: 'Pending', notes: '', bank_account: 1, bank_name: 'State Bank of India', account_masked: '********4521', transaction_id: '', created_at: iso(300), processed_at: null },
  ];
  const rooms: ChatRoom[] = [
    { id: 'room-1', customer_name: 'Priya Sharma', last_message: 'Is the paneer fresh today?', last_message_at: iso(12) },
    { id: 'room-2', customer_name: 'Rahul Verma', last_message: 'Thanks!', last_message_at: iso(300) },
  ];
  const messages: Record<string, ChatMessage[]> = {
    'room-1': [{ id: 'm1', sender: 2, sender_name: 'Priya Sharma', message: 'Is the paneer fresh today?', is_read: true, created_at: iso(12) }],
    'room-2': [
      { id: 'm2', sender: 3, sender_name: 'Rahul Verma', message: 'Order received', is_read: true, created_at: iso(320) },
      { id: 'm3', sender: 1, sender_name: 'You', message: 'Glad it reached you!', is_read: true, created_at: iso(310) },
      { id: 'm4', sender: 3, sender_name: 'Rahul Verma', message: 'Thanks!', is_read: true, created_at: iso(300) },
    ],
  };

  const shop: ShopProfile = {
    id: 1,
    name: isService ? 'Glow Salon & Home Services' : 'Sharma General Store',
    tagline: 'Fresh every day',
    description: 'Neighbourhood store since 1998.',
    shop_image: null,
    cover_image: null,
    delivery_time_min: 20,
    delivery_time_max: 45,
    minimum_order: '99.00',
    free_delivery_threshold: '499.00',
    is_accepting_orders: true,
    is_service_provider: isService,
  };
  const me: VendorMe = {
    id: 1,
    business_name: shop.name,
    slug: 'sharma-general-store',
    is_verified: true,
    user: { id: 1, username: 'vendor1', email: 'owner@example.com', phone_number: '9876500000', role: 'vendor', is_phone_verified: true, is_email_verified: false },
    bda: null,
    bank_details: [],
    shop: {
      id: 1,
      name: shop.name,
      category_name: isService ? 'Salon' : 'Grocery',
      address: '12 MG Road, Bengaluru, Karnataka, 560001',
      location: { latitude: '12.975', longitude: '77.605' },
      documents: [{ id: 1, registration_number: 'REG-001', gstin: '29ABCDE1234F1Z5', pan_card: 'ABCDE1234F' }],
      is_accepting_orders: true,
    },
    wallet_balance: balance.toFixed(2),
    created_at: iso(100000),
  };

  const db = {
    me,
    shop,
    hours: [0, 1, 2, 3, 4, 5, 6].map((d) => ({ day_of_week: d, opening_time: '08:00:00', closing_time: '21:00:00', is_open: d !== 6 })) as StoreHour[],
    documents: me.shop!.documents![0] as { id: number; registration_number: string; gstin: string; pan_card: string } | null,
    categories,
    units: [{ id: 1, name: 'Piece', code: 'pc' }, { id: 2, name: 'Kilogram', code: 'kg' }, { id: 3, name: 'Litre', code: 'l' }],
    products,
    orders,
    catalog,
    shopServices,
    providers,
    availability,
    bookings,
    transactions,
    get bankAccounts() {
      return bankAccounts;
    },
    set bankAccounts(v: BankAccount[]) {
      bankAccounts = v;
    },
    withdrawals,
    rooms,
    messages,
    get balance() {
      return balance;
    },
    onboardingCategories: [
      { id: 10, name: 'Grocery', parent_category: null, category_type: 'product', children: [{ id: 11, name: 'Dairy', parent_category: 10, category_type: 'product', children: [] }] },
      { id: 20, name: 'Salon', parent_category: null, category_type: 'service', children: [] },
      { id: 21, name: 'Home repair', parent_category: null, category_type: 'service', children: [] },
    ] as OnboardingCategory[],

    pendingWithdrawals: () => withdrawals.filter((w) => w.status === 'pending' || w.status === 'processing').reduce((s, w) => s + Number(w.amount), 0),
    catalogName: (id: string) => catalog.find((c) => c.id === id)?.name ?? 'Service',

    orderListItem: (o: VendorOrderFull) => ({
      id: o.id,
      customer_name: o.customer_name,
      customer_phone: o.customer_phone,
      items_count: o.items?.length ?? 0,
      total_amount: o.total_amount,
      status: o.status,
      status_display: o.status,
      is_paid: o.is_paid,
      created_at: o.created_at,
    }),
    orderDetail: (o: VendorOrderFull) => ({
      id: o.id,
      external_id: o.external_id,
      customer_name: o.customer_name,
      customer_phone: o.customer_phone,
      total_amount: o.total_amount,
      status: o.status,
      status_display: o.status,
      is_paid: o.is_paid,
      rejection_reason: o.rejection_reason,
      created_at: o.created_at,
      delivered_at: o.delivered_at,
      history: history[o.id] ?? [{ id: o.id * 10, from_status: null, to_status: 'created', note: null, changed_by: null, created_at: o.created_at }],
    }),
    applyOrderAction(o: VendorOrderFull, action: string, note: string): string | null {
      const to = ACTION_TO_STATUS[action];
      if (!to) return 'Unknown action.';
      if (!(TRANSITIONS[o.status] ?? []).includes(to)) return `Cannot change vendor order from '${o.status}' to '${to}'.`;
      (history[o.id] ??= [...db.orderDetail(o).history]).push({ id: Date.now(), from_status: o.status, to_status: to, note, changed_by: 1, created_at: new Date().toISOString() });
      o.status = to;
      if (to === 'rejected') o.rejection_reason = note;
      return null;
    },

    productListItem: (p: Product) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      category_name: p.category_name,
      price: p.price,
      mrp: p.mrp,
      stock: p.stock,
      low_stock_threshold: p.low_stock_threshold,
      is_active: p.is_active,
      image: p.image,
      created_at: p.created_at,
    }),
    v2Product: (p: Product) => ({ ...p, final_price: finalPrice(p).toFixed(2), unit_name: 'Piece' }),
    posProduct: (p: Product) => ({ id: p.id, name: p.name, sku: p.sku, barcode: p.barcode, category_name: p.category_name, price: p.price, mrp: p.mrp, final_price: finalPrice(p).toFixed(2), stock: p.stock, image: p.image }),
    stockItem: (p: Product) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      stock: p.stock,
      price: p.price,
      mrp: p.mrp,
      image: p.image,
      category: p.category_name,
      is_low_stock: p.stock <= 10 && p.stock > 0,
      is_out_of_stock: p.stock === 0,
    }),
    createProduct(body: any) {
      const data = body instanceof FormData ? Object.fromEntries(body.entries()) : body;
      const p: Product = {
        id: Math.max(0, ...products.map((x) => x.id)) + 1,
        name: String(data.name),
        category: data.category ? Number(data.category) : null,
        category_name: categories.find((c) => c.id === Number(data.category))?.name ?? null,
        description: String(data.description ?? ''),
        price: String(data.price),
        mrp: String(data.mrp),
        unit: data.unit ? Number(data.unit) : null,
        stock: Number(data.stock ?? 0),
        low_stock_threshold: Number(data.low_stock_threshold ?? 5),
        image: null,
        product_type: 'PRODUCT',
        discount_type: data.discount_type || null,
        discount_value: data.discount_value || null,
        discount_start: data.discount_start || null,
        discount_end: data.discount_end || null,
        is_active: data.is_active === true || data.is_active === 'true',
        sku: `SKU-${2000 + products.length}`,
        barcode: null,
        barcode_type: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      products.unshift(p);
      return p;
    },
    updateStock(body: any): [number, unknown] {
      const p = products.find((x) => (body.product_id ? x.id === body.product_id : x.barcode === body.barcode));
      if (!p) return [404, { error: 'Product not found' }];
      const prev = p.stock;
      if (body.operation === 'set') p.stock = body.quantity;
      else if (body.operation === 'add') p.stock += body.quantity;
      else {
        if (p.stock - body.quantity < 0) return [400, { error: `Cannot subtract ${body.quantity} from current stock ${p.stock}` }];
        p.stock -= body.quantity;
      }
      return [200, { message: 'Stock updated successfully', product_id: p.id, product_name: p.name, previous_stock: prev, new_stock: p.stock, change: p.stock - prev }];
    },
    stockSummary: () => ({
      summary: {
        total_products: products.length,
        total_stock_value: products.reduce((s, p) => s + p.stock * Number(p.price), 0),
        out_of_stock_count: products.filter((p) => p.stock === 0).length,
        low_stock_count: products.filter((p) => p.stock > 0 && p.stock <= 10).length,
        in_stock_count: products.filter((p) => p.stock > 10).length,
      },
      low_stock_products: products.filter((p) => p.stock <= 10).sort((a, b) => a.stock - b.stock).slice(0, 10).map((p) => ({ id: p.id, name: p.name, stock: p.stock, barcode: p.barcode })),
    }),
    posCheckout(body: any): [number, unknown] {
      const qty = new Map<number, number>();
      for (const it of body.items) qty.set(it.product_id, (qty.get(it.product_id) ?? 0) + it.quantity);
      for (const [id, q] of qty) {
        const p = products.find((x) => x.id === id);
        if (!p) return [400, { items: `Unknown product id(s): ${id}` }];
        if (p.stock < q) return [400, { items: `Insufficient stock for "${p.name}" (available: ${p.stock}).` }];
      }
      const items = [...qty].map(([id, q], i) => {
        const p = products.find((x) => x.id === id)!;
        p.stock -= q;
        return { id: Date.now() + i, order: 0, product: id, product_snapshot: { id, name: p.name, sku: p.sku }, quantity: q, unit_price: finalPrice(p).toFixed(2), line_total: (finalPrice(p) * q).toFixed(2) };
      });
      const total = items.reduce((s, i) => s + Number(i.line_total), 0).toFixed(2);
      const order: VendorOrderFull = {
        id: Math.max(...orders.map((o) => o.id)) + 1,
        order: null,
        vendor: 1,
        shop: 1,
        external_id: null,
        customer_name: body.customer_name ?? '',
        customer_phone: body.customer_phone ?? '',
        customer_address: null,
        item_total: total,
        discount_amount: '0.00',
        tax_amount: '0.00',
        total_amount: total,
        status: 'delivered',
        status_display: 'Delivered',
        source: 'pos',
        invoice_token: crypto.randomUUID(),
        invoice_url: undefined,
        is_paid: true,
        accepted_at: null,
        rejected_at: null,
        ready_at: null,
        out_for_delivery_at: null,
        delivered_at: new Date().toISOString(),
        cancelled_at: null,
        rejection_reason: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        items,
      };
      orders.unshift(order);
      return [201, order];
    },
    dashboard() {
      const delivered = orders.filter((o) => o.status === 'delivered');
      const days = Array.from({ length: 14 }, (_, i) => {
        const d = new Date(now - (13 - i) * 86400_000);
        return { date: d.toISOString().slice(0, 10), total: Math.round(800 + 600 * Math.sin(i / 2) + i * 70) };
      });
      return {
        stats: {
          total_orders: orders.length,
          pending_orders: orders.filter((o) => ['created', 'accepted', 'preparing', 'processing', 'ready-for-pickup', 'out-for-delivery'].includes(o.status)).length,
          completed_orders: delivered.length,
          cancelled_orders: orders.filter((o) => ['rejected', 'cancelled'].includes(o.status)).length,
          revenue_today: delivered.slice(0, 2).reduce((s, o) => s + Number(o.total_amount), 0).toFixed(2),
          revenue_month: delivered.reduce((s, o) => s + Number(o.total_amount), 0).toFixed(2),
          total_products: products.length,
          low_stock_products: products.filter((p) => p.stock <= p.low_stock_threshold).length,
          wallet_balance: balance.toFixed(2),
          pending_payout: db.pendingWithdrawals().toFixed(2),
        },
        daily_sales: days,
        orders_by_category: categories.map((c, i) => ({ name: c.name, count: 9 - i * 2 })),
      };
    },
    serviceDashboard: () => ({
      id: 1,
      shop_id: '1',
      shop_name: shop.name,
      is_service_provider: shop.is_service_provider,
      active_shop_services: shopServices.filter((s) => s.is_available).length,
      total_service_providers: providers.length,
      active_service_providers: providers.filter((p) => p.is_available).length,
      total_service_bookings: bookings.length,
      scheduled_service_bookings: bookings.filter((b) => b.status === 'SCHEDULED').length,
      completed_service_bookings: bookings.filter((b) => b.status === 'COMPLETED').length,
      wallet_balance: balance.toFixed(2),
      is_verified: true,
    }),
    bookingDetail: (b: Booking) => ({
      ...b,
      amount_paid: b.payment_status === 'PAID' ? b.total_amount : b.booking_amount,
      amount_due: b.payment_status === 'PAID' ? '0.00' : (Number(b.total_amount) - Number(b.booking_amount)).toFixed(2),
      payment_detail: null,
      service_detail: { id: 1, service_id: 'svc-1', name: b.service_name, category_name: 'Salon', service_type: 'ON_SITE', pricing_type: 'FIXED', base_price: b.total_amount, estimated_duration_minutes: 60 },
    }),
    applyBookingAction(b: Booking, body: any) {
      if (body.action === 'start') b.status = 'IN_PROGRESS';
      if (body.action === 'complete') b.status = 'COMPLETED';
      if (body.action === 'cancel') b.status = 'CANCELLED';
      if (body.action === 'collect_balance') b.payment_status = 'PAID';
      if (body.action === 'reschedule') Object.assign(b, { start_time: body.start_time, end_time: body.end_time });
      b.status_display = b.status.replace('_', ' ').toLowerCase();
    },
    providerAvailability: (id: number, date: string | null) => {
      const availabilityRows = availability[id] ?? [];
      if (!date) return { availability: availabilityRows, breaks: [], slots: {} };
      const day = (new Date(`${date}T00:00:00`).getDay() + 6) % 7;
      const row = availabilityRows.find((a) => a.day_of_week === day && a.is_available);
      const slots = row ? ['10:00', '11:00', '12:00', '14:00', '15:00', '16:00'].map((t) => ({ start_time: t, end_time: `${String(Number(t.slice(0, 2)) + 1).padStart(2, '0')}:00`, is_available: t !== '12:00' })) : [];
      return { availability: availabilityRows.filter((a) => a.day_of_week === day), breaks: [], slots };
    },
    addBankAccount(body: any) {
      const a: BankAccount = {
        id: Math.max(0, ...bankAccounts.map((x) => x.id)) + 1,
        account_holder_name: body.account_holder_name,
        bank_name: body.bank_name,
        account_masked: '*'.repeat(Math.max(0, body.account_number.length - 4)) + body.account_number.slice(-4),
        ifsc_code: body.ifsc_code,
        account_type: body.account_type,
        upi_id: body.upi_id ?? null,
        is_primary: Boolean(body.is_primary) || bankAccounts.length === 0,
        is_verified: false,
      };
      if (a.is_primary) bankAccounts.forEach((x) => (x.is_primary = false));
      bankAccounts.push(a);
      return a;
    },
    createWithdrawal(body: any): [number, unknown] {
      const amount = Number(body.amount);
      if (amount < 100) return [400, { amount: ['Ensure this value is greater than or equal to 100.'] }];
      if (amount > balance) return [400, { amount: ['Insufficient balance'] }];
      const acct = bankAccounts.find((a) => a.id === body.bank_account_id);
      if (!acct) return [400, { bank_account_id: ['Invalid bank account'] }];
      const w: Withdrawal = {
        id: Math.max(...withdrawals.map((x) => x.id)) + 1,
        amount: amount.toFixed(2),
        status: 'pending',
        status_display: 'Pending',
        notes: body.notes ?? '',
        bank_account: acct.id,
        bank_name: acct.bank_name,
        account_masked: acct.account_masked ?? '',
        transaction_id: '',
        created_at: new Date().toISOString(),
        processed_at: null,
      };
      withdrawals.unshift(w);
      return [201, w];
    },
  };
  return db;
}

export type MockDb = ReturnType<typeof createMockDb>;
