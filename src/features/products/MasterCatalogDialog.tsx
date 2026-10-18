import { useState } from 'react';
import { Button, Checkbox, Dialog, Badge, Spinner } from '@/components/ui';
import { SearchInput } from '@/components/forms/SearchInput';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Pagination } from '@/components/tables/Pagination';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/useToast';
import { formatCurrency } from '@/utils/format';
import { useBulkAddFromMasterMutation, useListMasterCatalogQuery } from './api';

export function MasterCatalogDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const q = useDebounce(search.trim());
  const { data, isFetching, error, refetch } = useListMasterCatalogQuery({ search: q, page }, { skip: !open });
  const [bulkAdd, { isLoading }] = useBulkAddFromMasterMutation();

  const submit = async () => {
    try {
      const res = await bulkAdd([...selected]).unwrap();
      toast.success(`${res.created_count} product(s) added`, res.skipped_count ? `${res.skipped_count} already in your shop` : 'Set stock from Inventory before selling.');
      setSelected(new Set());
      onClose();
    } catch (err) {
      toast.error('Could not add products', err);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="Add from TheNearByShop catalogue"
      description="Products are created with zero stock and catalogue prices; adjust them afterwards."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={selected.size === 0} loading={isLoading}>
            Add {selected.size || ''} product(s)
          </Button>
        </>
      }
    >
      <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search catalogue by name, SKU or brand" className="w-full" />
      <div className="mt-3 min-h-[200px]">
        {error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : isFetching && !data ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : !data || data.results.length === 0 ? (
          <EmptyState title="No catalogue products found" />
        ) : (
          <ul className="divide-y divide-line rounded-md border border-line">
            {data.results.map((m) => (
              <li key={m.id}>
                <label className={`flex items-center gap-3 px-3 py-2.5 ${m.already_added ? 'opacity-60' : 'cursor-pointer hover:bg-ink/[0.03]'}`}>
                  <Checkbox
                    disabled={m.already_added}
                    checked={selected.has(m.id)}
                    onChange={(e) => {
                      const next = new Set(selected);
                      if (e.target.checked) next.add(m.id);
                      else next.delete(m.id);
                      setSelected(next);
                    }}
                    aria-label={`Select ${m.name}`}
                  />
                  {m.image && <img src={m.image} alt="" className="h-9 w-9 rounded object-cover" loading="lazy" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.name}</p>
                    <p className="text-xs text-ink-subtle">
                      {[m.brand_name, m.category_name, m.unit_name].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <span className="text-sm tabular">{formatCurrency(m.selling_price)}</span>
                  {m.already_added && <Badge tone="neutral">Added</Badge>}
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
      {data && <Pagination page={page} count={data.count} hasNext={Boolean(data.next)} onPageChange={setPage} />}
    </Dialog>
  );
}
