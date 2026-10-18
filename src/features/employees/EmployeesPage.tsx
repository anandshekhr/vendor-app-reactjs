import { Link } from 'react-router-dom';
import { CalendarDays, Star, UserCog } from 'lucide-react';
import { Badge, Button, Card, CardHeader } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/tables/DataTable';
import { EmptyState } from '@/components/feedback/EmptyState';
import { BackendGap } from '@/components/feedback/BackendGap';
import { useAppSelector } from '@/hooks/store';
import { initials } from '@/utils/format';
import { useListProvidersQuery } from './api';

export function EmployeesPage() {
  const shopId = useAppSelector((s) => s.auth.business?.shopId);
  const { data, isLoading, isFetching, error, refetch } = useListProvidersQuery(shopId!, { skip: !shopId });
  return (
    <>
      <PageHeader
        title="Employees"
        description="Staff who deliver your services."
        actions={
          <Link to="/availability">
            <Button variant="outline" leftIcon={<CalendarDays className="h-4 w-4" />}>
              Manage availability
            </Button>
          </Link>
        }
      />
      <BackendGap className="mb-5" gap="G-10" title="Adding, editing or deactivating employees is not available from the portal yet">
        The provider API requires a pre-existing user account per employee and has no update/delete endpoint. Employees added during onboarding or by support appear below.
      </BackendGap>
      <Card>
        <CardHeader title="Team" description={data ? `${data.length} employee(s)` : undefined} />
        <DataTable
          rows={data}
          loading={isLoading || isFetching}
          error={error}
          onRetry={refetch}
          rowKey={(p) => p.id}
          empty={<EmptyState icon={<UserCog className="h-5 w-5" />} title="No employees yet" />}
          columns={[
            {
              key: 'name',
              header: 'Employee',
              cell: (p) => (
                <div className="flex items-center gap-3">
                  {p.profile_image ? (
                    <img src={p.profile_image} alt="" className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">{initials(p.name)}</span>
                  )}
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-ink-subtle">{p.role || 'Staff'}</p>
                  </div>
                </div>
              ),
            },
            { key: 'phone', header: 'Contact', cell: (p) => (p.phone ? <a href={`tel:${p.phone}`} className="text-brand-700 hover:underline">{p.phone}</a> : '—'), hideOnMobile: true },
            {
              key: 'skills',
              header: 'Specialties',
              hideOnMobile: true,
              cell: (p) => (
                <div className="flex flex-wrap gap-1">
                  {p.specializations.length ? p.specializations.map((s) => <Badge key={s}>{s}</Badge>) : <span className="text-ink-subtle">—</span>}
                </div>
              ),
            },
            { key: 'exp', header: 'Experience', cell: (p) => `${p.experience_years} yr`, hideOnMobile: true },
            {
              key: 'rating',
              header: 'Rating',
              cell: (p) => (
                <span className="inline-flex items-center gap-1 tabular">
                  <Star className="h-3.5 w-3.5 text-amber-500" aria-hidden /> {Number(p.rating).toFixed(1)} <span className="text-xs text-ink-subtle">({p.review_count})</span>
                </span>
              ),
            },
            { key: 'status', header: 'Status', cell: (p) => (p.is_available ? <Badge tone="success">Available</Badge> : <Badge>Unavailable</Badge>) },
          ]}
        />
      </Card>
    </>
  );
}
