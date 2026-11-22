import { useMemo, useState } from 'react';
import { Package, Sparkles, Wrench } from 'lucide-react';
import { Badge, Button, Card, CardBody, CardHeader, Dialog, Input, Skeleton } from '@/components/ui';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useAppDispatch } from '@/hooks/store';
import { useToast } from '@/hooks/useToast';
import { businessTypeChanged } from '@/features/auth/authSlice';
import { formatCurrency } from '@/utils/format';
import type { CategorySubscription, ShopCategoryOption } from '@/types/api';
import { useGetShopCategoriesQuery, useUpdateShopCategoriesMutation } from './api';

export const BUSINESS_TYPE_LABEL = { product: 'Products', service: 'Services', hybrid: 'Products and services' } as const;

const PER_DAY: Record<CategorySubscription['frequency'], number> = { daily: 1, weekly: 1 / 7, monthly: 1 / 30 };

export function planLabel(plan: CategorySubscription | null): string {
  if (!plan) return 'No subscription';
  return `${formatCurrency(plan.cost)} / ${plan.frequency === 'daily' ? 'day' : plan.frequency === 'weekly' ? 'week' : 'month'}`;
}

/** Same rule as the server: product-only, service-only, or a mix of both (hybrid). */
export function businessTypeFor(categories: Pick<ShopCategoryOption, 'category_type'>[]): 'product' | 'service' | 'hybrid' | null {
  const kinds = new Set(categories.map((c) => c.category_type));
  if (kinds.has('product') && kinds.has('service')) return 'hybrid';
  if (kinds.has('service')) return 'service';
  if (kinds.has('product')) return 'product';
  return null;
}

/** Roughly what the categories' subscription plans cost per 30 days. */
export function monthlyEstimate(categories: ShopCategoryOption[]): number {
  return categories.reduce((sum, c) => (c.subscription ? sum + Number(c.subscription.cost) * PER_DAY[c.subscription.frequency] * 30 : sum), 0);
}

function CategoryList({ rows }: { rows: ShopCategoryOption[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {rows.map((c) => (
        <Badge key={c.id} tone={c.category_type === 'service' ? 'info' : 'neutral'}>
          {c.category_type === 'service' ? <Wrench className="h-3 w-3" /> : <Package className="h-3 w-3" />}
          {c.name}
        </Badge>
      ))}
    </div>
  );
}

/** Business profile → Categories: a shop can be in several, mixing product and service categories. */
export function CategoriesCard() {
  const toast = useToast();
  const dispatch = useAppDispatch();
  const { data, isLoading, error, refetch } = useGetShopCategoriesQuery();
  const [save, saveState] = useUpdateShopCategoriesMutation();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');

  const available = useMemo(() => data?.available ?? [], [data]);
  const chosen = useMemo(() => available.filter((c) => picked.has(c.id)), [available, picked]);
  const nextType = businessTypeFor(chosen);
  const currentEstimate = Number(data?.subscription_monthly_estimate ?? 0);
  const nextEstimate = monthlyEstimate(chosen);
  const q = search.trim().toLowerCase();
  const visible = available.filter((c) => !q || c.name.toLowerCase().includes(q) || (c.parent ?? '').toLowerCase().includes(q));

  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (isLoading || !data) return <Skeleton className="h-40 w-full" />;

  const begin = () => {
    setPicked(new Set(data.selected.map((c) => c.id)));
    setSearch('');
    setOpen(true);
  };

  const toggle = (id: number) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < data.max_categories) next.add(id);
      return next;
    });

  const submit = async () => {
    try {
      const res = await save([...picked]).unwrap();
      dispatch(businessTypeChanged(res.business_type));
      toast.success('Categories saved', `Your shop now offers: ${BUSINESS_TYPE_LABEL[res.business_type].toLowerCase()}.`);
      setOpen(false);
    } catch (err) {
      toast.error('Could not save categories', err);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Categories"
        description="Choose every category you sell or serve in. Mixing product and service categories lets you sell products and take bookings."
        actions={
          <Button size="sm" variant="outline" onClick={begin}>
            Change categories
          </Button>
        }
      />
      <CardBody className="space-y-3 text-sm">
        <p className="flex flex-wrap items-center gap-2">
          <span className="text-ink-muted">Your shop offers</span>
          <Badge tone="success">
            {data.business_type === 'hybrid' && <Sparkles className="h-3 w-3" />}
            {BUSINESS_TYPE_LABEL[data.business_type]}
          </Badge>
        </p>
        {data.selected.length ? <CategoryList rows={data.selected} /> : <p className="text-ink-muted">No categories yet.</p>}
        <p className="text-xs text-ink-muted">
          Category subscriptions: about <span className="font-medium text-ink">{formatCurrency(currentEstimate)}</span> per month, charged from your wallet.
        </p>
      </CardBody>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="lg"
        title="Choose your categories"
        description={`Up to ${data.max_categories}. Some categories have a subscription, charged from your wallet.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button loading={saveState.isLoading} disabled={picked.size === 0} onClick={submit}>
              Save {picked.size} categor{picked.size === 1 ? 'y' : 'ies'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input aria-label="Search categories" placeholder="Search categories" value={search} onChange={(e) => setSearch(e.target.value)} />
          {(['product', 'service'] as const).map((kind) => {
            const rows = visible.filter((c) => c.category_type === kind);
            if (!rows.length) return null;
            return (
              <fieldset key={kind}>
                <legend className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  {kind === 'product' ? <Package className="h-4 w-4" /> : <Wrench className="h-4 w-4" />}
                  {kind === 'product' ? 'Product categories' : 'Service categories'}
                </legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {rows.map((c) => (
                    <label key={c.id} className="flex cursor-pointer items-start gap-2 rounded-md border border-line p-2 text-sm hover:bg-ink/[0.03]">
                      <input type="checkbox" className="mt-0.5" checked={picked.has(c.id)} onChange={() => toggle(c.id)} />
                      <span>
                        <span className="block font-medium">{c.name}</span>
                        <span className="text-xs text-ink-muted">
                          {c.parent ? `${c.parent} · ` : ''}
                          {planLabel(c.subscription)}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            );
          })}
          <div className="rounded-md bg-ink/[0.03] p-3 text-sm" role="status">
            <p>
              Your shop will offer: <span className="font-semibold">{nextType ? BUSINESS_TYPE_LABEL[nextType] : '—'}</span>
              {nextType && nextType !== data.business_type && <span className="text-ink-muted"> (now {BUSINESS_TYPE_LABEL[data.business_type].toLowerCase()})</span>}
            </p>
            <p className="text-xs text-ink-muted">
              Subscriptions: about {formatCurrency(nextEstimate)} per month
              {Math.abs(nextEstimate - currentEstimate) >= 0.01 && ` (${nextEstimate > currentEstimate ? '+' : '−'}${formatCurrency(Math.abs(nextEstimate - currentEstimate))})`}
            </p>
          </div>
        </div>
      </Dialog>
    </Card>
  );
}
