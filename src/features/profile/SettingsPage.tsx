import { useState } from 'react';
import { Database, LogOut, Monitor, Moon, Sun } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, ConfirmDialog } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { BackendGap } from '@/components/feedback/BackendGap';
import { setTheme, type ThemePreference } from '@/app/uiSlice';
import { useAppDispatch, useAppSelector } from '@/hooks/store';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { useToast } from '@/hooks/useToast';
import { useLogout } from '@/features/auth/useLogout';
import { db, getMeta, META_CATALOGUE_SYNCED_AT } from '@/services/offline/db';
import { formatRelative, maskPhone } from '@/utils/format';
import { cn } from '@/utils/cn';

const THEMES: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export function SettingsPage() {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const logout = useLogout();
  const theme = useAppSelector((s) => s.ui.theme);
  const auth = useAppSelector((s) => s.auth);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const products = useLiveQuery(() => db.products.count(), [], 0);
  const unsynced = useLiveQuery(() => db.sales.where('status').anyOf('pending', 'syncing', 'unknown', 'conflict').count(), [], 0);
  const syncedAt = useLiveQuery(() => getMeta<number>(META_CATALOGUE_SYNCED_AT), [], undefined as number | undefined);

  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Appearance" />
          <CardBody className="flex gap-2">
            {THEMES.map((t) => (
              <button
                key={t.value}
                type="button"
                aria-pressed={theme === t.value}
                onClick={() => dispatch(setTheme(t.value))}
                className={cn('flex flex-1 flex-col items-center gap-1 rounded-md border p-3 text-sm', theme === t.value ? 'border-brand-600 bg-brand-50/50 text-brand-700 dark:bg-brand-900/20' : 'border-line')}
              >
                <t.icon className="h-5 w-5" /> {t.label}
              </button>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Account & security" />
          <CardBody className="space-y-3 text-sm">
            <p>
              Signed in as <span className="font-medium">+91 {maskPhone(auth.phone)}</span> with a one-time password. There is no password to manage.
            </p>
            <Button variant="outline" leftIcon={<LogOut className="h-4 w-4" />} onClick={() => setConfirmLogout(true)}>
              Sign out of this device
            </Button>
            <BackendGap gap="G-1" title="Signing out does not revoke tokens on the server yet" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Offline data on this device" />
          <CardBody className="space-y-3 text-sm">
            <p className="flex items-center gap-2">
              <Database className="h-4 w-4 text-ink-subtle" /> {products} products cached{syncedAt ? `, synced ${formatRelative(syncedAt)}` : ''}.
            </p>
            <p>{unsynced > 0 ? <span className="font-medium text-amber-700">{unsynced} offline sale(s) not yet synced.</span> : 'All offline sales are synced.'}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await db.products.clear();
                toast.info('Offline catalogue cleared', 'It will be rebuilt the next time you open the POS online.');
              }}
            >
              Clear cached catalogue
            </Button>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Notifications & language" />
          <CardBody className="space-y-2">
            <p className="text-sm text-ink-muted">In-app alerts for new orders and bookings are generated while the portal is open.</p>
            <BackendGap gap="G-14" title="Notification preferences, push notifications and language selection are not supported by the server yet" />
          </CardBody>
        </Card>
      </div>
      <ConfirmDialog
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        onConfirm={() => void logout()}
        title="Sign out?"
        description={unsynced > 0 ? `${unsynced} offline sale(s) are not synced. They stay on this device and will sync after you sign in again.` : 'You will need an OTP to sign in again.'}
        confirmLabel="Sign out"
      />
    </>
  );
}
