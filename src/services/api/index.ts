import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from './baseQuery';

export const TAGS = [
  'Me',
  'Shop',
  'StoreHours',
  'Documents',
  'Dashboard',
  'ServiceDashboard',
  'Orders',
  'Order',
  'Products',
  'Product',
  'Stock',
  'Categories',
  'Units',
  'Services',
  'Bookings',
  'Employees',
  'Wallet',
  'Transactions',
  'BankAccounts',
  'Withdrawals',
  'Chat',
  'PosSales',
  'ShopQr',
] as const;

/** Single RTK Query API; each feature injects its own endpoints (see features/<name>/api.ts). */
export const api = createApi({
  reducerPath: 'api',
  baseQuery: axiosBaseQuery,
  tagTypes: TAGS,
  refetchOnReconnect: true,
  refetchOnFocus: false,
  keepUnusedDataFor: 60,
  endpoints: () => ({}),
});
