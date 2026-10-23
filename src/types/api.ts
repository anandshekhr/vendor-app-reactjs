/**
 * Types mirroring the Django serializers (see API_MAPPING.md for the source of each).
 * DRF DecimalFields serialise as strings; they are typed `Decimal` and parsed only for display.
 */
export type Decimal = string | number;
export type ISODateTime = string;

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface VerifyOtpResponse {
  token: { access: string; refresh: string };
  user_id: number;
  vendorUserId: number | null;
  bdaUserId: number | null;
}

// ─── Vendor / shop ───────────────────────────────────────────────────────────

export interface ApiUser {
  id: number;
  username: string;
  email: string;
  phone_number: string;
  role: string;
  is_phone_verified: boolean;
  is_email_verified: boolean;
}

export interface ShopLocation {
  shop?: number;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  latitude?: Decimal | null;
  longitude?: Decimal | null;
  address?: string;
}

export interface ShopDocumentRecord {
  id: number;
  registration_number: string;
  gstin: string;
  pan_card: string;
}

export interface VendorShopSummary {
  id: number;
  name: string;
  slug?: string | null;
  shop_image?: string | null;
  cover_image?: string | null;
  category?: unknown;
  category_name?: string;
  is_accepting_orders?: boolean;
  address?: string | null;
  location?: ShopLocation | null;
  documents?: ShopDocumentRecord[];
}

export interface BankDetailRecord {
  id: number;
  account_holder_name: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  upi_id?: string | null;
}

export interface VendorMe {
  id: number;
  business_name: string;
  slug: string | null;
  is_verified: boolean;
  user: ApiUser;
  bda: { id: number; region: string } | null;
  bank_details: BankDetailRecord[];
  shop: VendorShopSummary | null;
  wallet_balance: Decimal;
  created_at: ISODateTime;
}

export interface ShopProfile {
  id: number;
  name: string;
  tagline: string | null;
  description: string | null;
  shop_image: string | null;
  cover_image: string | null;
  delivery_time_min: number;
  delivery_time_max: number;
  minimum_order: Decimal;
  free_delivery_threshold: Decimal;
  is_accepting_orders: boolean;
  is_service_provider: boolean;
}

