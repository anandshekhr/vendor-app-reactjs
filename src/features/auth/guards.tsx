import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { FullPageSpinner } from '@/components/ui';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useAppSelector } from '@/hooks/store';
import { useCapabilities } from '@/hooks/useCapabilities';
import type { Capability } from './capabilities';

export function RequireAuth({ children }: { children: ReactNode }) {
  const status = useAppSelector((s) => s.auth.status);
  const location = useLocation();
  if (status === 'checking') return <FullPageSpinner label="Loading your business" />;
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <>{children}</>;
}

export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const status = useAppSelector((s) => s.auth.status);
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

/** UX-level gate only; the backend enforces authorisation on every request. */
export function RequireCapability({ capability, children }: { capability: Capability; children: ReactNode }) {
  const { can } = useCapabilities();
  if (!can(capability)) {
    return (
      <EmptyState
        icon={<ShieldOff className="h-5 w-5" />}
        title="Not available for your business type"
        description="This section is not part of your vendor plan or business type."
      />
    );
  }
  return <>{children}</>;
}
