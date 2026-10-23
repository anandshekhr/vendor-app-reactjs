import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button, Field, Input } from '@/components/ui';
import { useAppDispatch } from '@/hooks/store';
import { isApiError } from '@/services/api/errors';
import { tokenStorage } from '@/services/auth/tokenStorage';
import { maskPhone } from '@/utils/format';
import { useRequestLoginOtpMutation, useVerifyLoginOtpMutation } from './api';
import { signedIn } from './authSlice';
import { AuthLayout } from './AuthLayout';
import { PENDING_PHONE_KEY } from './LoginPage';

const RESEND_SECONDS = 60;

export function VerifyOtpPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const state = location.state as { phone?: string; from?: string } | null;
  const phone = state?.phone ?? sessionStorage.getItem(PENDING_PHONE_KEY) ?? '';
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState<{ tone: 'error' | 'info'; text: string; notVendor?: boolean } | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  const [verify, { isLoading }] = useVerifyLoginOtpMutation();
  const [resend, { isLoading: resending }] = useRequestLoginOtpMutation();

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  if (!phone) return <Navigate to="/login" replace />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4,6}$/.test(otp)) {
      setMessage({ tone: 'error', text: 'Enter the OTP you received.' });
      return;
    }
    setMessage(null);
    try {
      const res = await verify({ phone, otp }).unwrap();
      tokenStorage.setAccess(res.token.access);
      tokenStorage.setRefresh(res.token.refresh);
      tokenStorage.setSession({ userId: res.user_id, vendorId: res.vendorUserId, phone });
      sessionStorage.removeItem(PENDING_PHONE_KEY);
      dispatch(signedIn({ userId: res.user_id, vendorId: res.vendorUserId, phone }));
      navigate(state?.from && state.from !== '/login' ? state.from : '/dashboard', { replace: true });
    } catch (err) {
      if (isApiError(err) && err.status === 403) {
        setMessage({ tone: 'error', text: 'This number has no active vendor account yet. New applications can sign in once approved.', notVendor: true });
      } else {
        setMessage({ tone: 'error', text: isApiError(err) ? err.message : 'Verification failed.' });
      }
    }
  };

  const onResend = async () => {
    try {
      await resend({ phone }).unwrap();
      setCooldown(RESEND_SECONDS);
      setMessage({ tone: 'info', text: 'A new OTP has been sent.' });
    } catch (err) {
      setMessage({ tone: 'error', text: isApiError(err) ? err.message : 'Could not resend OTP.' });
    }
  };

  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold tracking-tight">Enter OTP</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Sent to +91 {maskPhone(phone)}.{' '}
        <Link to="/login" className="font-medium text-brand-700 hover:underline">
          Change number
        </Link>
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <Field label="One-time password" required>
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            className="text-center text-lg tracking-[0.5em]"
            autoFocus
          />
        </Field>
        {message && (
          <div role={message.tone === 'error' ? 'alert' : 'status'} className={message.tone === 'error' ? 'text-sm text-red-600' : 'text-sm text-emerald-700'}>
            {message.text}
            {message.notVendor && (
              <>
                {' '}
                <Link to="/onboarding" className="font-medium underline">
                  Register your business
                </Link>{' '}
                or{' '}
                <Link to="/onboarding/status" className="font-medium underline">
                  check your application
                </Link>
                .
              </>
            )}
          </div>
        )}
        <Button type="submit" size="lg" className="w-full" loading={isLoading}>
          Verify and sign in
        </Button>
        <Button variant="ghost" className="w-full" onClick={onResend} disabled={cooldown > 0} loading={resending}>
          {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
        </Button>
      </form>
    </AuthLayout>
  );
}
