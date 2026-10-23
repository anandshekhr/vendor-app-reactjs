import {
  BarChart3,
  Bell,
  Boxes,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  Landmark,
  LayoutDashboard,
  MessageSquare,
  Package,
  ScanBarcode,
  Settings,
  ShoppingCart,
  Store,
  Truck,
  UserCog,
  Users,
  Wallet,
  Wrench,
  ArrowDownToLine,
  QrCode,
  type LucideIcon,
} from 'lucide-react';
import type { Capability } from '@/features/auth/capabilities';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  capability: Capability;
  badgeKey?: 'orders' | 'bookings' | 'chat' | 'notifications' | 'offlineSales';
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, capability: 'dashboard' }],
  },
  {
    label: 'Sell',
    items: [
      { label: 'Point of Sale', to: '/pos', icon: ShoppingCart, capability: 'pos', badgeKey: 'offlineSales' },
      { label: 'Orders', to: '/orders', icon: ClipboardList, capability: 'orders', badgeKey: 'orders' },
      { label: 'Deliveries', to: '/deliveries', icon: Truck, capability: 'delivery' },
    ],
  },
  {
    label: 'Catalogue',
    items: [
      { label: 'Products', to: '/products', icon: Package, capability: 'products' },
      { label: 'Inventory', to: '/inventory', icon: Boxes, capability: 'inventory' },
      { label: 'Scan stock', to: '/scanner', icon: ScanBarcode, capability: 'scanner' },
    ],
  },
  {
    label: 'Services',
    items: [
      { label: 'Bookings', to: '/bookings', icon: CalendarClock, capability: 'bookings', badgeKey: 'bookings' },
      { label: 'Services', to: '/services', icon: Wrench, capability: 'services' },
      { label: 'Employees', to: '/employees', icon: UserCog, capability: 'employees' },
      { label: 'Availability', to: '/availability', icon: CalendarDays, capability: 'availability' },
    ],
  },
  {
    label: 'Customers',
    items: [
      { label: 'Customers', to: '/customers', icon: Users, capability: 'customers' },
      { label: 'Messages', to: '/chat', icon: MessageSquare, capability: 'chat', badgeKey: 'chat' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Wallet', to: '/wallet', icon: Wallet, capability: 'wallet' },
      { label: 'Withdrawals', to: '/wallet/withdrawals', icon: ArrowDownToLine, capability: 'wallet' },
      { label: 'Bank accounts', to: '/bank-accounts', icon: Landmark, capability: 'wallet' },
      { label: 'Reports', to: '/reports', icon: BarChart3, capability: 'reports' },
    ],
  },
  {
    label: 'Business',
    items: [
      { label: 'Business profile', to: '/profile', icon: Store, capability: 'profile' },
      { label: 'Shop QR code', to: '/profile/qr', icon: QrCode, capability: 'profile' },
      { label: 'Notifications', to: '/notifications', icon: Bell, capability: 'notifications', badgeKey: 'notifications' },
      { label: 'Settings', to: '/settings', icon: Settings, capability: 'profile' },
    ],
  },
];

export function navGroupsFor(can: (c: Capability) => boolean): NavGroup[] {
  return NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => can(i.capability)) })).filter((g) => g.items.length > 0);
}
