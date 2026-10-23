import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LogIn, Package, Pencil } from 'lucide-react';
import { Badge, Button, Card, CardBody, CardHeader, Field, Input } from '@/components/ui';
import { Logo } from '@/components/layout/Logo';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { isApiError } from '@/services/api/errors';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { isValidIndianMobile, normalizeIndianMobile } from '@/utils/phone';
import type { ApplicantApplication } from '@/types/api';
import { useLookupApplicationsMutation, useSaveStarterProductsMutation, useSendOnboardingOtpMutation } from './api';
import { StarterProductPicker } from './StarterProductPicker';
import { applicantStatusText, draftsFromSelections, minStarterProducts, toStarterItems, type StarterDraft } from './starterProducts';

const STATUS_TONE: Record<string, string> = { approved: 'active', active: 'active', enrolled: 'active', rejected: 'rejected', suspended: 'failed' };

/** Lets an applicant check their application with their mobile number and finish or change their starter products. */
export function ApplicationStatusPage() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState<string>();
  const [applications, setApplications] = useState<ApplicantApplication[] | null>(null);
  const [editing, setEditing] = useState<ApplicantApplication | null>(null);
  const [saveError, setSaveError] = useState<string>();
  const [saved, setSaved] = useState<number | null>(null);
  const [sendOtp, sendState] = useSendOnboardingOtpMutation();
  const [lookup, lookupState] = useLookupApplicationsMutation();
  const [saveStarter, saveState] = useSaveStarterProductsMutation();

  const onSend = async () => {
    if (!isValidIndianMobile(phone)) return setError('Enter a valid 10-digit mobile number.');
    setError(undefined);
    try {
      await sendOtp(normalizeIndianMobile(phone)).unwrap();
      setOtpSent(true);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not send OTP.');
    }
  };

  const onLookup = async () => {
    setError(undefined);
    try {
      const res = await lookup({ phone: normalizeIndianMobile(phone), otp }).unwrap();
      setApplications(res.applications);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not check your application.');
    }
  };

  const onSave = async (drafts: StarterDraft[]) => {
    if (!editing?.selection_token) return;
    setSaveError(undefined);
    try {
      const updated = await saveStarter({ id: editing.id, token: editing.selection_token, items: toStarterItems(drafts) }).unwrap();
      // Keep the token from the lookup; the update response issues a fresh one too.
      setApplications((apps) => apps?.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)) ?? null);
      setSaved(updated.id);
      setEditing(null);
    } catch (err) {
      setSaveError(isApiError(err) ? err.message : 'Could not save your products.');
    }
  };

  return (
    <div className="min-h-full bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Logo />
          <Link to="/login" className="text-sm font-medium text-brand-700 hover:underline">
            Sign in
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl space-y-5 px-4 py-6">
        <div>
          <h1 className="text-xl font-semibold">Application status</h1>
          <p className="mt-1 text-sm text-ink-muted">Check your registration with the mobile number you applied with.</p>
        </div>

        {applications === null ? (
          <Card className="max-w-md">
            <CardBody className="space-y-4">
              <Field label="Mobile number" required>
                <Input inputMode="tel" autoComplete="tel-national" value={phone} disabled={otpSent} onChange={(e) => setPhone(e.target.value)} />
              </Field>
              {otpSent ? (
                <>
                  <Field label="OTP" hint={`Sent to +91 ${normalizeIndianMobile(phone)}`}>
                    <Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} />
                  </Field>
                  <div className="flex gap-2">
                    <Button onClick={onLookup} loading={lookupState.isLoading} disabled={otp.length < 4}>
                      Check status
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setOtpSent(false);
                        setOtp('');
                      }}
                    >
                      Change number
                    </Button>
                  </div>
                </>
              ) : (
                <Button onClick={onSend} loading={sendState.isLoading}>
                  Send OTP
                </Button>
              )}
              {error && (
                <p role="alert" className="text-sm text-red-600">
                  {error}
                </p>
              )}
            </CardBody>
          </Card>
        ) : editing ? (
          <section className="space-y-4" aria-labelledby="edit-heading">
            <div>
              <h2 id="edit-heading" className="text-lg font-semibold">
                Starter products for {editing.business_name}
              </h2>
              <p className="text-sm text-ink-muted">Choose at least {minStarterProducts(editing)}. Saving replaces your previous choice.</p>
            </div>
            <StarterProductPicker
              min={minStarterProducts(editing)}
              initial={draftsFromSelections(editing.product_selections ?? [])}
              saving={saveState.isLoading}
              error={saveError}
              onSave={onSave}
              onCancel={() => setEditing(null)}
            />
          </section>
        ) : applications.length === 0 ? (
          <Card>
            <CardBody className="space-y-3 text-sm">
              <p>No applications were found for +91 {normalizeIndianMobile(phone)}.</p>
              <Link to="/onboarding">
                <Button>Register your business</Button>
              </Link>
            </CardBody>
          </Card>
        ) : (
          applications.map((app) => <ApplicationCard key={app.id} app={app} justSaved={saved === app.id} onEdit={() => setEditing(app)} />)
        )}
      </main>
    </div>
  );
}

function ApplicationCard({ app, justSaved, onEdit }: { app: ApplicantApplication; justSaved: boolean; onEdit: () => void }) {
  const selections = app.product_selections ?? [];
  const min = minStarterProducts(app);
  const short = app.requires_starter_products && selections.length < min;
  return (
    <Card>
      <CardHeader
        title={app.business_name}
        description={`${app.application_number ? `Ref ${app.application_number} · ` : ''}Applied ${formatDateTime(app.created_at)}`}
        actions={<StatusBadge status={STATUS_TONE[app.status] ?? 'pending'} label={app.status_display || app.status} />}
      />
      <CardBody className="space-y-4 text-sm">
        <p className="font-medium">{applicantStatusText(app)}</p>
        {(app.admin_review_note || app.requested_documents_note) && (
          <div className="rounded-md bg-ink/[0.03] p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-subtle">Note from TheNearByShop</p>
            {app.admin_review_note && <p className="mt-1 whitespace-pre-line">{app.admin_review_note}</p>}
            {app.requested_documents_note && <p className="mt-1 whitespace-pre-line">{app.requested_documents_note}</p>}
          </div>
        )}

        {app.requires_starter_products && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-semibold">
                <Package className="h-4 w-4" /> Starter products ({selections.length})
              </h3>
              {app.can_edit_products && app.selection_token && (
                <Button size="sm" variant={short ? 'primary' : 'outline'} leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={onEdit}>
                  {selections.length ? 'Change products' : 'Choose products'}
                </Button>
              )}
            </div>
            {justSaved && <Badge tone="success">Saved</Badge>}
            {short && (
              <p role="alert" className="rounded-md bg-amber-50 p-2 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                Choose at least {min} products. Your application can't be approved until you do.
              </p>
            )}
            {selections.length > 0 && (
              <ul className="divide-y divide-line rounded-md border border-line">
                {selections.map((s) => (
                  <li key={s.master_product_id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="min-w-0 truncate">{s.name}</span>
                    <span className="shrink-0 text-xs text-ink-muted tabular">
                      {formatCurrency(s.price ?? s.catalogue_price)} · stock {s.opening_stock}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {app.can_sign_in && (
          <Link to="/login">
            <Button leftIcon={<LogIn className="h-4 w-4" />}>Sign in to your shop</Button>
          </Link>
        )}
      </CardBody>
    </Card>
  );
}
