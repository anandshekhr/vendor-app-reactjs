import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { Button, Dialog, Field, Input, Select, Skeleton, Textarea } from '@/components/ui';
import { BackendGap } from '@/components/feedback/BackendGap';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { useToast } from '@/hooks/useToast';
import { isApiError } from '@/services/api/errors';
import { formatCurrency } from '@/utils/format';
import { uuid } from '@/utils/id';
import type { Withdrawal } from '@/types/api';
import { useCreateWithdrawalMutation, useGetBalanceBreakdownQuery, useListBankAccountsQuery } from '@/features/wallet/api';
import { MIN_WITHDRAWAL, withdrawalSchema, type WithdrawalValues } from './validation';

type Step = 'form' | 'review' | 'done' | 'uncertain';

export function NewWithdrawalDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const balance = useGetBalanceBreakdownQuery(undefined, { skip: !open, refetchOnMountOrArgChange: true });
  const accounts = useListBankAccountsQuery(undefined, { skip: !open });
  const [create, { isLoading }] = useCreateWithdrawalMutation();
  const [step, setStep] = useState<Step>('form');
  const [result, setResult] = useState<Withdrawal | null>(null);
  const idempotencyKey = useRef(uuid());
  const available = Number(balance.data?.available_balance ?? 0);
  const verified = useMemo(() => (accounts.data ?? []).filter((a) => a.is_verified), [accounts.data]);
  const schema = useMemo(() => withdrawalSchema(available), [available]);
  const { register, handleSubmit, formState, getValues, reset, setValue } = useForm<WithdrawalValues>({ resolver: zodResolver(schema), defaultValues: { amount: '', bankAccountId: '', notes: '' } });

  useEffect(() => {
    if (open) {
      setStep('form');
      setResult(null);
      idempotencyKey.current = uuid();
      reset({ amount: '', bankAccountId: verified.find((a) => a.is_primary)?.id.toString() ?? '', notes: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Preselect the primary verified account once accounts have loaded.
  useEffect(() => {
    if (open && !getValues('bankAccountId')) {
      const primary = verified.find((a) => a.is_primary) ?? (verified.length === 1 ? verified[0] : undefined);
      if (primary) setValue('bankAccountId', String(primary.id));
    }
  }, [open, verified, getValues, setValue]);

  const selectedAccount = verified.find((a) => String(a.id) === getValues('bankAccountId'));

  const submit = async () => {
    const v = getValues();
    try {
      const w = await create({ amount: Number(v.amount).toFixed(2), bank_account_id: Number(v.bankAccountId), notes: v.notes ?? '', idempotencyKey: idempotencyKey.current }).unwrap();
      setResult(w);
      setStep('done');
    } catch (err) {
      if (isApiError(err) && (err.isAmbiguous || (err.status ?? 0) >= 500)) {
        // Do not offer an immediate retry: the request may have been accepted (no server idempotency — G-11).
        setStep('uncertain');
      } else {
        toast.error('Withdrawal request rejected', err);
        setStep('form');
      }
    }
  };

  const loading = balance.isLoading || accounts.isLoading;

  return (
    <Dialog
      open={open}
      onClose={isLoading ? () => undefined : onClose}
      title={step === 'done' ? 'Withdrawal requested' : 'Withdraw funds'}
      footer={
        step === 'form' ? (
          <>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" form="withdraw-form" disabled={loading || verified.length === 0 || available < MIN_WITHDRAWAL}>
              Review
            </Button>
          </>
        ) : step === 'review' ? (
          <>
            <Button variant="outline" onClick={() => setStep('form')} disabled={isLoading}>
              Back
            </Button>
            <Button onClick={submit} loading={isLoading}>
              Confirm withdrawal
            </Button>
          </>
        ) : (
          <Button onClick={onClose}>Close</Button>
        )
      }
    >
      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : step === 'form' ? (
        <form id="withdraw-form" onSubmit={handleSubmit(() => setStep('review'))} className="space-y-4" noValidate>
          <div className="rounded-md bg-emerald-50 p-3 text-sm dark:bg-emerald-900/20">
            Available to withdraw: <span className="font-semibold">{formatCurrency(available)}</span>
            <span className="block text-xs text-ink-muted">Minimum ₹{MIN_WITHDRAWAL}. Maximum, fees and processing time are not published by the server.</span>
          </div>
          {verified.length === 0 ? (
            <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <p>
                You need a verified bank account to withdraw.{' '}
                <Link to="/bank-accounts" className="font-semibold underline" onClick={onClose}>
                  Manage bank accounts
                </Link>
              </p>
            </div>
          ) : (
            <>
              <Field label="Amount (₹)" error={formState.errors.amount?.message} required>
                <Input inputMode="decimal" {...register('amount')} data-autofocus />
              </Field>
              <Field label="Pay out to" error={formState.errors.bankAccountId?.message} required hint="Only verified accounts are listed.">
                <Select {...register('bankAccountId')}>
                  <option value="">Choose an account…</option>
                  {verified.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.bank_name} · {a.account_masked} {a.is_primary ? '(primary)' : ''}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Note (optional)" error={formState.errors.notes?.message}>
                <Textarea rows={2} maxLength={500} {...register('notes')} />
              </Field>
            </>
          )}
        </form>
      ) : step === 'review' ? (
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-muted">Amount</dt>
            <dd className="font-semibold">{formatCurrency(getValues('amount'))}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-muted">Fees</dt>
            <dd>As applied by TheNearByShop</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-muted">Bank account</dt>
            <dd>
              {selectedAccount?.bank_name} · {selectedAccount?.account_masked}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-muted">Account holder</dt>
            <dd>{selectedAccount?.account_holder_name}</dd>
          </div>
          <BackendGap gap="G-11" title="The net payout is confirmed by the finance team">
            The server does not publish fees or reserve the amount at request time; the request is reviewed before payment.
          </BackendGap>
        </dl>
      ) : step === 'done' && result ? (
        <div className="space-y-3 text-center" role="status">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
          <p className="text-sm">
            Request <span className="font-semibold">#{result.id}</span> for <span className="font-semibold">{formatCurrency(result.amount)}</span> was submitted.
          </p>
          <StatusBadge status={result.status} label={result.status_display} />
          <p className="text-xs text-ink-muted">This is a request, not a completed payout. Track its status in withdrawal history.</p>
        </div>
      ) : (
        <div className="space-y-2 text-sm" role="alert">
          <p className="font-medium">We could not confirm whether your request was received.</p>
          <p className="text-ink-muted">To avoid a duplicate withdrawal, check your withdrawal history before submitting again.</p>
          <Link to="/wallet/withdrawals" onClick={onClose} className="font-semibold text-brand-700 underline">
            Open withdrawal history
          </Link>
        </div>
      )}
    </Dialog>
  );
}
