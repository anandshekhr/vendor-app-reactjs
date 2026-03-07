// ============================================
// Vendor / Auth Types
// ============================================

export interface Vendor {
  id: string;
  shopName: string;
  ownerName: string;
  mobile: string;
  email: string;
  shopAddress: string;
  location: GeoLocation;
  shopCategory: string;
  gstNumber?: string;
  shopImage?: string;
  openingHours?: OpeningHours;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface OpeningHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

export interface DayHours {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  vendor: Vendor | null;
  isLoading: boolean;
  otpSent: boolean;
  error: string | null;
}

export interface LoginRequest {
  mobile: string;
}

export interface OTPVerifyRequest {
  mobile: string;
  otp: string;
  firebaseToken: string;
}

export interface RegisterRequest {
  shopName: string;
  ownerName: string;
  mobile: string;
  email: string;
  shopAddress: string;
  location: GeoLocation;
  shopCategory: string;
  gstNumber?: string;
}

// ============================================
// Product Types
// ============================================

export interface Product {
  id: string;
  vendorId: string;
  masterProductId?: string;
  name: string;
  category: string;
  subcategory: string;
  price: number;
  discountPrice?: number;
  unit: ProductUnit;
  description: string;
  images: string[];
  stockQuantity: number;
  sku?: string;
  barcode?: string;
  isActive: boolean;
  isSubscriptionEnabled: boolean;
  subscriptionFrequencies?: SubscriptionFrequency[];
  minSubscriptionDuration?: number;
  subscriptionDiscount?: number;
  lowStockThreshold: number;
  createdAt: string;
  updatedAt: string;
}

export type ProductUnit = 'kg' | 'g' | 'piece' | 'packet' | 'litre' | 'ml' | 'dozen' | 'box' | 'bundle';

export type SubscriptionFrequency = 'daily' | 'alternate_days' | 'weekly' | 'monthly' | 'custom';

export interface MasterProduct {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  description: string;
  images: string[];
  barcode?: string;
  brand?: string;
  unit: ProductUnit;
}

export interface ProductFormData {
  name: string;
  category: string;
  subcategory: string;
  price: string;
  discountPrice: string;
  unit: ProductUnit;
  description: string;
  images: string[];
  stockQuantity: string;
  sku: string;
  barcode: string;
  isSubscriptionEnabled: boolean;
  subscriptionFrequencies: SubscriptionFrequency[];
  minSubscriptionDuration: string;
  subscriptionDiscount: string;
  lowStockThreshold: string;
}

export interface ProductState {
  products: Product[];
  masterProducts: MasterProduct[];
  selectedProduct: Product | null;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  filter: ProductFilter;
}

export interface ProductFilter {
  category?: string;
  isActive?: boolean;
  lowStock?: boolean;
}

// ============================================
// Order Types
// ============================================

export type OrderStatus = 'new' | 'accepted' | 'preparing' | 'ready_for_pickup' | 'out_for_delivery' | 'completed' | 'cancelled';

export type PaymentMethod = 'cod' | 'online' | 'wallet' | 'upi';

export interface Order {
  id: string;
  orderId: string;
  vendorId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  items: OrderItem[];
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  status: OrderStatus;
  deliveryPartnerId?: string;
  deliveryPartner?: DeliveryPartner;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  discountPrice?: number;
  unit: ProductUnit;
  image?: string;
}

export interface DeliveryPartner {
  id: string;
  name: string;
  phone: string;
  distance: number;
  isAvailable: boolean;
  currentLocation?: GeoLocation;
}

export interface OrderState {
  orders: Order[];
  selectedOrder: Order | null;
  deliveryPartners: DeliveryPartner[];
  isLoading: boolean;
  error: string | null;
  activeTab: OrderStatus | 'all';
}

// ============================================
// Inventory Types
// ============================================

export interface InventoryItem {
  productId: string;
  productName: string;
  currentStock: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  reservedForSubscriptions: number;
  availableStock: number;
  unit: ProductUnit;
  lastUpdated: string;
}

export interface StockUpdate {
  productId: string;
  quantity: number;
  type: 'increase' | 'decrease' | 'set';
}

export interface InventoryState {
  items: InventoryItem[];
  isLoading: boolean;
  error: string | null;
  showLowStockOnly: boolean;
}

// ============================================
// Wallet & Payment Types
// ============================================

export interface Wallet {
  balance: number;
  totalEarnings: number;
  pendingAmount: number;
}

export type TransactionType = 'order_earning' | 'withdrawal' | 'refund' | 'recharge' | 'subscription_payment';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  status: 'success' | 'pending' | 'failed';
  createdAt: string;
  referenceId?: string;
}

export interface WithdrawalRequest {
  amount: number;
  method: 'bank_transfer' | 'upi';
  bankAccountId?: string;
  upiId?: string;
}

export interface BankAccount {
  id: string;
  holderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId?: string;
  isVerified: boolean;
  isPrimary: boolean;
}

export interface WalletState {
  wallet: Wallet | null;
  transactions: Transaction[];
  bankAccounts: BankAccount[];
  isLoading: boolean;
  error: string | null;
}

// ============================================
// Subscription Types
// ============================================

export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'completed';

