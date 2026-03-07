export const API_BASE_URL = 'https://api.thenearbyshop.com/v1';

export const STORAGE_KEYS = {
  AUTH_TOKEN: '@auth_token',
  FCM_TOKEN: '@fcm_token',
  VENDOR_DATA: '@vendor_data',
  LANGUAGE: '@language',
  NOTIFICATION_PREFS: '@notification_prefs',
};

export const RAZORPAY_KEY = 'rzp_live_XXXXXXXXXXXX'; // Replace with actual key

export const SHOP_CATEGORIES = [
  'Grocery',
  'Dairy',
  'Fruits & Vegetables',
  'Bakery',
  'Meat & Fish',
  'Pharmacy',
  'Electronics',
  'Clothing',
  'Hardware',
  'Stationery',
  'Restaurant',
  'Sweet Shop',
  'General Store',
  'Other',
];

export const PRODUCT_UNITS = [
  { label: 'Kilogram (kg)', value: 'kg' },
  { label: 'Gram (g)', value: 'g' },
  { label: 'Piece', value: 'piece' },
  { label: 'Packet', value: 'packet' },
  { label: 'Litre', value: 'litre' },
  { label: 'Millilitre (ml)', value: 'ml' },
  { label: 'Dozen', value: 'dozen' },
  { label: 'Box', value: 'box' },
  { label: 'Bundle', value: 'bundle' },
];

export const SUBSCRIPTION_FREQUENCIES = [
  { label: 'Daily', value: 'daily' },
  { label: 'Alternate Days', value: 'alternate_days' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Custom', value: 'custom' },
];

export const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
];

export const ORDER_STATUS_LABELS: Record<string, string> = {
  new: 'New Orders',
  accepted: 'Accepted',
  preparing: 'Preparing',
  ready_for_pickup: 'Ready for Pickup',
  out_for_delivery: 'Out for Delivery',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  new: '#FF9800',
  accepted: '#2196F3',
  preparing: '#9C27B0',
  ready_for_pickup: '#00BCD4',
  out_for_delivery: '#3F51B5',
  completed: '#4CAF50',
  cancelled: '#F44336',
};

export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  order_earning: 'Order Earning',
  withdrawal: 'Withdrawal',
  refund: 'Refund',
  recharge: 'Recharge',
  subscription_payment: 'Subscription Payment',
};
