import { useMemo } from 'react';
import { capabilitiesFor, type Capability } from '@/features/auth/capabilities';
import { useAppSelector } from './store';

export function useCapabilities() {
  const businessType = useAppSelector((s) => s.auth.business?.businessType ?? null);
  return useMemo(() => {
    const caps = capabilitiesFor(businessType);
    return { businessType, caps, can: (c: Capability) => caps.has(c) };
  }, [businessType]);
}