export interface ProductSubscription {
  id: string;
  vendorId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  productId: string;
  productName: string;
  productImage?: string;
  quantity: number;
  pricePerUnit: number;
  frequency: SubscriptionFrequency;
  deliveryDays?: string[];
  deliveryTimeSlot?: string;
  startDate: string;
  nextDeliveryDate: string;
  totalDeliveries: number;
  remainingDeliveries?: number;
  status: SubscriptionStatus;
  paymentType: 'prepaid' | 'pay_per_delivery' | 'monthly_billing';
  paymentStatus: 'paid' | 'pending' | 'failed';
  deliveryPartnerId?: string;
  deliveryPartner?: DeliveryPartner;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionDelivery {
  id: string;
  subscriptionId: string;
  customerName: string;
  customerPhone: string;
  productName: string;
  quantity: number;
  deliveryAddress: string;
  deliveryDate: string;
  deliveryStatus: 'pending' | 'assigned' | 'delivered' | 'skipped' | 'rescheduled';
  deliveryPartnerId?: string;
  deliveryPartner?: DeliveryPartner;
}

export interface SubscriptionState {
  subscriptions: ProductSubscription[];
  todayDeliveries: SubscriptionDelivery[];
  selectedSubscription: ProductSubscription | null;
  isLoading: boolean;
  error: string | null;
  activeTab: SubscriptionStatus | 'all';
  stats: SubscriptionStats;
}

export interface SubscriptionStats {
  totalActive: number;
  todayDeliveries: number;
  tomorrowDeliveries: number;
  monthlyRecurringRevenue: number;
}

export interface SubscriptionSettings {
  minSubscriptionQuantity: number;
  allowedProducts: string[];
  deliveryTimeSlots: string[];
  pauseLimit: number;
}

// ============================================
// Vendor Plan / Subscription Types
// ============================================

export type PlanType = 'free' | 'basic' | 'premium';

export interface VendorPlan {
  id: string;
  name: string;
  type: PlanType;
  price: number;
  duration: number; // days
  features: string[];
  maxProducts: number;
  maxOrders: number;
}

export interface VendorSubscription {
  id: string;
  planId: string;
  planName: string;
  planType: PlanType;
  price: number;
  startDate: string;
  endDate: string;
  remainingDays: number;
  renewalDate: string;
  isActive: boolean;
  autoRenew: boolean;
}

export interface PlanState {
  plans: VendorPlan[];
  currentSubscription: VendorSubscription | null;
  isLoading: boolean;
  error: string | null;
}

// ============================================
// Analytics Types
// ============================================

export interface DashboardStats {
  todayOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalProducts: number;
  lowStockProducts: number;
  walletBalance: number;
  subscriptionStatus: string;
  totalActiveSubscriptions: number;
  todaySubscriptionDeliveries: number;
}

export interface AnalyticsData {
  dailySales: SalesData[];
  weeklySales: SalesData[];
  topSellingProducts: TopProduct[];
  orderTrends: OrderTrend[];
  subscriptionGrowth: SubscriptionGrowthData[];
  topSubscribedProducts: TopProduct[];
}

export interface SalesData {
  date: string;
  amount: number;
  orderCount: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  quantity: number;
  revenue: number;
}

export interface OrderTrend {
  date: string;
  newOrders: number;
  completedOrders: number;
  cancelledOrders: number;
}

export interface SubscriptionGrowthData {
  date: string;
  newSubscriptions: number;
  cancelledSubscriptions: number;
  totalActive: number;
}

// ============================================
// Notification Types
// ============================================

export type NotificationType =
  | 'new_order'
  | 'low_stock'
  | 'subscription_expiry'
  | 'payment_received'
  | 'promotion'
  | 'new_subscription'
  | 'subscription_cancelled'
  | 'subscription_paused'
  | 'upcoming_delivery';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
  isRead: boolean;
  createdAt: string;
}

// ============================================
// Navigation Types
// ============================================

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Onboarding: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  OTPVerification: { mobile: string };
  Register: { mobile: string };
};

export type MainTabParamList = {
  Home: undefined;
  Orders: undefined;
  Products: undefined;
  Subscriptions: undefined;
  More: undefined;
};

export type HomeStackParamList = {
  Dashboard: undefined;
  Notifications: undefined;
  Search: undefined;
};

export type ProductStackParamList = {
  ProductList: undefined;
  AddProduct: undefined;
  EditProduct: { productId: string };
  ProductDetail: { productId: string };
  BarcodeScanner: undefined;
  MasterProductSearch: undefined;
  Inventory: undefined;
};

export type OrderStackParamList = {
  OrderList: undefined;
  OrderDetail: { orderId: string };
  AssignDeliveryPartner: { orderId: string };
};

export type SubscriptionStackParamList = {
  SubscriptionDashboard: undefined;
  SubscriptionList: undefined;
  SubscriptionDetail: { subscriptionId: string };
  TodayDeliveries: undefined;
  SubscriptionSettings: undefined;
};

export type MoreStackParamList = {
  MoreMenu: undefined;
  Profile: undefined;
  EditProfile: undefined;
  WalletHome: undefined;
  WithdrawMoney: undefined;
  AddBankAccount: undefined;
  TransactionHistory: undefined;
  VendorPlans: undefined;
  Analytics: undefined;
  Settings: undefined;
};
