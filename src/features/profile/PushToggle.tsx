import { useEffect } from 'react';
import { BellRing } from 'lucide-react';
import { Badge, Button } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import { disablePush, enablePush, refreshPushStatus, usePushStatus } from '@/services/push/fcm';

const COPY: Record<string, { label: string; tone?: 'success' | 'warning'; help: string }> = {
  on: { label: 'On', tone: 'success', help: 'This device gets a notification for every new order and booking, even when the portal is closed.' },
  off: { label: 'Off', help: 'Turn on to get new orders and bookings on this device even when the portal is closed.' },
  working: { label: 'Turning on…', help: 'Allow notifications when the browser asks.' },
  denied: {
    label: 'Blocked',
    tone: 'warning',
    help: 'Notifications are blocked for this site. Allow them in the browser’s site settings (the lock icon in the address bar), then turn this on.',
  },
  unsupported: {
    label: 'Not available',
    help: 'This browser can’t receive push notifications. Use Chrome, Edge or Firefox; on iPhone, add the portal to the Home Screen first (iOS 16.4+).',
  },
  unconfigured: { label: 'Not set up', help: 'Push notifications are not configured for this deployment yet.' },
};

/** Settings → Notifications: push for this device (Firebase Cloud Messaging). */
export function PushToggle() {
  const toast = useToast();
  const status = usePushStatus();
  useEffect(() => {
    void refreshPushStatus();
  }, []);
  const copy = COPY[status] ?? COPY.off;
  const canToggle = status === 'on' || status === 'off' || status === 'working';

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 text-sm">
      <div className="flex gap-3">
        <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-ink-muted" />
        <div>
          <p className="flex items-center gap-2 font-medium">
            Push notifications on this device <Badge tone={copy.tone}>{copy.label}</Badge>
          </p>
          <p className="text-xs text-ink-muted">{copy.help}</p>
        </div>
      </div>
      {canToggle && (
        <Button
          size="sm"
          variant={status === 'on' ? 'outline' : 'primary'}
          loading={status === 'working'}
          onClick={async () => {
            try {
              if (status === 'on') {
                await disablePush();
                toast.success('Push notifications turned off for this device');
              } else {
                const next = await enablePush();
                if (next === 'on') toast.success('Push notifications are on', 'New orders and bookings will notify this device.');
              }
            } catch (err) {
              toast.error('Could not turn on push notifications', err);
            }
          }}
        >
          {status === 'on' ? 'Turn off' : 'Turn on'}
        </Button>
      )}
    </div>
  );
}
