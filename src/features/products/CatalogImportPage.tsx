import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ImageOff, Library, PackagePlus, Trash2 } from 'lucide-react';
import { Badge, Button, Card, CardHeader, Checkbox, Input, Select } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { Pagination } from '@/components/tables/Pagination';
import { SearchInput } from '@/components/forms/SearchInput';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { SkeletonRows } from '@/components/ui';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/useToast';
import { formatCurrency } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { MasterCatalogItem } from '@/types/api';
import { useBulkAddFromMasterMutation, useGetCategoriesQuery, useListMasterCatalogQuery } from './api';
import { draftFor, ignoredOverrides, toBulkItems, validateDraft, type CatalogDraft } from './catalogSelection';

/** Browse TheNearByShop's master catalogue and add products to the shop with your own price and opening stock. */
export function CatalogImportPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<number | ''>('');
  const [page, setPage] = useState(1);
  const q = useDebounce(search.trim());
  const categories = useGetCategoriesQuery();
  const { data, isLoading, isFetching, error, refetch } = useListMasterCatalogQuery({ search: q, category, page });
  const [bulkAdd, { isLoading: adding }] = useBulkAddFromMasterMutation();
  // Selection survives paging and searching, keyed by master product id.
  const [selected, setSelected] = useState<Map<number, CatalogDraft>>(new Map());

  const drafts = useMemo(() => [...selected.values()], [selected]);
  const invalid = drafts.filter((d) => Object.keys(validateDraft(d)).length > 0);

  const toggle = (item: MasterCatalogItem, on: boolean) => {
    const next = new Map(selected);
    if (on) next.set(item.id, draftFor(item));
    else next.delete(item.id);
    setSelected(next);
  };

  const update = (id: number, patch: Partial<Pick<CatalogDraft, 'price' | 'stock'>>) => {
    const d = selected.get(id);
    if (!d) return;
    setSelected(new Map(selected).set(id, { ...d, ...patch }));
  };

  const selectablesOnPage = (data?.results ?? []).filter((m) => !m.already_added);
  const allOnPage = selectablesOnPage.length > 0 && selectablesOnPage.every((m) => selected.has(m.id));

  const submit = async () => {
    if (invalid.length) {
      toast.error('Fix the highlighted prices or stock first');
      return;
    }
    try {
      const res = await bulkAdd(toBulkItems(drafts)).unwrap();
      const ignored = ignoredOverrides(drafts, res.created ?? []);
      if (ignored.length) {
        toast.warning(
          `${res.created_count} added, but the server ignored your price/stock for ${ignored.length}`,
          'Your API server needs the vendor-portal update. Set prices and stock from the products and inventory pages.',
        );
      } else {
        toast.success(`${res.created_count} product(s) added to your shop`, res.skipped_count ? `${res.skipped_count} were already in your shop and were left unchanged.` : undefined);
      }
      setSelected(new Map());
      navigate('/products');
    } catch (err) {
      toast.error('Could not add products', err);
    }
  };

  return (
    <>
      <PageHeader
        backTo="/products"
        title="Add from master catalogue"
        description="Pick ready-made products from the TheNearByShop catalogue. Set your selling price and opening stock before adding."
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card>
          <div className="flex flex-col gap-2 border-b border-line p-3 sm:flex-row">
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Search name, SKU or brand"
              label="Search catalogue"
              className="w-full sm:flex-1"
            />
            <Select
              aria-label="Category"
              className="sm:w-56"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value ? Number(e.target.value) : '');
                setPage(1);
              }}
            >
              <option value="">All categories</option>
              {(categories.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parent_category_name ? `${c.parent_category_name} › ${c.name}` : c.name}
                </option>
              ))}
            </Select>
          </div>
          {error ? (
            <ErrorState error={error} onRetry={refetch} />
          ) : isLoading ? (
            <SkeletonRows rows={8} cols={4} />
          ) : !data || data.results.length === 0 ? (
            <EmptyState icon={<Library className="h-5 w-5" />} title="No catalogue products found" description="Try another search or category." />
          ) : (
            <div className={cn('overflow-x-auto', isFetching && 'opacity-60')}>
              <table className="min-w-full text-sm">
                <caption className="sr-only">Master catalogue</caption>
                <thead>
                  <tr className="border-b border-line bg-ink/[0.02] text-left text-xs uppercase tracking-wide text-ink-subtle">
                    <th className="w-10 px-3 py-2.5">
                      <Checkbox
                        aria-label="Select all on this page"
                        checked={allOnPage}
                        onChange={(e) => {
                          const next = new Map(selected);
                          selectablesOnPage.forEach((m) => (e.target.checked ? next.set(m.id, next.get(m.id) ?? draftFor(m)) : next.delete(m.id)));
                          setSelected(next);
                        }}
                      />
                    </th>
                    <th className="px-3 py-2.5 font-medium">Product</th>
                    <th className="hidden px-3 py-2.5 font-medium md:table-cell">Category</th>
                    <th className="px-3 py-2.5 text-right font-medium">MRP</th>
                    <th className="px-3 py-2.5 text-right font-medium">Your price</th>
                    <th className="px-3 py-2.5 text-right font-medium">Opening stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.results.map((m) => {
                    const d = selected.get(m.id);
                    const errs = d ? validateDraft(d) : {};
                    return (
                      <tr key={m.id} className={cn(d && 'bg-brand-50/40 dark:bg-brand-900/10', m.already_added && 'opacity-60')}>
                        <td className="px-3 py-2">
                          <Checkbox aria-label={`Select ${m.name}`} disabled={m.already_added} checked={Boolean(d)} onChange={(e) => toggle(m, e.target.checked)} />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-3">
                            {m.image ? (
                              <img src={m.image} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded-md border border-line object-cover" />
                            ) : (
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-ink/5 text-ink-subtle">
                                <ImageOff className="h-4 w-4" />
                              </span>
                            )}
                            <div className="min-w-0">
                              <p className="font-medium">{m.name}</p>
                              <p className="text-xs text-ink-subtle">{[m.brand_name, m.unit_name, m.barcode].filter(Boolean).join(' · ')}</p>
                              {m.already_added && (
                                <Badge tone="success" className="mt-0.5">
                                  <Check className="h-3 w-3" /> In your shop
                                </Badge>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="hidden px-3 py-2 md:table-cell">{m.category_name ?? '—'}</td>
                        <td className="px-3 py-2 text-right tabular">{formatCurrency(m.max_retail_price)}</td>
                        <td className="px-3 py-2 text-right">
                          {d ? (
                            <div>
                              <Input
                                aria-label={`Selling price for ${m.name}`}
                                aria-invalid={errs.price ? true : undefined}
                                inputMode="decimal"
                                className="ml-auto h-8 w-24 text-right"
                                value={d.price}
                                onChange={(e) => update(m.id, { price: e.target.value })}
                              />
                              {errs.price && <p className="mt-0.5 text-xs text-red-600">{errs.price}</p>}
                            </div>
                          ) : (
                            <span className="tabular text-ink-muted">{formatCurrency(m.selling_price)}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {d ? (
                            <div>
                              <Input
                                aria-label={`Opening stock for ${m.name}`}
                                aria-invalid={errs.stock ? true : undefined}
                                inputMode="numeric"
                                className="ml-auto h-8 w-20 text-right"
                                value={d.stock}
                                onChange={(e) => update(m.id, { stock: e.target.value.replace(/[^\d]/g, '') })}
                              />
                              {errs.stock && <p className="mt-0.5 text-xs text-red-600">{errs.stock}</p>}
                            </div>
                          ) : (
                            <span className="text-ink-subtle">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {data && <Pagination page={page} count={data.count} hasNext={Boolean(data.next)} onPageChange={setPage} />}
        </Card>

        <Card className="h-fit xl:sticky xl:top-4">
          <CardHeader title={`Selected (${drafts.length})`} description="Products already in your shop are skipped and never changed." />
          {drafts.length === 0 ? (
            <EmptyState icon={<PackagePlus className="h-5 w-5" />} title="Nothing selected" description="Tick products on the left to add them." />
          ) : (
            <ul className="max-h-[50vh] divide-y divide-line overflow-y-auto">
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
            {invalid.length > 0 && <p className="text-xs text-red-600">{invalid.length} item(s) need a valid price or stock.</p>}
            <Button className="w-full" disabled={drafts.length === 0} loading={adding} onClick={submit} leftIcon={<PackagePlus className="h-4 w-4" />}>
              Add {drafts.length || ''} to my shop
            </Button>
            {drafts.length > 0 && (
              <Button variant="ghost" size="sm" className="w-full" onClick={() => setSelected(new Map())}>
                Clear selection
              </Button>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
