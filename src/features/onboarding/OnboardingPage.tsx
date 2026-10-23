import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, CheckCircle2, LocateFixed, Package, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Card, CardBody, Checkbox, Field, Input, Spinner, Textarea } from '@/components/ui';
import { Logo } from '@/components/layout/Logo';
import { ErrorState } from '@/components/feedback/ErrorState';
import { BackendGap } from '@/components/feedback/BackendGap';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { isApiError } from '@/services/api/errors';
import { isValidIndianMobile, normalizeIndianMobile } from '@/utils/phone';
import { cn } from '@/utils/cn';
import { uuid } from '@/utils/id';
import type { OnboardingCategory, VendorApplication } from '@/types/api';
import { DAYS } from '@/features/employees/AvailabilityPage';
import {
  useGetOnboardingCategoriesQuery,
  useSaveStarterProductsMutation,
  useSendOnboardingOtpMutation,
  useSubmitApplicationMutation,
  useVerifyOnboardingOtpMutation,
} from './api';
import { buildApplicationFormData, validateStep, type OnboardingDraft, type StepId } from './draft';
import { StarterProductPicker } from './StarterProductPicker';
import { minStarterProducts, toStarterItems, type StarterDraft } from './starterProducts';

const titleCaseStatus = (status?: string) => (status ? status.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : 'Submitted');

function flatten(nodes: OnboardingCategory[], depth = 0): (OnboardingCategory & { depth: number })[] {
  return nodes.flatMap((n) => [{ ...n, depth }, ...flatten(n.children ?? [], depth + 1)]);
}

const initialDraft: OnboardingDraft = {
  phone: '',
  otp: '',
  phoneVerified: false,
  vendorName: '',
  email: '',
  businessName: '',
  businessType: 'product',
  categoryIds: [],
  address: '',
  city: '',
  state: '',
  zipCode: '',
  latitude: '',
  longitude: '',
  gstTaxId: '',
  bankHolder: '',
  bankName: '',
  accountNumber: '',
  ifsc: '',
  upiId: '',
  shopHours: DAYS.map((_, d) => ({ day_of_week: d, start_time: '10:00', end_time: '20:00', open: d < 6 })),
  employees: [],
  files: { business_license_files: [], id_proof_files: [], bank_detail_files: [], supporting_files: [] },
  acceptTerms: false,
};

