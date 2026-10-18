import { Check, Store, XCircle } from 'lucide-react';
import type { VendorOrderStatus } from '@/types/api';
import { cn } from '@/utils/cn';
import { DELIVERY_STEPS, deliveryStage } from './state';

export function DeliveryProgress({ status, source }: { status: VendorOrderStatus; source?: 'online' | 'pos' }) {
  const info = deliveryStage(status, source);
  if (info.stage === 'in_store' || info.stage === 'cancelled') {
    const Icon = info.stage === 'in_store' ? Store : XCircle;
    return (
      <div className="flex items-center gap-3 text-sm">
        <Icon className="h-5 w-5 text-ink-subtle" aria-hidden />
        <div>
          <p className="font-medium">{info.label}</p>
          <p className="text-ink-muted">{info.description}</p>
        </div>
      </div>
    );
  }
  const current = DELIVERY_STEPS.findIndex((s) => s.stage === info.stage);
  return (
    <div>
      <ol className="flex items-center" aria-label="Delivery progress">
        {DELIVERY_STEPS.map((step, i) => {
          const done = i < current || info.stage === 'delivered';
          const active = i === current && info.stage !== 'delivered';
          return (
            <li key={step.stage} className="flex flex-1 items-center last:flex-none" aria-current={active ? 'step' : undefined}>
              <div className="flex flex-col items-center gap-1">
                <span
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-semibold',
                    done && 'border-emerald-600 bg-emerald-600 text-white',
                    active && 'border-brand-600 text-brand-700',
                    !done && !active && 'border-line text-ink-subtle',
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className={cn('whitespace-nowrap text-[11px]', active ? 'font-semibold text-ink' : 'text-ink-subtle')}>{step.label}</span>
              </div>
              {i < DELIVERY_STEPS.length - 1 && <span className={cn('mx-1 mb-5 h-0.5 flex-1', i < current ? 'bg-emerald-600' : 'bg-line')} aria-hidden />}
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-sm text-ink-muted">{info.description}</p>
    </div>
  );
}
