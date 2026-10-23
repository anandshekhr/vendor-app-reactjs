import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Phone } from 'lucide-react';
import { Button, Field, Input } from '@/components/ui';
import { useAppSelector } from '@/hooks/store';
import { errorMessage } from '@/services/api/errors';
import { isValidIndianMobile, normalizeIndianMobile } from '@/utils/phone';
import { useRequestLoginOtpMutation } from './api';
import { AuthLayout } from './AuthLayout';

const schema = z.object({
  phone: z.string().trim().refine(isValidIndianMobile, 'Enter a valid 10-digit mobile number.'),
});

export const PENDING_PHONE_KEY = 'tnbs.login.phone';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const reason = useAppSelector((s) => s.auth.signOutReason);
  const [requestOtp, { isLoading, error }] = useRequestLoginOtpMutation();
  const { register, handleSubmit, formState } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { phone: '' } });

  const onSubmit = handleSubmit(async ({ phone }) => {
    const normalized = normalizeIndianMobile(phone);
    try {
      await requestOtp({ phone: normalized }).unwrap();
      sessionStorage.setItem(PENDING_PHONE_KEY, normalized);
      navigate('/verify-otp', { state: { phone: normalized, from: (location.state as { from?: string } | null)?.from } });
    } catch {
      /* error rendered below */
    }
  });

  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-1 text-sm text-ink-muted">We will send a one-time password to your registered mobile number on WhatsApp.</p>
      {reason && (
        <p role="status" className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
          {reason}
        </p>
      )}
      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <Field label="Mobile number" error={formState.errors.phone?.message} required controlId="login-phone">
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center gap-1.5 text-sm text-ink-muted">
              <Phone className="h-4 w-4" aria-hidden /> +91
            </span>
            <Input id="login-phone" aria-invalid={formState.errors.phone ? true : undefined} type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="98765 43210" className="pl-16" {...register('phone')} />
          </div>
        </Field>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {errorMessage(error)}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" loading={isLoading}>
          Send OTP
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-muted">
        New to TheNearByShop?{' '}
        <Link to="/onboarding" className="font-medium text-brand-700 hover:underline">
          Register your business
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-ink-muted">
        Already applied?{' '}
        <Link to="/onboarding/status" className="font-medium text-brand-700 hover:underline">
          Check application status
        </Link>
      </p>
    </AuthLayout>
  );
}