export function OnboardingPage() {
  const [draft, setDraft] = useState<OnboardingDraft>(initialDraft);
  const [stepIndex, setStepIndex] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<VendorApplication | null>(null);
  // After submitting, product sellers pick their starter products before they are done.
  const [stage, setStage] = useState<'form' | 'products' | 'done'>('form');
  const [starterCount, setStarterCount] = useState(0);
  const [saveStarter, saveStarterState] = useSaveStarterProductsMutation();
  const [starterError, setStarterError] = useState<string>();
  const categories = useGetOnboardingCategoriesQuery();
  const [sendOtp, sendState] = useSendOnboardingOtpMutation();
  const [verifyOtp, verifyState] = useVerifyOnboardingOtpMutation();
  const [submit, submitState] = useSubmitApplicationMutation();
  const [otpSent, setOtpSent] = useState(false);
  const [locating, setLocating] = useState(false);

  const steps: { id: StepId; label: string }[] = useMemo(
    () => [
      { id: 'phone', label: 'Mobile' },
      { id: 'business', label: 'Business' },
      { id: 'categories', label: 'Categories' },
      { id: 'address', label: 'Location' },
      ...(draft.businessType === 'service' ? [{ id: 'service' as StepId, label: 'Hours & staff' }] : []),
      { id: 'documents', label: 'Tax & documents' },
      { id: 'review', label: 'Review' },
    ],
    [draft.businessType],
  );
  const progress = draft.businessType === 'product' ? [...steps, { id: 'products' as const, label: 'Starter products' }] : steps;
  const progressIndex = stage === 'form' ? stepIndex : progress.length - 1;
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const set = <K extends keyof OnboardingDraft>(key: K, value: OnboardingDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const flatCategories = useMemo(() => flatten(categories.data ?? []).filter((c) => c.category_type === draft.businessType), [categories.data, draft.businessType]);

  const next = () => {
    const errs = validateStep(step.id, draft);
    setErrors(errs);
    if (Object.keys(errs).length === 0) setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  };

  const onSendOtp = async () => {
    if (!isValidIndianMobile(draft.phone)) return setErrors({ phone: 'Enter a valid 10-digit mobile number.' });
    setErrors({});
    try {
      await sendOtp(normalizeIndianMobile(draft.phone)).unwrap();
      setOtpSent(true);
    } catch (err) {
      setErrors({ phone: isApiError(err) ? err.message : 'Could not send OTP.' });
    }
  };

  const onVerifyOtp = async () => {
    try {
      const res = await verifyOtp({ phone: normalizeIndianMobile(draft.phone), otp: draft.otp }).unwrap();
      if (res.verified) {
        set('phoneVerified', true);
        setErrors({});
      }
    } catch (err) {
      setErrors({ otp: isApiError(err) ? err.message : 'Invalid OTP.' });
    }
  };

  const locate = () => {
    if (!navigator.geolocation) return setErrors({ location: 'Location is not available in this browser.' });
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDraft((d) => ({ ...d, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) }));
        setLocating(false);
      },
      () => {
        setErrors({ location: 'Location permission denied. The address will be geocoded instead.' });
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const onSubmit = async () => {
    const errs = validateStep('review', draft);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      const res = await submit(buildApplicationFormData(draft)).unwrap();
      setSubmitted(res);
      setStage(res.selection_token && res.requires_starter_products !== false ? 'products' : 'done');
      window.scrollTo?.({ top: 0 });
    } catch (err) {
      if (isApiError(err)) setErrors({ submit: err.message, ...err.fieldErrors });
      else setErrors({ submit: 'Submission failed.' });
    }
  };

  const onSaveStarter = async (drafts: StarterDraft[]) => {
    if (!submitted?.selection_token) return;
    setStarterError(undefined);
    try {
      const res = await saveStarter({ id: submitted.id, token: submitted.selection_token, items: toStarterItems(drafts) }).unwrap();
      setStarterCount(res.product_selections?.length ?? drafts.length);
      setStage('done');
      window.scrollTo?.({ top: 0 });
    } catch (err) {
      setStarterError(isApiError(err) ? err.message : 'Could not save your products. Try again.');
    }
  };

  if (submitted && stage === 'done') {
    const needsProducts = draft.businessType === 'product';
    return (
      <div className="flex min-h-full items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardBody className="space-y-4 p-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
            <h1 className="text-xl font-semibold">Application submitted</h1>
            <p className="text-sm text-ink-muted">
              Thank you, {submitted.vendor_name}. Your application for <span className="font-medium">{submitted.business_name}</span> is with the TheNearByShop team for review.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <StatusBadge status={submitted.status || 'pending'} label={`Status: ${titleCaseStatus(submitted.status)}`} />
              {submitted.application_number && <Badge tone="neutral">Ref {submitted.application_number}</Badge>}
            </div>
            {starterCount > 0 && (
              <p className="flex items-center justify-center gap-2 text-sm">
                <Package className="h-4 w-4 text-brand-700" /> {starterCount} starter products saved
              </p>
            )}
            {needsProducts && starterCount === 0 && (
              <BackendGap gap="update" title="Starter products could not be chosen on this server">
                The server needs the self-registration update. The team will help you add products after approval.
              </BackendGap>
            )}
            <p className="text-sm font-medium">You will start selling once the team approves your application.</p>
            <p className="text-xs text-ink-subtle">We will contact you on +91 {normalizeIndianMobile(draft.phone)}. You can check progress any time with your mobile number.</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Link to="/onboarding/status">
                <Button>Check application status</Button>
              </Link>
              <Link to="/login">
                <Button variant="outline">Back to sign in</Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Logo />
          <Link to="/login" className="text-sm font-medium text-brand-700 hover:underline">
            Already registered? Sign in
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="text-xl font-semibold">Register your business</h1>
        <p className="mt-1 text-sm text-ink-muted">Applications are reviewed by TheNearByShop before your shop goes live.</p>
        <ol className="mt-5 flex flex-wrap gap-2" aria-label="Onboarding progress">
          {progress.map((s, i) => {
            const done = i < progressIndex;
            const current = i === progressIndex;
            return (
              <li key={s.id} aria-current={current ? 'step' : undefined}>
                <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium', current ? 'border-brand-600 bg-brand-600 text-white' : done ? 'border-emerald-600 text-emerald-700' : 'border-line text-ink-subtle')}>
                  {done ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>} {s.label}
                </span>
              </li>
            );
          })}
        </ol>

        {stage === 'products' && submitted ? (
          <section className="mt-5 space-y-4" aria-labelledby="starter-heading">
            <div className="rounded-md border border-emerald-600/30 bg-emerald-50/60 p-3 text-sm dark:bg-emerald-900/10">
              <p className="font-medium text-emerald-800 dark:text-emerald-200">
                <Check className="mr-1 inline h-4 w-4" /> Registration saved{submitted.application_number ? ` (ref ${submitted.application_number})` : ''}.
              </p>
              <p className="text-emerald-800/80 dark:text-emerald-200/80">One last step before review.</p>
            </div>
            <div>
              <h2 id="starter-heading" className="text-lg font-semibold">
                Choose at least {minStarterProducts(submitted)} products to start selling
              </h2>
              <p className="text-sm text-ink-muted">
                These go live in your shop when your application is approved. You can add more, and change prices and stock, from the portal later.
              </p>
            </div>
            <StarterProductPicker
              min={minStarterProducts(submitted)}
              categoryIds={draft.categoryIds}
              saving={saveStarterState.isLoading}
              saveLabel="Save and finish"
              error={starterError}
              onSave={onSaveStarter}
            />
          </section>
        ) : (
        <Card className="mt-5">
          <CardBody className="space-y-4">
            {step.id === 'phone' && (
              <>
                <Field label="Mobile number" error={errors.phone} required hint="We verify this number with a one-time password.">
                  <Input inputMode="tel" value={draft.phone} disabled={draft.phoneVerified} onChange={(e) => set('phone', e.target.value)} />
                </Field>
                {draft.phoneVerified ? (
                  <Badge tone="success">
                    <Check className="h-3 w-3" /> Phone verified
                  </Badge>
                ) : (
                  <>
                    <Button variant="outline" onClick={onSendOtp} loading={sendState.isLoading}>
                      {otpSent ? 'Resend OTP' : 'Send OTP'}
                    </Button>
                    {otpSent && (
                      <div className="flex items-end gap-2">
                        <Field label="OTP" error={errors.otp} className="flex-1">
                          <Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={draft.otp} onChange={(e) => set('otp', e.target.value.replace(/\D/g, ''))} />
                        </Field>
                        <Button onClick={onVerifyOtp} loading={verifyState.isLoading} disabled={draft.otp.length < 4}>
                          Verify
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {step.id === 'business' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Your name" error={errors.vendorName} required>
                  <Input value={draft.vendorName} onChange={(e) => set('vendorName', e.target.value)} />
                </Field>
                <Field label="Email" error={errors.email} required>
                  <Input type="email" value={draft.email} onChange={(e) => set('email', e.target.value)} />
                </Field>
                <Field label="Business / shop name" error={errors.businessName} required className="sm:col-span-2">
                  <Input value={draft.businessName} onChange={(e) => set('businessName', e.target.value)} />
                </Field>
                <fieldset className="sm:col-span-2">
                  <legend className="mb-2 text-sm font-medium">Business type</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(
                      [
                        { v: 'product', t: 'I sell products', d: 'Grocery, dairy, bakery, pharmacy, retail…' },
                        { v: 'service', t: 'I provide services', d: 'Electrician, plumber, salon, cleaning, repairs…' },
                      ] as const
                    ).map((o) => (
                      <label key={o.v} className={cn('cursor-pointer rounded-md border p-3', draft.businessType === o.v ? 'border-brand-600 bg-brand-50/50 dark:bg-brand-900/10' : 'border-line')}>
                        <input
                          type="radio"
                          name="btype"
                          className="sr-only"
                          checked={draft.businessType === o.v}
                          onChange={() => setDraft((d) => ({ ...d, businessType: o.v, categoryIds: [] }))}
                        />
                        <span className="block text-sm font-medium">{o.t}</span>
                        <span className="block text-xs text-ink-muted">{o.d}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <BackendGap gap="G-3" title="Business description, logo and delivery/service coverage are set after approval" className="sm:col-span-2" />
              </div>
            )}

            {step.id === 'categories' && (
              <>
                <p className="text-sm text-ink-muted">Choose the categories that describe your {draft.businessType === 'service' ? 'services' : 'products'}.</p>
                {errors.categoryIds && <p className="text-sm text-red-600" role="alert">{errors.categoryIds}</p>}
                {categories.isLoading ? (
                  <Spinner />
                ) : categories.error ? (
                  <ErrorState error={categories.error} onRetry={categories.refetch} />
                ) : (
                  <div className="grid max-h-80 gap-1 overflow-y-auto sm:grid-cols-2">
                    {flatCategories.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-ink/[0.03]" style={{ paddingLeft: 8 + c.depth * 16 }}>
                        <Checkbox
                          checked={draft.categoryIds.includes(c.id)}
                          onChange={(e) => set('categoryIds', e.target.checked ? [...draft.categoryIds, c.id] : draft.categoryIds.filter((x) => x !== c.id))}
                        />
                        {c.name}
                      </label>
                    ))}
                    {flatCategories.length === 0 && <p className="text-sm text-ink-muted">No categories available for this business type.</p>}
                  </div>
                )}
              </>
            )}

            {step.id === 'address' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Shop address" error={errors.address} required className="sm:col-span-2">
                  <Textarea rows={2} value={draft.address} onChange={(e) => set('address', e.target.value)} />
                </Field>
                <Field label="City" error={errors.city} required>
                  <Input value={draft.city} onChange={(e) => set('city', e.target.value)} />
                </Field>
                <Field label="State" error={errors.state} required>
                  <Input value={draft.state} onChange={(e) => set('state', e.target.value)} />
                </Field>
                <Field label="PIN code" error={errors.zipCode} required>
                  <Input inputMode="numeric" maxLength={6} value={draft.zipCode} onChange={(e) => set('zipCode', e.target.value.replace(/\D/g, ''))} />
                </Field>
                <div className="space-y-1.5">
                  <span className="block text-sm font-medium">Map location</span>
                  <Button variant="outline" onClick={locate} loading={locating} leftIcon={<LocateFixed className="h-4 w-4" />}>
                    {draft.latitude ? `${draft.latitude}, ${draft.longitude}` : 'Use my current location'}
                  </Button>
                  {errors.location && <p className="text-xs text-amber-700">{errors.location}</p>}
                  <p className="text-xs text-ink-subtle">Optional — otherwise the address is geocoded by the server.</p>
                </div>
              </div>
            )}

            {step.id === 'service' && (
              <>
                <div>
                  <h2 className="text-sm font-semibold">Opening hours</h2>
                  {errors.shopHours && <p className="text-sm text-red-600" role="alert">{errors.shopHours}</p>}
                  <div className="mt-2 space-y-2">
                    {draft.shopHours.map((h, i) => (
                      <div key={h.day_of_week} className="flex flex-wrap items-center gap-2">
                        <label className="flex w-32 items-center gap-2 text-sm">
                          <Checkbox checked={h.open} onChange={(e) => set('shopHours', draft.shopHours.map((x, j) => (j === i ? { ...x, open: e.target.checked } : x)))} /> {DAYS[h.day_of_week]}
                        </label>
                        <Input type="time" aria-label={`${DAYS[h.day_of_week]} opens`} className="w-32" disabled={!h.open} value={h.start_time} onChange={(e) => set('shopHours', draft.shopHours.map((x, j) => (j === i ? { ...x, start_time: e.target.value } : x)))} />
                        <Input type="time" aria-label={`${DAYS[h.day_of_week]} closes`} className="w-32" disabled={!h.open} value={h.end_time} onChange={(e) => set('shopHours', draft.shopHours.map((x, j) => (j === i ? { ...x, end_time: e.target.value } : x)))} />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold">Employees</h2>
                    <Button size="sm" variant="outline" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => set('employees', [...draft.employees, { client_id: uuid(), full_name: '', phone: '', role: '', specialties: '' }])}>
                      Add employee
                    </Button>
                  </div>
                  {errors.employees && <p className="text-sm text-red-600" role="alert">{errors.employees}</p>}
                  <div className="mt-2 space-y-2">
                    {draft.employees.map((emp, i) => (
                      <div key={emp.client_id} className="grid gap-2 rounded-md border border-line p-2 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                        {(['full_name', 'phone', 'role', 'specialties'] as const).map((k) => (
                          <Input
                            key={k}
                            aria-label={`Employee ${i + 1} ${k.replace('_', ' ')}`}
                            placeholder={{ full_name: 'Full name', phone: 'Mobile', role: 'Role', specialties: 'Specialties (comma separated)' }[k]}
                            value={emp[k]}
                            onChange={(e) => set('employees', draft.employees.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))}
                          />
                        ))}
                        <Button variant="ghost" size="icon" aria-label={`Remove employee ${i + 1}`} onClick={() => set('employees', draft.employees.filter((_, j) => j !== i))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {step.id === 'documents' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="GSTIN / tax ID" error={errors.gstTaxId} hint="Required if your business is GST registered.">
                  <Input className="uppercase" maxLength={15} value={draft.gstTaxId} onChange={(e) => set('gstTaxId', e.target.value.toUpperCase())} />
                </Field>
                <div />
                {(
                  [
                    ['business_license_files', 'Business licence / registration'],
                    ['id_proof_files', 'Owner ID proof (Aadhaar / PAN)'],
                    ['bank_detail_files', 'Bank proof (cancelled cheque / passbook)'],
                    ['supporting_files', 'Other supporting documents'],
                  ] as const
                ).map(([key, label]) => (
                  <Field key={key} label={label} hint={draft.files[key].length ? draft.files[key].map((f) => f.name).join(', ') : 'PDF, JPG or PNG'} error={errors[key]}>
                    <input
                      type="file"
                      multiple
                      accept="application/pdf,image/jpeg,image/png"
                      className="text-sm"
                      onChange={(e) => set('files', { ...draft.files, [key]: Array.from(e.target.files ?? []) })}
                    />
                  </Field>
                ))}
                <fieldset className="grid gap-4 border-t border-line pt-4 sm:col-span-2 sm:grid-cols-2">
                  <legend className="text-sm font-semibold">Payout account (optional)</legend>
                  <p className="text-xs text-ink-muted sm:col-span-2">Where your earnings are paid. You can also add it from Bank accounts after approval.</p>
                  <Field label="Account holder name" error={errors.bankHolder}>
                    <Input autoComplete="name" value={draft.bankHolder} onChange={(e) => set('bankHolder', e.target.value)} />
                  </Field>
                  <Field label="Bank name">
                    <Input value={draft.bankName} onChange={(e) => set('bankName', e.target.value)} />
                  </Field>
                  <Field label="Account number" error={errors.accountNumber}>
                    <Input inputMode="numeric" autoComplete="off" value={draft.accountNumber} onChange={(e) => set('accountNumber', e.target.value.replace(/[^\d\s]/g, ''))} />
                  </Field>
                  <Field label="IFSC" error={errors.ifsc}>
                    <Input className="uppercase" maxLength={11} value={draft.ifsc} onChange={(e) => set('ifsc', e.target.value.toUpperCase())} />
                  </Field>
                  <Field label="UPI ID" error={errors.upiId}>
                    <Input value={draft.upiId} onChange={(e) => set('upiId', e.target.value.trim())} />
                  </Field>
                </fieldset>
              </div>
            )}

            {step.id === 'review' && (
              <div className="space-y-4 text-sm">
                <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                  {[
                    ['Mobile', `+91 ${normalizeIndianMobile(draft.phone)} ${draft.phoneVerified ? '(verified)' : ''}`],
                    ['Name', draft.vendorName],
                    ['Email', draft.email],
                    ['Business', draft.businessName],
                    ['Type', draft.businessType === 'service' ? 'Service provider' : 'Product vendor'],
                    ['Categories', flatCategories.filter((c) => draft.categoryIds.includes(c.id)).map((c) => c.name).join(', ')],
                    ['Address', `${draft.address}, ${draft.city}, ${draft.state} ${draft.zipCode}`],
                    ['GSTIN', draft.gstTaxId || '—'],
                    ['Documents', `${Object.values(draft.files).flat().length} file(s)`],
                    ['Payout account', draft.accountNumber ? `•••• ${draft.accountNumber.replace(/\s/g, '').slice(-4)} · ${draft.ifsc}` : 'Add later'],
                    ...(draft.businessType === 'service' ? [['Employees', String(draft.employees.length)]] : []),
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-ink-subtle">{k}</dt>
                      <dd className="font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>
                <label className="flex items-start gap-2">
                  <Checkbox checked={draft.acceptTerms} onChange={(e) => set('acceptTerms', e.target.checked)} className="mt-0.5" />
                  I confirm the information is correct and agree to TheNearByShop's vendor terms.
                </label>
                {draft.businessType === 'product' && (
                  <p className="rounded-md bg-brand-50/60 p-2 text-ink-muted dark:bg-brand-900/10">
                    Next, you will pick at least 5 products from our catalogue to start selling.
                  </p>
                )}
                {errors.acceptTerms && <p className="text-red-600">{errors.acceptTerms}</p>}
                {errors.submit && (
                  <p role="alert" className="rounded-md bg-red-50 p-2 text-red-700 dark:bg-red-900/20">
                    {errors.submit}
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-between border-t border-line pt-4">
              <Button variant="outline" onClick={() => setStepIndex((i) => Math.max(0, i - 1))} disabled={stepIndex === 0}>
                Back
              </Button>
              {step.id === 'review' ? (
                <Button onClick={onSubmit} loading={submitState.isLoading}>
                  Submit application
                </Button>
              ) : (
                <Button onClick={next} disabled={step.id === 'phone' && !draft.phoneVerified}>
                  Continue
                </Button>
              )}
            </div>
          </CardBody>
        </Card>
        )}
      </main>
    </div>
  );
}
