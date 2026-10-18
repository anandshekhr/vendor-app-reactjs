import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Trash2 } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, Checkbox, ConfirmDialog, Field, Input, Select, Skeleton } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { BackendGap } from '@/components/feedback/BackendGap';
import { useToast } from '@/hooks/useToast';
import { titleCase } from '@/utils/format';
import { useCreateShopServiceMutation, useDeleteShopServiceMutation, useGetShopServiceQuery, useListCatalogServicesQuery, useUpdateShopServiceMutation } from './api';

const money = z.string().trim().refine((v) => /^\d+(\.\d{1,2})?$/.test(v), 'Enter an amount like 499 or 499.50');
const optionalMoney = z.string().trim().refine((v) => v === '' || /^\d+(\.\d{1,2})?$/.test(v), 'Enter a valid amount');

const schema = z
  .object({
    service: z.string().min(1, 'Choose a service'),
    base_price: money,
    minimum_price: optionalMoney,
    estimated_duration_minutes: z.string().trim().refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) > 0 && Number(v) <= 1440), 'Minutes between 1 and 1440'),
    service_radius_km: z.string().trim().refine((v) => v === '' || /^\d+(\.\d{1,2})?$/.test(v), 'Enter distance in km'),
    is_available: z.boolean(),
  })
  .refine((v) => v.minimum_price === '' || Number(v.minimum_price) <= Number(v.base_price), { path: ['minimum_price'], message: 'Minimum price cannot exceed the starting price' });

type Values = z.infer<typeof schema>;

export function ServiceFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const serviceId = Number(id);
  const navigate = useNavigate();
  const toast = useToast();
  const catalog = useListCatalogServicesQuery();
  const existing = useGetShopServiceQuery(serviceId, { skip: !isEdit });
  const [create, createState] = useCreateShopServiceMutation();
  const [update, updateState] = useUpdateShopServiceMutation();
  const [remove, removeState] = useDeleteShopServiceMutation();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [cover, setCover] = useState<File | null>(null);
  const { register, handleSubmit, formState, reset, watch } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { service: '', base_price: '', minimum_price: '', estimated_duration_minutes: '', service_radius_km: '', is_available: true },
  });

  useEffect(() => {
    const s = existing.data;
    if (s)
      reset({
        service: s.service,
        base_price: String(s.base_price),
        minimum_price: s.minimum_price != null ? String(s.minimum_price) : '',
        estimated_duration_minutes: s.estimated_duration_minutes != null ? String(s.estimated_duration_minutes) : '',
        service_radius_km: s.service_radius_km != null ? String(s.service_radius_km) : '',
        is_available: s.is_available,
      });
  }, [existing.data, reset]);

  const selected = catalog.data?.find((c) => c.id === watch('service'));

  const onSubmit = handleSubmit(async (v) => {
    const payload: Record<string, unknown> = {
      service: v.service,
      base_price: v.base_price,
      minimum_price: v.minimum_price || null,
      estimated_duration_minutes: v.estimated_duration_minutes ? Number(v.estimated_duration_minutes) : null,
      service_radius_km: v.service_radius_km || null,
      is_available: v.is_available,
    };
    let body: Record<string, unknown> | FormData = payload;
    if (cover) {
      const fd = new FormData();
      Object.entries(payload).forEach(([k, val]) => val !== null && fd.append(k, typeof val === 'boolean' ? String(val) : String(val)));
      fd.append('cover_image', cover);
      body = fd;
    }
    try {
      if (isEdit) await update({ id: serviceId, data: body }).unwrap();
      else await create(body).unwrap();
      toast.success(isEdit ? 'Service updated' : 'Service added');
      navigate('/services');
    } catch (err) {
      toast.error('Could not save service', err);
    }
  });

  if (isEdit && existing.error) return <ErrorState error={existing.error} onRetry={existing.refetch} />;
  if (isEdit && existing.isLoading) return <Skeleton className="h-80 w-full" />;
  const e = formState.errors;

  return (
    <>
      <PageHeader
        backTo="/services"
        title={isEdit ? selected?.name ?? 'Edit service' : 'Add service'}
        actions={
          isEdit ? (
            <Button variant="outline" leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirmDelete(true)}>
              Remove
            </Button>
          ) : undefined
        }
      />
      <form onSubmit={onSubmit} noValidate className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Service details" />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field label="Service" error={e.service?.message} required className="sm:col-span-2" hint="Services come from the TheNearByShop catalogue.">
              <Select {...register('service')} disabled={catalog.isLoading || isEdit}>
                <option value="">Choose a service…</option>
                {(catalog.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.category_name ? ` — ${c.category_name}` : ''}
                  </option>
                ))}
              </Select>
            </Field>
            {selected && (
              <p className="text-sm text-ink-muted sm:col-span-2">
                {selected.short_description || selected.description || 'No description.'} · Pricing: {titleCase(selected.pricing_type ?? '')} · Type: {titleCase(selected.service_type ?? '')}
              </p>
            )}
            <Field label="Starting price (₹)" error={e.base_price?.message} required>
              <Input inputMode="decimal" {...register('base_price')} />
            </Field>
            <Field label="Minimum price (₹)" error={e.minimum_price?.message}>
              <Input inputMode="decimal" {...register('minimum_price')} />
            </Field>
            <Field label="Estimated duration (minutes)" error={e.estimated_duration_minutes?.message}>
              <Input inputMode="numeric" {...register('estimated_duration_minutes')} />
            </Field>
            <Field label="Service radius (km)" error={e.service_radius_km?.message} hint="For home services.">
              <Input inputMode="decimal" {...register('service_radius_km')} />
            </Field>
            <BackendGap gap="G-10" title="Custom service names, descriptions and per-service images other than a cover are managed in the catalogue" className="sm:col-span-2" />
          </CardBody>
        </Card>
        <div className="space-y-5">
          <Card>
            <CardHeader title="Cover image" />
            <CardBody>
              <input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Cover image" onChange={(ev) => setCover(ev.target.files?.[0] ?? null)} className="text-sm" />
              {(cover || existing.data?.cover_image) && (
                <img src={cover ? URL.createObjectURL(cover) : existing.data!.cover_image!} alt="Cover" className="mt-3 max-h-40 rounded object-cover" />
              )}
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox {...register('is_available')} /> Available for booking
              </label>
            </CardBody>
          </Card>
          <Button type="submit" className="w-full" loading={createState.isLoading || updateState.isLoading}>
            {isEdit ? 'Save changes' : 'Add service'}
          </Button>
        </div>
      </form>
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        tone="danger"
        loading={removeState.isLoading}
        title="Remove this service?"
        description="Customers will no longer be able to book it. Existing bookings are not affected."
        confirmLabel="Remove"
        onConfirm={async () => {
          try {
            await remove(serviceId).unwrap();
            toast.success('Service removed');
            navigate('/services');
          } catch (err) {
            toast.error('Could not remove service', err);
          }
        }}
      />
    </>
  );
}
