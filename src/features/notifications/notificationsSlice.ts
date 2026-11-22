import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/**
 * Notifications noticed on this device (offline-sale sync results, low stock, and new orders/bookings from polling).
 * The server's notification centre (features/notifications/api.ts) is the main feed; new orders/bookings are taken
 * from it, so only DEVICE_ONLY categories from here are shown next to it.
 */
export type NotificationCategory =
  | 'new_order'
  | 'order_cancelled'
  | 'new_booking'
  | 'booking_cancelled'
  | 'low_stock'
  | 'sync'
  | 'withdrawal'
  | 'message'
  | 'verification';

/** Categories only this device knows about (shown next to the server feed). */
export const DEVICE_ONLY: NotificationCategory[] = ['sync', 'low_stock', 'message', 'verification', 'order_cancelled', 'booking_cancelled'];

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  body?: string;
  link?: string;
  createdAt: number;
  read: boolean;
}

interface NotificationsState {
  items: AppNotification[];
  lastOrderId: number | null;
  lastBookingId: number | null;
}

const KEY = 'tnbs.vendor.notifications';
const MAX_ITEMS = 200;

function load(): NotificationsState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as NotificationsState;
  } catch {
    /* ignore */
  }
  return { items: [], lastOrderId: null, lastBookingId: null };
}

export function persistNotifications(state: NotificationsState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

const slice = createSlice({
  name: 'notifications',
  initialState: load,
  reducers: {
    notificationsAdded(state, action: PayloadAction<Omit<AppNotification, 'read'>[]>) {
      const existing = new Set(state.items.map((n) => n.id));
      const fresh = action.payload.filter((n) => !existing.has(n.id)).map((n) => ({ ...n, read: false }));
      state.items = [...fresh, ...state.items].slice(0, MAX_ITEMS);
    },
    markRead(state, action: PayloadAction<string>) {
      const n = state.items.find((i) => i.id === action.payload);
      if (n) n.read = true;
    },
    markCategoryRead(state, action: PayloadAction<NotificationCategory[]>) {
      state.items.forEach((n) => {
        if (action.payload.includes(n.category)) n.read = true;
      });
    },
    markAllRead(state) {
      state.items.forEach((n) => {
        n.read = true;
      });
    },
    clearNotifications(state) {
      state.items = [];
    },
    orderBaselineSet(state, action: PayloadAction<number>) {
      state.lastOrderId = Math.max(state.lastOrderId ?? 0, action.payload);
    },
    bookingBaselineSet(state, action: PayloadAction<number>) {
      state.lastBookingId = Math.max(state.lastBookingId ?? 0, action.payload);
    },
    resetNotifications() {
      return { items: [], lastOrderId: null, lastBookingId: null };
    },
  },
});

export const {
  notificationsAdded,
  markRead,
  markCategoryRead,
  markAllRead,
  clearNotifications,
  orderBaselineSet,
  bookingBaselineSet,
  resetNotifications,
} = slice.actions;
export default slice.reducer;
