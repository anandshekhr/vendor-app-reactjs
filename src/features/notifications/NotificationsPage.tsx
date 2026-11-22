import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Bell, CalendarClock, CheckCheck, ClipboardList, CloudOff, MessageSquare, Receipt, ShieldCheck, Trash2, Wallet } from 'lucide-react';
import { Button, Card, CardHeader, Tabs } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Pagination } from '@/components/tables/Pagination';
import { useAppDispatch, useAppSelector } from '@/hooks/store';
import { useToast } from '@/hooks/useToast';
import { formatRelative } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { ServerNotificationType } from '@/types/api';
import { useListServerNotificationsQuery, useMarkAllNotificationsReadMutation, useMarkNotificationReadMutation } from './api';
import { clearNotifications, DEVICE_ONLY, markAllRead, markRead, type NotificationCategory } from './notificationsSlice';

const SERVER_ICONS: Record<ServerNotificationType, typeof Bell> = {
  new_order: ClipboardList,
  new_booking: CalendarClock,
  billing: Receipt,
  withdrawal: Wallet,
  stock: AlertTriangle,
  account: ShieldCheck,
};

const DEVICE_ICONS: Record<NotificationCategory, typeof Bell> = {
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


function Row({ icon: Icon, title, body, at, unread, onClick }: { icon: typeof Bell; title: string; body?: string; at: string | number; unread: boolean; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn('flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-ink/[0.03]', unread && 'bg-brand-50/40 dark:bg-brand-900/10')}
      >
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink/5 text-ink-muted">
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className={cn('text-sm', unread && 'font-semibold')}>{title}</span>
            <span className="shrink-0 text-xs text-ink-subtle">{formatRelative(at)}</span>
          </span>
          {body && <span className="block text-sm text-ink-muted">{body}</span>}
        </span>
        {unread && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-label="Unread" />}
      </button>
    </li>
  );
}

export function NotificationsPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useListServerNotificationsQuery({ page, unread: tab === 'unread' });
  const [markOne] = useMarkNotificationReadMutation();
  const [markAll, markAllState] = useMarkAllNotificationsReadMutation();
  const device = useAppSelector((s) => s.notifications.items).filter((n) => DEVICE_ONLY.includes(n.category));
  const deviceUnread = device.filter((n) => !n.read).length;
  const unread = (data?.unread_count ?? 0) + deviceUnread;

  return (
    <>
      <PageHeader
        title="Notifications"
        description={unread ? `${unread} unread` : 'You are all caught up.'}
        actions={
          <Button
            variant="outline"
            leftIcon={<CheckCheck className="h-4 w-4" />}
            disabled={!unread}
            loading={markAllState.isLoading}
            onClick={async () => {
              dispatch(markAllRead());
              try {
                if (data?.unread_count) await markAll().unwrap();
              } catch (err) {
                toast.error('Could not mark notifications read', err);
              }
            }}
          >
            Mark all read
          </Button>
        }
      />
      <Card>
        <CardHeader
          title="Your notifications"
          actions={
            <Tabs
              label="Filter notifications"
              value={tab}
              onChange={(v) => {
                setTab(v);
                setPage(1);
              }}
              items={[
                { value: 'all', label: 'All' },
                { value: 'unread', label: `Unread${data?.unread_count ? ` (${data.unread_count})` : ''}` },
              ]}
            />
          }
        />
        {error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : isLoading ? null : !data?.results.length ? (
          <EmptyState icon={<Bell className="h-5 w-5" />} title={tab === 'unread' ? 'No unread notifications' : 'No notifications yet'} description="New orders, bookings, payouts and billing notices appear here." />
        ) : (
          <ul className="divide-y divide-line">
            {data.results.map((n) => (
              <Row
                key={n.id}
                icon={SERVER_ICONS[n.type] ?? Bell}
                title={n.title}
                body={n.body}
                at={n.created_at}
                unread={!n.is_read}
                onClick={() => {
                  if (!n.is_read) void markOne(n.id);
                  if (n.link) navigate(n.link);
                }}
              />
            ))}
          </ul>
        )}
        {data && data.count > 20 && <Pagination page={page} count={data.count} hasNext={Boolean(data.next)} onPageChange={setPage} />}
      </Card>

      {device.length > 0 && (
        <Card className="mt-5">
          <CardHeader
            title="On this device"
            description="Offline-sale sync results and alerts this browser noticed."
            actions={
              <Button size="sm" variant="ghost" leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => dispatch(clearNotifications())}>
                Clear
              </Button>
            }
          />
          <ul className="divide-y divide-line">
            {device.map((n) => (
              <Row
                key={n.id}
                icon={DEVICE_ICONS[n.category] ?? Bell}
                title={n.title}
                body={n.body}
                at={n.createdAt}
                unread={!n.read}
                onClick={() => {
                  dispatch(markRead(n.id));
                  if (n.link) navigate(n.link);
                }}
              />
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
