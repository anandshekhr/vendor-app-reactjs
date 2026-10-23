import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { FullPageSpinner } from '@/components/ui';
import { RedirectIfAuthenticated, RequireAuth, RequireCapability } from '@/features/auth/guards';
import type { Capability } from '@/features/auth/capabilities';
import { NotFoundPage } from './NotFoundPage';

const page = (loader: () => Promise<Record<string, unknown>>, name: string) =>
  lazy(async () => ({ default: (await loader())[name] as React.ComponentType }));

const LoginPage = page(() => import('@/features/auth/LoginPage'), 'LoginPage');
const VerifyOtpPage = page(() => import('@/features/auth/VerifyOtpPage'), 'VerifyOtpPage');
const OnboardingPage = page(() => import('@/features/onboarding/OnboardingPage'), 'OnboardingPage');
const ApplicationStatusPage = page(() => import('@/features/onboarding/ApplicationStatusPage'), 'ApplicationStatusPage');
const DashboardPage = page(() => import('@/features/dashboard/DashboardPage'), 'DashboardPage');
const OrdersPage = page(() => import('@/features/orders/OrdersPage'), 'OrdersPage');
const InvoicePage = page(() => import('@/features/orders/InvoicePage'), 'InvoicePage');
const OrderDetailPage = page(() => import('@/features/orders/OrderDetailPage'), 'OrderDetailPage');
const DeliveriesPage = page(() => import('@/features/delivery/DeliveriesPage'), 'DeliveriesPage');
const ProductsPage = page(() => import('@/features/products/ProductsPage'), 'ProductsPage');
const CatalogImportPage = page(() => import('@/features/products/CatalogImportPage'), 'CatalogImportPage');
const ProductFormPage = page(() => import('@/features/products/ProductFormPage'), 'ProductFormPage');
const InventoryPage = page(() => import('@/features/inventory/InventoryPage'), 'InventoryPage');
const MovementsPage = page(() => import('@/features/inventory/MovementsPage'), 'MovementsPage');
const LowStockPage = page(() => import('@/features/inventory/LowStockPage'), 'LowStockPage');
const ScannerPage = page(() => import('@/features/scanner/ScannerPage'), 'ScannerPage');
const PosPage = page(() => import('@/features/pos/PosPage'), 'PosPage');
const PosSalesPage = page(() => import('@/features/pos/PosSalesPage'), 'PosSalesPage');
const PosSaleDetailPage = page(() => import('@/features/pos/PosSaleDetailPage'), 'PosSaleDetailPage');
const CustomersPage = page(() => import('@/features/customers/CustomersPage'), 'CustomersPage');
const ChatPage = page(() => import('@/features/chat/ChatPage'), 'ChatPage');
const ServicesPage = page(() => import('@/features/services/ServicesPage'), 'ServicesPage');
const ServiceFormPage = page(() => import('@/features/services/ServiceFormPage'), 'ServiceFormPage');
const BookingsPage = page(() => import('@/features/bookings/BookingsPage'), 'BookingsPage');
const BookingDetailPage = page(() => import('@/features/bookings/BookingDetailPage'), 'BookingDetailPage');
const EmployeesPage = page(() => import('@/features/employees/EmployeesPage'), 'EmployeesPage');
const AvailabilityPage = page(() => import('@/features/employees/AvailabilityPage'), 'AvailabilityPage');
const WalletPage = page(() => import('@/features/wallet/WalletPage'), 'WalletPage');
const TransactionsPage = page(() => import('@/features/wallet/TransactionsPage'), 'TransactionsPage');
const WithdrawalsPage = page(() => import('@/features/withdrawals/WithdrawalsPage'), 'WithdrawalsPage');
const WithdrawalDetailPage = page(() => import('@/features/withdrawals/WithdrawalDetailPage'), 'WithdrawalDetailPage');
const BankAccountsPage = page(() => import('@/features/bank-accounts/BankAccountsPage'), 'BankAccountsPage');
const QrPage = page(() => import('@/features/profile/QrPage'), 'QrPage');
const QrPrintPage = page(() => import('@/features/profile/QrPrintPage'), 'QrPrintPage');
const ProfilePage = page(() => import('@/features/profile/ProfilePage'), 'ProfilePage');
const DocumentsPage = page(() => import('@/features/profile/DocumentsPage'), 'DocumentsPage');
const SettingsPage = page(() => import('@/features/profile/SettingsPage'), 'SettingsPage');
const NotificationsPage = page(() => import('@/features/notifications/NotificationsPage'), 'NotificationsPage');
const ReportsPage = page(() => import('@/features/reports/ReportsPage'), 'ReportsPage');

