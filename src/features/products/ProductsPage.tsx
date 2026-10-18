import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ImageOff, Library, Package, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { Badge, Button, Card, ConfirmDialog, Select } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, type SortState } from '@/components/tables/DataTable';
import { Pagination } from '@/components/tables/Pagination';
import { SearchInput } from '@/components/forms/SearchInput';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/useToast';
import { formatCurrency, formatNumber } from '@/utils/format';
import type { ProductListItem } from '@/types/api';
import { useBulkDeleteProductsMutation, useBulkUpdateProductsMutation, useListProductsQuery, type ProductListParams } from './api';
import { MasterCatalogDialog } from './MasterCatalogDialog';

function sortRows(rows: ProductListItem[], sort: SortState): ProductListItem[] {
  if (!sort) return rows;
  const dir = sort.direction === 'asc' ? 1 : -1;
  const val = (p: ProductListItem) => {
    switch (sort.key) {
      case 'name':
        return p.name.toLowerCase();
      case 'price':
        return Number(p.price);
      case 'stock':
        return p.stock;
      default:
        return 0;
    }
  };
  return [...rows].sort((a, b) => (val(a) > val(b) ? dir : val(a) < val(b) ? -dir : 0));
}

export function ProductsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const q = useDebounce(search.trim());
  const status = (params.get('status') ?? '') as ProductListParams['status'];
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>(null);
  const [selected, setSelected] = useState<Set<string | number>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const { data, isLoading, isFetching, error, refetch } = useListProductsQuery({ search: q, status, page });
  const [bulkUpdate, bulkUpdateState] = useBulkUpdateProductsMutation();
  const [bulkDelete, bulkDeleteState] = useBulkDeleteProductsMutation();
  const ids = [...selected].map(Number);

  const setActive = async (is_active: boolean) => {
    try {
      const res = await bulkUpdate({ product_ids: ids, updates: { is_active } }).unwrap();
      toast.success(`${res.updated_count} product(s) ${is_active ? 'activated' : 'deactivated'}`);
      setSelected(new Set());
    } catch (err) {
      toast.error('Bulk update failed', err);
    }
  };

  const remove = async () => {
    try {
      const res = await bulkDelete({ product_ids: ids }).unwrap();
      toast.success(`${res.deleted_count} product(s) deleted`);
      setSelected(new Set());
      setConfirmDelete(false);
    } catch (err) {
      toast.error('Delete failed', err);
    }
  };

  return (
    <>
      <PageHeader
        title="Products"
        description="Your shop catalogue. Stock changes are made from Inventory or the scanner."
        actions={
          <>
            <Button variant="outline" leftIcon={<Library className="h-4 w-4" />} onClick={() => setCatalogOpen(true)}>
              Add from catalogue
            </Button>
            <Link to="/products/new">
              <Button leftIcon={<Plus className="h-4 w-4" />}>Add product</Button>
            </Link>
          </>
        }
      />
      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row">
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Search name or SKU"
              label="Search products"
            />
            <Select
              aria-label="Filter by status"
              value={status}
              className="sm:w-44"
              onChange={(e) => {
                const next = new URLSearchParams(params);
                if (e.target.value) next.set('status', e.target.value);
                else next.delete('status');
                setParams(next);
                setPage(1);
              }}
            >
              <option value="">All products</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="low_stock">Low stock</option>
            </Select>
          </div>
          {selected.size > 0 && (
            <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Bulk actions">
              <span className="text-sm text-ink-muted">{selected.size} selected</span>
              <Button size="sm" variant="outline" leftIcon={<Eye className="h-3.5 w-3.5" />} onClick={() => setActive(true)} loading={bulkUpdateState.isLoading}>
                Activate
              </Button>
              <Button size="sm" variant="outline" leftIcon={<EyeOff className="h-3.5 w-3.5" />} onClick={() => setActive(false)} loading={bulkUpdateState.isLoading}>
                Deactivate
              </Button>
              <Button size="sm" variant="danger" leftIcon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            </div>
          )}
        </div>
        <DataTable
          caption="Products"
          rows={data ? sortRows(data.results, sort) : undefined}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          rowKey={(p) => p.id}
          onRowClick={(p) => navigate(`/products/${p.id}`)}
          selectable
          selected={selected}
          onSelectedChange={setSelected}
          sort={sort}
          onSortChange={setSort}
          empty={
            <EmptyState
              icon={<Package className="h-5 w-5" />}
              title={q || status ? 'No matching products' : 'No products yet'}
              description={q || status ? 'Adjust the search or filter.' : 'Add your first product or import from the TheNearByShop catalogue.'}
              action={
                !q && !status ? (
                  <Link to="/products/new">
                    <Button>Add product</Button>
                  </Link>
                ) : undefined
              }
            />
          }
          columns={[
            {
              key: 'name',
              header: 'Product',
              sortable: true,
              cell: (p) => (
                <div className="flex items-center gap-3">
                  {p.image ? (
                    <img src={p.image} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded-md border border-line object-cover" />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-ink/5 text-ink-subtle">
                      <ImageOff className="h-4 w-4" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="text-xs text-ink-subtle">SKU {p.sku || '—'}</p>
                  </div>
                </div>
              ),
            },
            { key: 'category', header: 'Category', cell: (p) => p.category_name ?? '—', hideOnMobile: true },
            {
              key: 'price',
              header: 'Price',
              sortable: true,
              align: 'right',
              cell: (p) => (
                <div className="tabular">
                  <p>{formatCurrency(p.price)}</p>
                  {Number(p.mrp) > Number(p.price) && <p className="text-xs text-ink-subtle line-through">{formatCurrency(p.mrp)}</p>}
                </div>
              ),
            },
            {
              key: 'stock',
              header: 'Stock',
              sortable: true,
              align: 'right',
              cell: (p) => (
                <span className={p.stock === 0 ? 'font-semibold text-red-600' : p.stock <= p.low_stock_threshold ? 'font-semibold text-amber-600' : 'tabular'}>
                  {formatNumber(p.stock)}
                  {p.stock > 0 && p.stock <= p.low_stock_threshold && <span className="sr-only"> (low stock)</span>}
                </span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              hideOnMobile: true,
              cell: (p) => (p.is_active ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>),
            },
          ]}
        />
        {data && (
          <Pagination
            page={page}
            count={data.count}
            hasNext={Boolean(data.next)}
            onPageChange={(p) => {
              setPage(p);
              setSelected(new Set());
            }}
          />
        )}
      </Card>
      <p className="mt-2 text-xs text-ink-subtle">Sorting applies to the current page. Barcodes are shown on each product's page.</p>
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        loading={bulkDeleteState.isLoading}
        tone="danger"
        title={`Delete ${selected.size} product(s)?`}
        description="Deleted products are removed from your shop and the POS. Past orders keep their item snapshot."
        confirmLabel="Delete"
      />
      <MasterCatalogDialog open={catalogOpen} onClose={() => setCatalogOpen(false)} />
    </>
  );
}