export interface StoreHour {
  day_of_week: number; // 0 = Monday … 6 = Sunday
  day_label?: string;
  opening_time: string; // HH:MM[:SS]
  closing_time: string;
  is_open: boolean;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardStats {
  total_orders: number;
  pending_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  revenue_today: Decimal;
  revenue_month: Decimal;
  total_products: number;
  low_stock_products: number;
  wallet_balance: Decimal;
  pending_payout: Decimal;
}

export interface DashboardResponse {
  stats: DashboardStats;
  daily_sales: { date: string; total: number }[];
  orders_by_category: { name: string; count: number }[];
}

export interface ServiceDashboardResponse {
  id: number;
  shop_id: string;
  shop_name: string;
  is_service_provider: boolean;
  active_shop_services: number;
  total_service_providers: number;
  active_service_providers: number;
  total_service_bookings: number;
  scheduled_service_bookings: number;
  completed_service_bookings: number;
  wallet_balance: Decimal;
  is_verified: boolean;
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export type VendorOrderStatus =
  | 'created'
  | 'accepted'
  | 'rejected'
  | 'preparing'
  | 'processing'
  | 'ready-for-pickup'
  | 'out-for-delivery'
  | 'delivered'
  | 'cancelled';

/** Rider-search state from api-services delivery_platform/vendor_delivery.py. */
export type DeliveryState =
  | 'not_requested'
  | 'starting'
  | 'searching'
  | 'not_found'
  | 'rider_found'
  | 'assigned'
  | 'picked_up'
  | 'delivered'
  | 'stopped'
  | 'cancelled'
  | 'failed'
  | 'error';

export interface DeliverySummary {
  state: DeliveryState;
  platform_status: string | null;
  rider: { name: string; phone: string; vehicle_type: string } | null;
  can_retry: boolean;
  can_stop: boolean;
  updated_at?: ISODateTime;
}

export interface OrderListItem {
  id: number;
  customer_name: string;
  customer_phone: string;
  items_count: number;
  total_amount: Decimal;
  status: VendorOrderStatus;
  status_display: string;
  is_paid: boolean;
  /** Present once the api-services vendor-portal update is deployed. */
  source?: 'online' | 'pos';
  delivery?: DeliverySummary;
  created_at: ISODateTime;
}

export interface OrderHistoryEntry {
  id: number;
  from_status: string | null;
  to_status: string;
  note: string | null;
  changed_by: number | null;
  created_at: ISODateTime;
}

export interface OrderDetail {
  id: number;
  external_id: string | null;
  customer_name: string;
  customer_phone: string;
  total_amount: Decimal;
  status: VendorOrderStatus;
  status_display: string;
  is_paid: boolean;
  rejection_reason: string;
  created_at: ISODateTime;
  delivered_at: ISODateTime | null;
  history: OrderHistoryEntry[];
  // Added by the api-services vendor-portal update (shop-scoped). Optional so older servers still work.
  customer_address?: Record<string, unknown> | null;
  item_total?: Decimal;
  discount_amount?: Decimal;
  tax_amount?: Decimal;
  /** Delivery charge for this shop's part of the order; already included in total_amount. */
  shipping_amount?: Decimal;
  source?: 'online' | 'pos';
  items?: VendorOrderItem[];
  payments?: { provider: string; amount: Decimal; status: string; created_at: ISODateTime }[];
  invoice_url?: string | null;
  platform_order_id?: number | null;
  delivery?: DeliverySummary;
  accepted_at?: ISODateTime | null;
  ready_at?: ISODateTime | null;
  out_for_delivery_at?: ISODateTime | null;
  cancelled_at?: ISODateTime | null;
}

export interface VendorOrderItem {
  id: number;
  order: number;
  product: number | null;
  product_snapshot: { id?: number; name?: string; sku?: string; [k: string]: unknown };
  quantity: number;
  unit_price: Decimal;
  line_total: Decimal | null;
}

/** Full VendorOrder from /api/v2/vendors/orders/<id>/ (vendor service / v2). */
export interface VendorOrderFull {
  id: number;
  order: number | null;
  vendor: number;
  shop: number | null;
  external_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_address: Record<string, unknown> | null;
  item_total: Decimal;
  discount_amount: Decimal;
  tax_amount: Decimal;
  shipping_amount?: Decimal;
  total_amount: Decimal;
  status: VendorOrderStatus;
  status_display: string;
  source: 'online' | 'pos';
  invoice_token: string;
  invoice_url?: string;
  is_paid: boolean;
  accepted_at: ISODateTime | null;
  rejected_at: ISODateTime | null;
  ready_at: ISODateTime | null;
  out_for_delivery_at: ISODateTime | null;
  delivered_at: ISODateTime | null;
  cancelled_at: ISODateTime | null;
  rejection_reason: string;
  created_at: ISODateTime;
  updated_at: ISODateTime;
  items?: VendorOrderItem[];
}

export type OrderAction = 'accept' | 'reject' | 'mark_preparing' | 'mark_processing' | 'mark_ready' | 'cancel';

// ─── Delivery ────────────────────────────────────────────────────────────────

export interface DeliveryPartner {
  id: string;
  name?: string;
  user_name?: string;
  phone?: string;
  vehicle_type?: string;
  is_online?: boolean;
  is_available?: boolean;
  average_rating?: Decimal;
}

// ─── Catalogue ───────────────────────────────────────────────────────────────

export interface Category {
  id: number;
  name: string;
  parent_category: number | null;
  parent_category_name?: string | null;
  category_type?: 'product' | 'service';
  units?: Unit[];
  is_active?: boolean;
}

export interface Unit {
  id: number;
  name: string;
  code: string;
}

export interface ProductListItem {
  id: number;
  name: string;
  sku: string;
  category_name: string | null;
  price: Decimal;
  mrp: Decimal;
  stock: number;
  low_stock_threshold: number;
  is_active: boolean;
  image: string | null;
  created_at: ISODateTime;
}

export type DiscountType = 'percentage' | 'fixed';
export type ProductType = 'PRODUCT' | 'SERVICE' | 'DIGITAL';

export interface ProductDetail {
  id: number;
  name: string;
  category: number | null;
  description: string;
  price: Decimal;
  mrp: Decimal;
  unit: number | null;
  stock: number;
  low_stock_threshold: number;
  image: string | null;
  product_type: ProductType;
  discount_type: DiscountType | null;
  discount_value: Decimal | null;
  discount_start: string | null;
  discount_end: string | null;
  is_active: boolean;
  sku: string;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

/** v2 ProductSerializer (barcode scan endpoint). */
export interface ScannedProduct {
  id: number;
  name: string;
  sku: string;
  barcode: string | null;
  barcode_type: string | null;
  category: number | null;
  category_name: string | null;
  unit_name?: string | null;
  price: Decimal;
  mrp: Decimal;
  final_price: Decimal;
  stock: number;
  image: string | null;
}

export type BarcodeType = 'EAN13' | 'EAN8' | 'UPC' | 'CODE128' | 'CODE39' | 'QR' | 'OTHER';

export interface MasterCatalogItem {
  id: number;
  name: string;
  sku: string;
  barcode?: string | null;
  image: string | null;
  category_name: string | null;
  unit_name: string | null;
  brand_name: string | null;
  selling_price: Decimal | null;
  max_retail_price: Decimal | null;
  is_active: boolean;
  already_added: boolean;
}

// ─── Stock ───────────────────────────────────────────────────────────────────

export interface StockSummary {
  summary: {
    total_products: number;
    total_stock_value: number;
    out_of_stock_count: number;
    low_stock_count: number;
    in_stock_count: number;
  };
  low_stock_products: { id: number; name: string; stock: number; barcode: string | null }[];
}

export interface StockListItem {
  id: number;
  name: string;
  sku: string;
  barcode: string | null;
  stock: number;
  price: string;
  mrp: string;
  image: string | null;
  category: string | null;
  is_low_stock: boolean;
  is_out_of_stock: boolean;
}

export type StockOperation = 'add' | 'subtract' | 'set';

export interface StockUpdateResponse {
  message: string;
  product_id: number;
  product_name: string;
  previous_stock: number;
  new_stock: number;
  change: number;
}

// ─── POS ─────────────────────────────────────────────────────────────────────

export interface PosProduct {
  id: number;
  name: string;
  sku: string;
  barcode: string | null;
  category_name: string | null;
  price: Decimal;
  mrp: Decimal;
  final_price: Decimal;
  stock: number;
  image: string | null;
}

export type PosPaymentMethod = 'cash' | 'card' | 'upi';

export interface PosCheckoutRequest {
  items: { product_id: number; quantity: number }[];
  payment_method: PosPaymentMethod;
  customer_name: string;
  customer_phone: string;
  /** Sent for forward compatibility with server-side idempotency (API_MAPPING G-9); ignored today. */
  client_reference?: string;
}

// ─── Services / bookings / employees ────────────────────────────────────────

export interface CatalogService {
  id: string;
  name: string;
  slug?: string | null;
  short_description?: string | null;
  description?: string | null;
  category?: unknown;
  category_name?: string | null;
  image?: string | null;
  service_type?: string;
  pricing_type?: 'FIXED' | 'HOURLY' | 'CUSTOM' | string;
}

export interface ShopServiceListItem {
  id: number;
  service: string;
  service_name: string;
  base_price: Decimal;
  is_available: boolean;
  cover_image: string | null;
}

export interface ShopServiceDetail {
  id: number;
  service: string;
  base_price: Decimal;
  minimum_price: Decimal | null;
  estimated_duration_minutes: number | null;
  service_radius_km: Decimal | null;
  is_available: boolean;
  cover_image: string | null;
  created_at: ISODateTime;
}

export type BookingStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'REFUNDED' | 'FAILED';

export interface BookingListItem {
  id: number;
  customer_name: string;
  customer_phone: string;
  service_name: string;
  staff: string | null;
  start_time: ISODateTime;
  status: BookingStatus;
  status_display: string;
  booking_amount: Decimal;
  total_amount: Decimal;
  payment_status: PaymentStatus;
  payment_status_display: string;
  balance_due: Decimal;
}

export interface BookingDetail extends Omit<BookingListItem, 'balance_due'> {
  end_time: ISODateTime;
  amount_paid: Decimal;
  amount_due: Decimal;
  created_at: ISODateTime;
  payment_detail: {
    payment_id: string;
    payment_gateway: string;
    razorpay_order_id: string | null;
    currency: string;
    amount: Decimal;
    status: string;
    transaction_time: ISODateTime | null;
  } | null;
  service_detail: {
    id: number;
    service_id: string;
    name: string;
    category_name: string | null;
    service_type: string;
    pricing_type: string;
    base_price: Decimal;
    estimated_duration_minutes: number | null;
  } | null;
}

export type BookingAction = 'start' | 'complete' | 'cancel' | 'reschedule' | 'collect_balance';

export interface Provider {
  id: number;
  name: string;
  profile_image: string | null;
  role: string;
  shop: number;
  phone: string;
  specialties: string;
  specializations: string[];
  rating: Decimal;
  review_count: number;
  experience_years: number;
  is_available: boolean;
}

export interface ProviderAvailability {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export interface ProviderAvailabilityResponse {
  availability: ProviderAvailability[];
  breaks: { id: number; date: string; start_time: string; end_time: string }[];
  slots: unknown;
}

// ─── Wallet ──────────────────────────────────────────────────────────────────

export interface WalletTransaction {
  id: number;
  transaction_type: string;
  amount: Decimal;
  description: string;
  timestamp: ISODateTime;
  reference_id?: string;
  balance_after?: Decimal | null;
}

export interface WalletResponse {
  wallet: { id: number; balance: Decimal };
  pending_payout: Decimal;
  transactions: WalletTransaction[];
}

export interface WalletBalanceBreakdown {
  balance: string;
  available_balance: string;
  pending_withdrawals: string;
}

export interface BankAccount {
  id: number;
  account_holder_name: string;
  bank_name: string;
  /** Write-only on the v2 list endpoint; never rendered. */
  account_number?: string;
  /** Server-masked number (v2 list). */
  account_masked?: string;
  ifsc_code: string;
  account_type: 'savings' | 'current';
  upi_id: string | null;
  is_primary: boolean;
  is_verified?: boolean;
  created_at?: ISODateTime;
}

export type WithdrawalStatus = 'pending' | 'processing' | 'completed' | 'rejected';

export interface Withdrawal {
  id: number;
  amount: Decimal;
  status: WithdrawalStatus;
  status_display: string;
  notes: string;
  bank_account: number | null;
  bank_name: string | null;
  account_masked: string;
  transaction_id: string;
  created_at: ISODateTime;
  processed_at: ISODateTime | null;
}

// ─── Chat ────────────────────────────────────────────────────────────────────

/** apps.chat ChatThreadSerializer (/api/v2/chat/conversations/). */
export interface ChatThread {
  id: string;
  customer: { id: number; name: string; phone_number: string };
  vendor: { id: number; business_name: string; slug: string | null };
  shop: { id: number; name: string } | null;
  /** Platform (customer) order id, not the vendor order id. */
  order_id: number | null;
  service_booking_id: number | null;
  status: 'ACTIVE' | 'CLOSED' | 'BLOCKED';
  last_message: ChatMessage | null;
  unread_count: number;
  last_message_at: ISODateTime | null;
  created_at: ISODateTime;
}

export type ChatMessageType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE' | 'AUDIO' | 'SYSTEM';

/** apps.chat ChatMessageSerializer. */
export interface ChatMessage {
  id: string;
  thread: string;
  sender: { id: number; name: string };
  sender_type: 'USER' | 'VENDOR' | 'SYSTEM';
  message_type: ChatMessageType;
  message: string;
  attachment: { url: string | null; file_type: string; file_size: number; original_filename: string } | null;
  reply_to: { id: string; message: string; message_type: ChatMessageType; sender_id: number; created_at: ISODateTime } | null;
  is_read: boolean;
  read_at: ISODateTime | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

// ─── Onboarding ──────────────────────────────────────────────────────────────

export interface OnboardingCategory {
  id: number;
  name: string;
  parent_category: number | null;
  category_type: 'product' | 'service';
  children: OnboardingCategory[];
}

export interface VendorApplication {
  id: number;
  vendor_name: string;
  business_name: string;
  phone: string;
  status: string;
  admin_review_note?: string;
  requested_documents_note?: string;
  created_at: ISODateTime;
}

// ─── Shop QR ─────────────────────────────────────────────────────────────────

export interface ShopQrCode {
  code: string;
  scan_url: string;
  /** SVG data URI rendered by the server. */
  qr_svg: string;
  table_number: string | null;
  scan_count: number;
  last_scanned_at: ISODateTime | null;
  assigned_at: ISODateTime | null;
}

export interface ShopQrResponse {
  shop: { id: number; name: string; slug: string | null };
  shop_url: string | null;
  max_codes: number;
  codes: ShopQrCode[];
}