const gated = (capability: Capability, element: ReactNode) => <RequireCapability capability={capability}>{element}</RequireCapability>;
const publicPage = (element: ReactNode) => <Suspense fallback={<FullPageSpinner />}>{element}</Suspense>;

export const routes: RouteObject[] = [
  { path: '/login', element: publicPage(<RedirectIfAuthenticated><LoginPage /></RedirectIfAuthenticated>) },
  { path: '/verify-otp', element: publicPage(<RedirectIfAuthenticated><VerifyOtpPage /></RedirectIfAuthenticated>) },
  { path: '/onboarding', element: publicPage(<OnboardingPage />) },
  { path: '/onboarding/status', element: publicPage(<ApplicationStatusPage />) },
  // Full-page printable documents (no app shell).
  { path: '/orders/:id/invoice', element: publicPage(<RequireAuth>{gated('orders', <InvoicePage />)}</RequireAuth>) },
  { path: '/profile/qr/print', element: publicPage(<RequireAuth><QrPrintPage /></RequireAuth>) },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },

      { path: 'orders', element: gated('orders', <OrdersPage />) },
      { path: 'orders/:id', element: gated('orders', <OrderDetailPage />) },
      { path: 'deliveries', element: gated('delivery', <DeliveriesPage />) },

      { path: 'products', element: gated('products', <ProductsPage />) },
      { path: 'products/new', element: gated('products', <ProductFormPage />) },
      { path: 'products/catalog', element: gated('products', <CatalogImportPage />) },
      { path: 'products/:id', element: gated('products', <ProductFormPage />) },
      { path: 'inventory', element: gated('inventory', <InventoryPage />) },
      { path: 'inventory/movements', element: gated('inventory', <MovementsPage />) },
      { path: 'inventory/low-stock', element: gated('inventory', <LowStockPage />) },
      { path: 'scanner', element: gated('scanner', <ScannerPage />) },
      { path: 'pos', element: gated('pos', <PosPage />) },
      { path: 'pos/sales', element: gated('pos', <PosSalesPage />) },
      { path: 'pos/sales/:id', element: gated('pos', <PosSaleDetailPage />) },

      { path: 'services', element: gated('services', <ServicesPage />) },
      { path: 'services/new', element: gated('services', <ServiceFormPage />) },
      { path: 'services/:id', element: gated('services', <ServiceFormPage />) },
      { path: 'bookings', element: gated('bookings', <BookingsPage />) },
      { path: 'bookings/:id', element: gated('bookings', <BookingDetailPage />) },
      { path: 'employees', element: gated('employees', <EmployeesPage />) },
      { path: 'availability', element: gated('availability', <AvailabilityPage />) },

      { path: 'customers', element: gated('customers', <CustomersPage />) },
      { path: 'chat', element: gated('chat', <ChatPage />) },
      { path: 'chat/:conversationId', element: gated('chat', <ChatPage />) },

      { path: 'wallet', element: gated('wallet', <WalletPage />) },
      { path: 'wallet/transactions', element: gated('wallet', <TransactionsPage />) },
      { path: 'wallet/withdrawals', element: gated('wallet', <WithdrawalsPage />) },
      { path: 'wallet/withdrawals/:id', element: gated('wallet', <WithdrawalDetailPage />) },
      { path: 'bank-accounts', element: gated('wallet', <BankAccountsPage />) },

      { path: 'profile', element: <ProfilePage /> },
      { path: 'profile/business', element: <ProfilePage /> },
      { path: 'profile/documents', element: <DocumentsPage /> },
      { path: 'profile/qr', element: <QrPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'reports', element: gated('reports', <ReportsPage />) },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
];

export function createAppRouter() {
  return createBrowserRouter(routes);
}
