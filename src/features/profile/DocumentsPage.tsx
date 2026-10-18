import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, Field, Input, Skeleton } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { BackendGap } from '@/components/feedback/BackendGap';
import { useToast } from '@/hooks/useToast';
import { useGetMeQuery, useGetStoreDocumentsQuery, useUpdateStoreDocumentsMutation } from './api';

const schema = z.object({
  registration_number: z.string().trim().max(50),
  gstin: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .refine((v) => v === '' || /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v), 'GSTIN must be 15 characters, e.g. 22AAAAA0000A1Z5'),
  pan_card: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .refine((v) => v === '' || /^[A-Z]{5}\d{4}[A-Z]$/.test(v), 'PAN must look like ABCDE1234F'),
});
type Values = z.infer<typeof schema>;

export function DocumentsPage() {
  const toast = useToast();
  const me = useGetMeQuery();
  const docs = useGetStoreDocumentsQuery();
  const [update, { isLoading }] = useUpdateStoreDocumentsMutation();
  const { register, handleSubmit, reset, formState } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { registration_number: '', gstin: '', pan_card: '' } });

  useEffect(() => {
    if (docs.data) reset({ registration_number: docs.data.registration_number ?? '', gstin: docs.data.gstin ?? '', pan_card: docs.data.pan_card ?? '' });
  }, [docs.data, reset]);

  if (docs.error) return <ErrorState error={docs.error} onRetry={docs.refetch} />;
  const verified = me.data?.is_verified;

  return (
    <>
      <PageHeader backTo="/profile" title="Verification & documents" description="Tax and registration details used for invoices and KYC." />
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Tax & registration" />
          {docs.isLoading ? (
            <CardBody>
              <Skeleton className="h-40 w-full" />
            </CardBody>
          ) : (
            <form
              noValidate
              onSubmit={handleSubmit(async (v) => {
                try {
                  await update(v).unwrap();
                  toast.success('Documents saved');
                } catch (err) {
                  toast.error('Could not save documents', err);
                }
              })}
            >
              <CardBody className="grid gap-4 sm:grid-cols-2">
                <Field label="GSTIN" error={formState.errors.gstin?.message}>
                  <Input className="uppercase" maxLength={15} {...register('gstin')} />
                </Field>
                <Field label="PAN" error={formState.errors.pan_card?.message}>
                  <Input className="uppercase" maxLength={10} {...register('pan_card')} />
                </Field>
                <Field label="Business registration number" error={formState.errors.registration_number?.message} className="sm:col-span-2">
                  <Input {...register('registration_number')} />
                </Field>
                <div className="flex justify-end sm:col-span-2">
                  <Button type="submit" loading={isLoading}>
                    Save
                  </Button>
                </div>
              </CardBody>
            </form>
          )}
        </Card>
        <div className="space-y-5">
          <Card>
            <CardHeader title="KYC status" />
            <CardBody className="space-y-2 text-sm">
              {me.isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : verified ? (
                <p className="flex items-center gap-2 font-medium text-emerald-700">
                  <ShieldCheck className="h-5 w-5" /> Verified by TheNearByShop
                </p>
              ) : (
                <p className="flex items-center gap-2 font-medium text-amber-700">
                  <ShieldAlert className="h-5 w-5" /> Not verified yet
                </p>
              )}
              <p className="text-ink-muted">Verification is decided by the TheNearByShop team; the portal only displays the server's status.</p>
            </CardBody>
          </Card>
          <BackendGap gap="G-3" title="Document files, rejection reasons and resubmission are handled through the onboarding team">
            The document-file endpoints are not restricted to the shop owner, so uploads are not offered here.
          </BackendGap>
        </div>
      </div>
    </>
  );
}
