import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Landmark, Plus, ShieldCheck, ShieldQuestion, Star, Trash2 } from 'lucide-react';
import { Badge, Button, Card, CardBody, Checkbox, ConfirmDialog, Dialog, Field, Input, Select, Skeleton } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useToast } from '@/hooks/useToast';
import { isApiError } from '@/services/api/errors';
import type { BankAccount } from '@/types/api';
import { useCreateBankAccountMutation, useDeleteBankAccountMutation, useListBankAccountsQuery } from '@/features/wallet/api';
import { bankAccountSchema, type BankAccountValues } from './validation';

function AddAccountDialog({ open, onClose, isFirst }: { open: boolean; onClose: () => void; isFirst: boolean }) {
  const toast = useToast();
  const [create, { isLoading }] = useCreateBankAccountMutation();
  const { register, handleSubmit, formState, reset, setError } = useForm<BankAccountValues>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: { account_holder_name: '', bank_name: '', account_number: '', confirm_account_number: '', ifsc_code: '', account_type: 'savings', upi_id: '', is_primary: isFirst },
  });
  const e = formState.errors;

  const onSubmit = handleSubmit(async (v) => {
    try {
      // Raw details go straight to the server and are never persisted in browser storage.
      await create({
        account_holder_name: v.account_holder_name,
        bank_name: v.bank_name,
        account_number: v.account_number,
        ifsc_code: v.ifsc_code,
        account_type: v.account_type,
        upi_id: v.upi_id || undefined,
        is_primary: v.is_primary,
      }).unwrap();
      toast.success('Bank account submitted', 'It can be used for payouts once TheNearByShop verifies it.');
      reset();
      onClose();
    } catch (err) {
      if (isApiError(err)) {
        for (const [field, msg] of Object.entries(err.fieldErrors)) {
          if (field in bankAccountSchema.innerType().shape) setError(field as keyof BankAccountValues, { message: msg });
        }
      }
      toast.error('Could not add bank account', err);
    }
  });

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Add bank account"
      description="Used for wallet withdrawals after verification."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="bank-form" loading={isLoading}>
            Submit for verification
          </Button>
        </>
      }
    >
      <form id="bank-form" onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2" autoComplete="off">
        <Field label="Account holder name" error={e.account_holder_name?.message} required className="sm:col-span-2">
          <Input {...register('account_holder_name')} data-autofocus />
        </Field>
        <Field label="Bank name" error={e.bank_name?.message} required>
          <Input {...register('bank_name')} />
        </Field>
        <Field label="IFSC code" error={e.ifsc_code?.message} required>
          <Input className="uppercase" maxLength={11} {...register('ifsc_code')} />
        </Field>
        <Field label="Account number" error={e.account_number?.message} required>
          <Input inputMode="numeric" autoComplete="off" {...register('account_number')} />
        </Field>
        <Field label="Confirm account number" error={e.confirm_account_number?.message} required>
          <Input inputMode="numeric" autoComplete="off" onPaste={(ev) => ev.preventDefault()} {...register('confirm_account_number')} />
        </Field>
        <Field label="Account type" error={e.account_type?.message}>
          <Select {...register('account_type')}>
            <option value="savings">Savings</option>
            <option value="current">Current</option>
          </Select>
        </Field>
        <Field label="UPI ID (optional)" error={e.upi_id?.message}>
          <Input {...register('upi_id')} />
        </Field>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <Checkbox {...register('is_primary')} /> Use as primary payout account
        </label>
      </form>
    </Dialog>
  );
}

export function BankAccountsPage() {
  const toast = useToast();
  const { data, isLoading, error, refetch } = useListBankAccountsQuery();
  const [remove, removeState] = useDeleteBankAccountMutation();
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<BankAccount | null>(null);

  return (
    <>
      <PageHeader
        title="Bank accounts"
        description="Payout accounts. Account numbers are masked by the server and never stored in this browser."
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setAdding(true)}>
            Add account
          </Button>
        }
      />
      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !data?.length ? (
        <Card>
          <EmptyState
            icon={<Landmark className="h-5 w-5" />}
            title="No bank accounts"
            description="Add a bank account to withdraw your earnings."
            action={<Button onClick={() => setAdding(true)}>Add account</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((a) => (
            <Card key={a.id}>
              <CardBody className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{a.bank_name}</p>
                    <p className="font-mono text-sm tracking-wider text-ink-muted">{a.account_masked || '••••'}</p>
                  </div>
                  {a.is_verified ? (
                    <Badge tone="success">
                      <ShieldCheck className="h-3 w-3" /> Verified
                    </Badge>
                  ) : (
                    <Badge tone="warning">
                      <ShieldQuestion className="h-3 w-3" /> Pending verification
                    </Badge>
                  )}
                </div>
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-ink-subtle">Holder</dt>
                    <dd className="font-medium">{a.account_holder_name}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-subtle">IFSC</dt>
                    <dd className="font-mono">{a.ifsc_code}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-subtle">Type</dt>
                    <dd className="capitalize">{a.account_type}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-subtle">UPI</dt>
                    <dd>{a.upi_id || '—'}</dd>
                  </div>
                </dl>
                <div className="flex items-center justify-between border-t border-line pt-3">
                  {a.is_primary ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-700">
                      <Star className="h-3.5 w-3.5" /> Primary
                    </span>
                  ) : (
                    <span />
                  )}
                  <Button size="sm" variant="ghost" leftIcon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setDeleting(a)}>
                    Remove
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
      <p className="mt-4 text-xs text-ink-subtle">To change details of an account, remove it and add the corrected one; it will be verified again.</p>
      <AddAccountDialog open={adding} onClose={() => setAdding(false)} isFirst={!data?.length} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        tone="danger"
        loading={removeState.isLoading}
        title="Remove bank account?"
        description={deleting ? `${deleting.bank_name} ${deleting.account_masked ?? ''} will no longer be available for payouts.` : undefined}
        confirmLabel="Remove"
        onConfirm={async () => {
          try {
            await remove(deleting!.id).unwrap();
            toast.success('Bank account removed');
            setDeleting(null);
          } catch (err) {
            toast.error('Could not remove account', err);
          }
        }}
      />
    </>
  );
}
