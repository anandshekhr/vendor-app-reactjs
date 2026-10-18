import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Wrench } from 'lucide-react';
import { Badge, Button, Card, Select } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/tables/DataTable';
import { Pagination } from '@/components/tables/Pagination';
import { SearchInput } from '@/components/forms/SearchInput';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useDebounce } from '@/hooks/useDebounce';
import { formatCurrency } from '@/utils/format';
import { useListShopServicesQuery } from './api';

export function ServicesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounce(search.trim());
  const { data, isLoading, isFetching, error, refetch } = useListShopServicesQuery({ search: q, status, page });
  return (
    <>
      <PageHeader
        title="Services"
        description="Services your customers can book."
        actions={
          <Link to="/services/new">
            <Button leftIcon={<Plus className="h-4 w-4" />}>Add service</Button>
          </Link>
        }
      />
      <Card>
        <div className="flex flex-col gap-2 border-b border-line p-3 sm:flex-row">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search services" label="Search services" />
          <Select aria-label="Filter by availability" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="sm:w-44">
            <option value="">All services</option>
            <option value="active">Available</option>
            <option value="inactive">Unavailable</option>
          </Select>
        </div>
        <DataTable
          rows={data?.results}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          rowKey={(s) => s.id}
          onRowClick={(s) => navigate(`/services/${s.id}`)}
          empty={
            <EmptyState
              icon={<Wrench className="h-5 w-5" />}
              title="No services yet"
              description="Add services from the TheNearByShop service catalogue and set your prices."
              action={
                <Link to="/services/new">
                  <Button>Add service</Button>
                </Link>
              }
            />
          }
          columns={[
            {
              key: 'name',
              header: 'Service',
              cell: (s) => (
                <div className="flex items-center gap-3">
                  {s.cover_image && <img src={s.cover_image} alt="" className="h-10 w-10 rounded-md object-cover" loading="lazy" />}
                  <span className="font-medium">{s.service_name}</span>
                </div>
              ),
            },
            { key: 'price', header: 'Starting price', align: 'right', cell: (s) => formatCurrency(s.base_price) },
            { key: 'status', header: 'Status', cell: (s) => (s.is_available ? <Badge tone="success">Available</Badge> : <Badge>Unavailable</Badge>) },
          ]}
        />
        {data && <Pagination page={page} count={data.count} hasNext={Boolean(data.next)} onPageChange={setPage} />}
      </Card>
    </>
  );
}
