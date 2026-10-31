import { useMemo } from 'react';
import { capabilitiesFor, type Capability } from '@/features/auth/capabilities';
import { useAppSelector } from './store';

export function useCapabilities() {
  const businessType = useAppSelector((s) => s.auth.business?.businessType ?? null);
  const isPrintShop = useAppSelector((s) => Boolean(s.auth.business?.isPrintShop));
  return useMemo(() => {
    const caps = capabilitiesFor(businessType);
    if (businessType && isPrintShop) caps.add('printing');
    return { businessType, caps, can: (c: Capability) => caps.has(c) };
  }, [businessType, isPrintShop]);
}
