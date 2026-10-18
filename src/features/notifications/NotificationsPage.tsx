import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Bell, CalendarClock, CheckCheck, ClipboardList, CloudOff, MessageSquare, Trash2, Wallet, ShieldCheck } from 'lucide-react';
import { Button, Card, CardHeader } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/feedback/EmptyState';
import { BackendGap } from '@/components/feedback/BackendGap';
import { useAppDispatch, useAppSelector } from '@/hooks/store';
import { formatRelative } from '@/utils/format';
import { cn } from '@/utils/cn';
import { clearNotifications, markAllRead, markRead, type NotificationCategory } from './notificationsSlice';

const ICONS: Record<NotificationCategory, typeof Bell> = {
  new_order: ClipboardList,
  order_cancelled: ClipboardList,
  new_booking: CalendarClock,
  booking_cancelled: CalendarClock,
  low_stock: AlertTriangle,
  sync: CloudOff,
  withdrawal: Wallet,
  message: MessageSquare,
  verification: ShieldCheck,
};

export function NotificationsPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const items = useAppSelector((s) => s.notifications.items);
  const unread = items.filter((n) => !n.read).length;
  return (
    <>
      <PageHeader
        title="Notifications"
        description={unread ? `${unread} unread` : 'You are all caught up.'}
        actions={
          <>
            <Button variant="outline" leftIcon={<CheckCheck className="h-4 w-4" />} disabled={!unread} onClick={() => dispatch(markAllRead())}>
              Mark all read
            </Button>
            <Button variant="ghost" leftIcon={<Trash2 className="h-4 w-4" />} disabled={!items.length} onClick={() => dispatch(clearNotifications())}>
              Clear
            </Button>
          </>
        }
      />
      <BackendGap className="mb-5" gap="G-14" title="Alerts are generated on this device">
        New orders and bookings are detected by polling the server while the portal is open. Push notifications, server-side read state and alerts for
        settlements, withdrawals and verification are not available yet.
      </BackendGap>
      <Card>
        <CardHeader title="Recent" />
        {items.length === 0 ? (
          <EmptyState icon={<Bell className="h-5 w-5" />} title="No notifications" />
        ) : (
          <ul className="divide-y divide-line">
            {items.map((n) => {
              const Icon = ICONS[n.category] ?? Bell;
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      dispatch(markRead(n.id));
                      if (n.link) navigate(n.link);
                    }}
                    className={cn('flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-ink/[0.03]', !n.read && 'bg-brand-50/40 dark:bg-brand-900/10')}
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink/5 text-ink-muted">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className={cn('text-sm', !n.read && 'font-semibold')}>{n.title}</span>
                        <span className="shrink-0 text-xs text-ink-subtle">{formatRelative(n.createdAt)}</span>
                      </span>
                      {n.body && <span className="block text-sm text-ink-muted">{n.body}</span>}
                    </span>
                    {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-label="Unread" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
