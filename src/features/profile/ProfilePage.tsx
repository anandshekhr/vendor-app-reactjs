import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FileCheck2, MapPin, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Badge, Button, Card, CardBody, CardHeader, Field, Input, Skeleton, Switch, Textarea } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { BackendGap } from '@/components/feedback/BackendGap';
import { useToast } from '@/hooks/useToast';
import { useCapabilities } from '@/hooks/useCapabilities';
import type { StoreHour } from '@/types/api';
import { DAYS } from '@/features/employees/AvailabilityPage';
import { useGetMeQuery, useGetShopProfileQuery, useGetStoreHoursQuery, useUpdateShopProfileMutation, useUpdateStoreHoursMutation } from './api';

const money = z.string().trim().refine((v) => /^\d+(\.\d{1,2})?$/.test(v), 'Enter a valid amount');
const minutes = z.string().trim().refine((v) => /^\d+$/.test(v) && Number(v) <= 1440, 'Minutes (0–1440)');

const schema = z
  .object({
    name: z.string().trim().min(2).max(255),
    tagline: z.string().max(500),
    description: z.string().max(5000),
    delivery_time_min: minutes,
    delivery_time_max: minutes,
    minimum_order: money,
    free_delivery_threshold: money,
  })
  .refine((v) => Number(v.delivery_time_max) >= Number(v.delivery_time_min), { path: ['delivery_time_max'], message: 'Must be at least the minimum time' });

type Values = z.infer<typeof schema>;

function StoreHoursEditor() {
  const toast = useToast();
  const { data, isLoading, error, refetch } = useGetStoreHoursQuery();
  const [save, { isLoading: saving }] = useUpdateStoreHoursMutation();
  const [rows, setRows] = useState<StoreHour[]>([]);
  useEffect(() => {
    if (data)
      setRows(
        DAYS.map((_, d) => {
          const h = data.find((x) => x.day_of_week === d);
          return { day_of_week: d, opening_time: h?.opening_time?.slice(0, 5) ?? '09:00', closing_time: h?.closing_time?.slice(0, 5) ?? '21:00', is_open: h ? h.is_open : false };
        }),
      );
  }, [data]);
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (isLoading) return <Skeleton className="h-48 w-full" />;
  const onSave = async () => {
    const bad = rows.find((r) => r.is_open && r.opening_time >= r.closing_time);
    if (bad) return toast.error(`${DAYS[bad.day_of_week]}: closing time must be after opening time`);
    try {
      await save(rows).unwrap();
      toast.success('Opening hours saved');
    } catch (err) {
      toast.error('Could not save opening hours', err);
    }
  };
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={r.day_of_week} className="flex flex-wrap items-center gap-3">
          <Switch checked={r.is_open} label={`Open on ${DAYS[r.day_of_week]}`} onChange={(v) => setRows(rows.map((x, j) => (j === i ? { ...x, is_open: v } : x)))} />
          <span className="w-24 text-sm">{DAYS[r.day_of_week]}</span>
          <Input type="time" aria-label={`${DAYS[r.day_of_week]} opening`} className="w-32" disabled={!r.is_open} value={r.opening_time} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, opening_time: e.target.value } : x)))} />
          <span className="text-ink-subtle">–</span>
          <Input type="time" aria-label={`${DAYS[r.day_of_week]} closing`} className="w-32" disabled={!r.is_open} value={r.closing_time} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, closing_time: e.target.value } : x)))} />
          {!r.is_open && <Badge>Closed</Badge>}
        </div>
      ))}
      <div className="flex justify-end pt-2">
        <Button onClick={onSave} loading={saving}>
          Save hours
        </Button>
      </div>
    </div>
  );
}

