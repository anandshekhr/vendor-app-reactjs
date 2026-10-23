import { useMemo, useState } from 'react';
import { Check, ImageOff, Library, Store, Trash2 } from 'lucide-react';
import { Badge, Button, Card, CardHeader, Checkbox, Input } from '@/components/ui';
import { Pagination } from '@/components/tables/Pagination';
import { SearchInput } from '@/components/forms/SearchInput';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { SkeletonRows } from '@/components/ui';
import { useDebounce } from '@/hooks/useDebounce';
import { formatCurrency } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { StarterCatalogItem } from '@/types/api';
import { draftFor, validateDraft } from '@/features/products/catalogSelection';
import { useListStarterCatalogQuery } from './api';
import { starterSelectionProblems, type StarterDraft } from './starterProducts';

interface Props {
  min: number;
  /** The applicant's categories; the catalogue starts filtered to them. */
  categoryIds?: number[];
  initial?: StarterDraft[];
  saving?: boolean;
  saveLabel?: string;
  error?: string;
  onSave: (drafts: StarterDraft[]) => void;
  onCancel?: () => void;
}

/** Lets a new vendor pick the products they will sell first, with their own price and opening stock. */
export function StarterProductPicker({ min, categoryIds = [], initial = [], saving, saveLabel = 'Save starter products', error, onSave, onCancel }: Props) {
  const [search, setSearch] = useState('');
  const [onlyMine, setOnlyMine] = useState(categoryIds.length > 0);
  const [page, setPage] = useState(1);
  const q = useDebounce(search.trim());
  const catalogue = useListStarterCatalogQuery({ search: q, categories: onlyMine ? categoryIds : undefined, page });
  const [selected, setSelected] = useState<Map<number, StarterDraft>>(() => new Map(initial.map((d) => [d.item.id, d])));
  const [showProblems, setShowProblems] = useState(false);

  const drafts = useMemo(() => [...selected.values()], [selected]);
  const problems = starterSelectionProblems(drafts, min);
  const remaining = Math.max(0, min - drafts.length);

  const toggle = (item: StarterCatalogItem, on: boolean) => {
    const next = new Map(selected);
    if (on) next.set(item.id, next.get(item.id) ?? draftFor(item));
    else next.delete(item.id);
    setSelected(next);
  };
  const update = (id: number, patch: Partial<Pick<StarterDraft, 'price' | 'stock'>>) => {
    const d = selected.get(id);
    if (d) setSelected(new Map(selected).set(id, { ...d, ...patch }));
  };

  const save = () => {
    setShowProblems(true);
    if (problems.length === 0) onSave(drafts);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <Card>
        <div className="flex flex-col gap-2 border-b border-line p-3 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search products or brands"
            label="Search catalogue"
            className="w-full sm:flex-1"
          />
          {categoryIds.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-ink-muted">
              <Checkbox
                checked={onlyMine}
                onChange={(e) => {
                  setOnlyMine(e.target.checked);
                  setPage(1);
                }}
              />
              Only my categories
            </label>
          )}
        </div>
        {catalogue.error ? (
          <ErrorState error={catalogue.error} onRetry={catalogue.refetch} title="Could not load the catalogue" />
        ) : catalogue.isLoading ? (
          <SkeletonRows rows={6} cols={3} />
        ) : !catalogue.data || catalogue.data.results.length === 0 ? (
          <EmptyState
            icon={<Library className="h-5 w-5" />}
            title="No products found"
            description={onlyMine ? 'Try another search, or untick “Only my categories”.' : 'Try another search.'}
          />
        ) : (
          <ul className={cn('divide-y divide-line', catalogue.isFetching && 'opacity-60')} aria-label="Catalogue products">
            {catalogue.data.results.map((m) => {
              const d = selected.get(m.id);
              const errs = d ? validateDraft(d) : {};
              return (
                <li key={m.id} className={cn('flex flex-wrap items-center gap-3 px-3 py-2.5', d && 'bg-brand-50/40 dark:bg-brand-900/10')}>
                  <Checkbox aria-label={`Select ${m.name}`} checked={Boolean(d)} onChange={(e) => toggle(m, e.target.checked)} />
                  {m.image ? (
                    <img src={m.image} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded-md border border-line object-cover" />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-ink/5 text-ink-subtle">
                      <ImageOff className="h-4 w-4" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{m.name}</p>
                    <p className="text-xs text-ink-subtle">
                      {[m.brand_name, m.unit_name, m.category_name].filter(Boolean).join(' · ')}
                      {m.max_retail_price != null && <> · MRP {formatCurrency(m.max_retail_price)}</>}
                    </p>
                  </div>
                  {d && (
                    <div className="flex w-full gap-2 pl-7 sm:w-auto sm:pl-0">
                      <div>
                        <span className="mb-0.5 block text-[11px] font-medium text-ink-subtle" aria-hidden>
                          Price ₹
                        </span>
                        <Input
                          aria-label={`Selling price for ${m.name}`}
                          aria-invalid={errs.price ? true : undefined}
                          inputMode="decimal"
                          className="h-8 w-24 text-right"
                          value={d.price}
                          onChange={(e) => update(m.id, { price: e.target.value })}
                        />
                        {errs.price && <p className="mt-0.5 text-xs text-red-600">{errs.price}</p>}
                      </div>
                      <div>
                        <span className="mb-0.5 block text-[11px] font-medium text-ink-subtle" aria-hidden>
                          Stock
                        </span>
                        <Input
                          aria-label={`Opening stock for ${m.name}`}
                          aria-invalid={errs.stock ? true : undefined}
                          inputMode="numeric"
                          className="h-8 w-20 text-right"
                          value={d.stock}
                          onChange={(e) => update(m.id, { stock: e.target.value.replace(/[^\d]/g, '') })}
                        />
                        {errs.stock && <p className="mt-0.5 text-xs text-red-600">{errs.stock}</p>}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {catalogue.data && <Pagination page={page} count={catalogue.data.count} pageSize={24} hasNext={Boolean(catalogue.data.next)} onPageChange={setPage} />}
      </Card>

      <Card className="h-fit lg:sticky lg:top-4">
        <CardHeader
          title={`Selected ${drafts.length} of at least ${min}`}
          description="Set the price you will sell at (not above MRP) and how many you have in stock."
        />
        <div className="px-4 pb-3">
          <div className="h-2 overflow-hidden rounded-full bg-ink/10" role="progressbar" aria-valuemin={0} aria-valuemax={min} aria-valuenow={Math.min(drafts.length, min)} aria-label="Starter products selected">
            <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${Math.min(100, (drafts.length / min) * 100)}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-ink-muted">
            {remaining > 0 ? (
              `${remaining} more to go`
            ) : (
              <Badge tone="success">
                <Check className="h-3 w-3" /> Minimum reached
              </Badge>
            )}
          </p>
        </div>
        {drafts.length === 0 ? (
          <EmptyState icon={<Store className="h-5 w-5" />} title="Nothing selected yet" description="Tick products on the left." />
        ) : (
          <ul className="max-h-[40vh] divide-y divide-line overflow-y-auto border-t border-line" aria-label="Selected products">
            {drafts.map((d) => (
              <li key={d.item.id} className="flex items-center gap-2 px-4 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{d.item.name}</p>
                  <p className={cn('text-xs', Object.keys(validateDraft(d)).length ? 'text-red-600' : 'text-ink-subtle')}>
                    {formatCurrency(d.price)} · stock {d.stock || '?'}
                  </p>
                </div>
                <button type="button" onClick={() => toggle(d.item, false)} className="text-ink-subtle hover:text-red-600" aria-label={`Remove ${d.item.name}`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="space-y-2 border-t border-line p-4">
          {showProblems &&
            problems.map((p) => (
              <p key={p} className="text-xs text-red-600" role="alert">
                {p}
              </p>
            ))}
          {error && (
            <p className="rounded-md bg-red-50 p-2 text-xs text-red-700 dark:bg-red-900/20" role="alert">
              {error}
            </p>
          )}
          <Button className="w-full" loading={saving} onClick={save}>
            {saveLabel}
          </Button>
          {onCancel && (
            <Button variant="ghost" size="sm" className="w-full" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <p className="text-xs text-ink-subtle">Nothing goes on sale until the TheNearByShop team approves your application.</p>
        </div>
      </Card>
    </div>
  );
}
