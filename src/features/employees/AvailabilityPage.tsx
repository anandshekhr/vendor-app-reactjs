import { useEffect, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { Badge, Button, Card, CardBody, CardHeader, Field, Input, Select, Skeleton, Switch } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useAppSelector } from '@/hooks/store';
import { useToast } from '@/hooks/useToast';
import { useGetProviderAvailabilityQuery, useListProvidersQuery, useSaveProviderAvailabilityMutation } from './api';

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface Row {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export function validateRows(rows: Row[]): string | null {
  for (const r of rows) {
    if (r.is_available && (!r.start_time || !r.end_time)) return `${DAYS[r.day_of_week]}: set start and end times.`;
    if (r.is_available && r.start_time >= r.end_time) return `${DAYS[r.day_of_week]}: end time must be after start time.`;
  }
  return null;
}

function slotLabel(slot: unknown): string {
  if (typeof slot === 'string') return slot;
  if (slot && typeof slot === 'object') {
    const s = slot as Record<string, unknown>;
    return [s.start_time ?? s.start, s.end_time ?? s.end].filter(Boolean).join('–') || JSON.stringify(slot);
  }
  return String(slot);
}

function isSlotAvailable(slot: unknown): boolean {
  return !(slot && typeof slot === 'object' && (slot as Record<string, unknown>).is_available === false);
}

export function AvailabilityPage() {
  const toast = useToast();
  const shopId = useAppSelector((s) => s.auth.business?.shopId);
  const providers = useListProvidersQuery(shopId!, { skip: !shopId });
  const [providerId, setProviderId] = useState<number | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const availability = useGetProviderAvailabilityQuery({ providerId: providerId! }, { skip: !providerId });
  const slots = useGetProviderAvailabilityQuery({ providerId: providerId!, date }, { skip: !providerId || !date });
  const [save, saveState] = useSaveProviderAvailabilityMutation();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!providerId && providers.data?.length) setProviderId(providers.data[0].id);
  }, [providers.data, providerId]);

  useEffect(() => {
    if (!availability.data) return;
    setRows(
      DAYS.map((_, day) => {
        const a = availability.data!.availability.find((x) => x.day_of_week === day);
        return { day_of_week: day, start_time: a?.start_time ?? '10:00', end_time: a?.end_time ?? '19:00', is_available: a ? a.is_available : false };
      }),
    );
  }, [availability.data]);

  const onSave = async () => {
    const problem = validateRows(rows);
    if (problem) return toast.error(problem);
    try {
      await save({ providerId: providerId!, rows }).unwrap();
      toast.success('Availability saved');
    } catch (err) {
      toast.error('Could not save availability', err);
    }
  };

  if (providers.error) return <ErrorState error={providers.error} onRetry={providers.refetch} />;
  const daySlots = slots.data?.slots;

  return (
    <>
      <PageHeader title="Availability" description="Weekly working hours per employee. Bookable slots are computed by the server from these hours, breaks and your shop status." />
      {providers.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !providers.data?.length ? (
        <EmptyState icon={<CalendarDays className="h-5 w-5" />} title="No employees" description="Availability is set per employee." />
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader
              title="Weekly hours"
              actions={
                <Select aria-label="Employee" value={providerId ?? ''} onChange={(e) => setProviderId(Number(e.target.value))} className="w-48">
                  {providers.data.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              }
            />
            {availability.error ? (
              <ErrorState error={availability.error} onRetry={availability.refetch} />
            ) : availability.isLoading ? (
              <CardBody>
                <Skeleton className="h-48 w-full" />
              </CardBody>
            ) : (
              <CardBody className="space-y-2">
                {rows.map((r, i) => (
                  <div key={r.day_of_week} className="flex flex-wrap items-center gap-3 rounded-md border border-line px-3 py-2">
                    <Switch
                      checked={r.is_available}
                      label={`${DAYS[r.day_of_week]} working`}
                      onChange={(v) => setRows(rows.map((x, j) => (j === i ? { ...x, is_available: v } : x)))}
                    />
                    <span className="w-24 text-sm font-medium">{DAYS[r.day_of_week]}</span>
                    <Input type="time" aria-label={`${DAYS[r.day_of_week]} start`} className="w-32" disabled={!r.is_available} value={r.start_time} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, start_time: e.target.value } : x)))} />
                    <span className="text-ink-subtle">to</span>
                    <Input type="time" aria-label={`${DAYS[r.day_of_week]} end`} className="w-32" disabled={!r.is_available} value={r.end_time} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, end_time: e.target.value } : x)))} />
                    {!r.is_available && <Badge>Off</Badge>}
                  </div>
                ))}
                <div className="flex justify-end pt-2">
                  <Button onClick={onSave} loading={saveState.isLoading}>
                    Save weekly hours
                  </Button>
                </div>
              </CardBody>
            )}
          </Card>
          <Card>
            <CardHeader title="Bookable slots" description="As computed by the server" />
            <CardBody className="space-y-3">
              <Field label="Date">
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
              {slots.isFetching ? (
                <Skeleton className="h-24 w-full" />
              ) : slots.error ? (
                <ErrorState error={slots.error} />
              ) : Array.isArray(daySlots) && daySlots.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {daySlots.map((s, i) => (
                    <Badge key={i} tone={isSlotAvailable(s) ? 'success' : 'neutral'}>
                      {slotLabel(s)}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-muted">No bookable slots on this date.</p>
              )}
              {slots.data?.breaks.length ? <p className="text-xs text-ink-subtle">{slots.data.breaks.length} break(s) on this date.</p> : null}
            </CardBody>
          </Card>
        </div>
      )}
    </>
  );
}