export function ProfilePage() {
  const toast = useToast();
  const { businessType } = useCapabilities();
  const shop = useGetShopProfileQuery();
  const me = useGetMeQuery();
  const [update, { isLoading }] = useUpdateShopProfileMutation();
  const [logo, setLogo] = useState<File | null>(null);
  const [banner, setBanner] = useState<File | null>(null);
  const { register, handleSubmit, reset, formState } = useForm<Values>({ resolver: zodResolver(schema) });

  useEffect(() => {
    const s = shop.data;
    if (s)
      reset({
        name: s.name,
        tagline: s.tagline ?? '',
        description: s.description ?? '',
        delivery_time_min: String(s.delivery_time_min),
        delivery_time_max: String(s.delivery_time_max),
        minimum_order: String(s.minimum_order),
        free_delivery_threshold: String(s.free_delivery_threshold),
      });
  }, [shop.data, reset]);

  const onSubmit = handleSubmit(async (v) => {
    let body: Record<string, unknown> | FormData = { ...v, delivery_time_min: Number(v.delivery_time_min), delivery_time_max: Number(v.delivery_time_max) };
    if (logo || banner) {
      const fd = new FormData();
      Object.entries(body).forEach(([k, val]) => fd.append(k, String(val)));
      if (logo) fd.append('shop_image', logo);
      if (banner) fd.append('cover_image', banner);
      body = fd;
    }
    try {
      await update(body).unwrap();
      toast.success('Business profile saved');
      setLogo(null);
      setBanner(null);
    } catch (err) {
      toast.error('Could not save profile', err);
    }
  });

  const toggleAccepting = async (value: boolean) => {
    try {
      await update({ is_accepting_orders: value }).unwrap();
      toast.success(value ? 'Shop is accepting orders' : 'Shop paused — not accepting new orders');
    } catch (err) {
      toast.error('Could not change shop status', err);
    }
  };

  if (shop.error) return <ErrorState error={shop.error} onRetry={shop.refetch} />;
  if (shop.isLoading || !shop.data) return <Skeleton className="h-96 w-full" />;
  const e = formState.errors;
  const m = me.data;
  const loc = m?.shop?.location;

  return (
    <>
      <PageHeader title="Business profile" description="How your business appears to customers on TheNearByShop." />
      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Card>
            <CardHeader title="Storefront" />
            <form onSubmit={onSubmit} noValidate>
              <CardBody className="grid gap-4 sm:grid-cols-2">
                <Field label="Shop name" error={e.name?.message} required className="sm:col-span-2">
                  <Input {...register('name')} />
                </Field>
                <Field label="Tagline" error={e.tagline?.message} className="sm:col-span-2">
                  <Input {...register('tagline')} />
                </Field>
                <Field label="Description" error={e.description?.message} className="sm:col-span-2">
                  <Textarea rows={4} {...register('description')} />
                </Field>
                {businessType !== 'service' && (
                  <>
                    <Field label="Delivery time from (min)" error={e.delivery_time_min?.message}>
                      <Input inputMode="numeric" {...register('delivery_time_min')} />
                    </Field>
                    <Field label="Delivery time to (min)" error={e.delivery_time_max?.message}>
                      <Input inputMode="numeric" {...register('delivery_time_max')} />
                    </Field>
                    <Field label="Minimum order (₹)" error={e.minimum_order?.message}>
                      <Input inputMode="decimal" {...register('minimum_order')} />
                    </Field>
                    <Field label="Free delivery above (₹)" error={e.free_delivery_threshold?.message}>
                      <Input inputMode="decimal" {...register('free_delivery_threshold')} />
                    </Field>
                  </>
                )}
                <Field label="Logo">
                  <input type="file" accept="image/*" onChange={(ev) => setLogo(ev.target.files?.[0] ?? null)} className="text-sm" />
                </Field>
                <Field label="Banner">
                  <input type="file" accept="image/*" onChange={(ev) => setBanner(ev.target.files?.[0] ?? null)} className="text-sm" />
                </Field>
                <div className="flex justify-end sm:col-span-2">
                  <Button type="submit" loading={isLoading}>
                    Save profile
                  </Button>
                </div>
              </CardBody>
            </form>
          </Card>
          <Card>
            <CardHeader title="Opening hours" description="Monday to Sunday" />
            <CardBody>
              <StoreHoursEditor />
            </CardBody>
          </Card>
        </div>
        <div className="space-y-5">
          <Card>
            <CardBody className="space-y-3">
              {shop.data.cover_image && <img src={shop.data.cover_image} alt="" className="h-24 w-full rounded-md object-cover" />}
              <div className="flex items-center gap-3">
                {shop.data.shop_image && <img src={shop.data.shop_image} alt="" className="h-12 w-12 rounded-full border border-line object-cover" />}
                <div>
                  <p className="font-semibold">{m?.business_name ?? shop.data.name}</p>
                  <p className="text-xs text-ink-subtle">{businessType === 'service' ? 'Service provider' : 'Product vendor'}</p>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-md bg-ink/[0.03] p-3">
                <span className="text-sm font-medium">Accepting orders</span>
                <Switch checked={shop.data.is_accepting_orders} label="Accepting orders" onChange={toggleAccepting} disabled={isLoading} />
              </div>
              {m?.is_verified ? (
                <Badge tone="success">
                  <ShieldCheck className="h-3 w-3" /> Verified by TheNearByShop
                </Badge>
              ) : (
                <Link to="/profile/documents">
                  <Badge tone="warning">
                    <ShieldAlert className="h-3 w-3" /> Verification pending
                  </Badge>
                </Link>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Contact & location" />
            <CardBody className="space-y-2 text-sm">
              <p>
                <span className="text-ink-subtle">Phone:</span> {m?.user.phone_number || '—'}
              </p>
              <p>
                <span className="text-ink-subtle">Email:</span> {m?.user.email || '—'}
              </p>
              <p>
                <span className="text-ink-subtle">Category:</span> {m?.shop?.category_name || '—'}
              </p>
              <p className="flex gap-1">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-subtle" /> {m?.shop?.address || 'No address on file'}
              </p>
              {loc?.latitude && loc?.longitude && (
                <a className="text-brand-700 hover:underline" href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`} target="_blank" rel="noreferrer">
                  View on map
                </a>
              )}
              <BackendGap gap="S-3" title="Address, map pin, phone and email changes go through support">
                The available address/location endpoints are not restricted to the shop owner, so the portal does not use them.
              </BackendGap>
            </CardBody>
          </Card>
          <Link to="/profile/documents">
            <Button variant="outline" className="w-full" leftIcon={<FileCheck2 className="h-4 w-4" />}>
              Tax & verification documents
            </Button>
          </Link>
          <BackendGap gap="G-2" title="Holidays, service area and delivery radius settings are not available yet" />
        </div>
      </div>
    </>
  );
}
