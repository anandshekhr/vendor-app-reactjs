import type { ReactNode } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-full lg:grid-cols-2">
      <div className="flex flex-col justify-center px-4 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-sm">
          <Logo />
          <div className="mt-8">{children}</div>
        </div>
      </div>
      <div className="hidden flex-col justify-between bg-brand-700 p-10 text-white lg:flex">
        <p className="text-sm font-medium text-brand-100">TheNearByShop for Business</p>
        <div>
          <h2 className="text-3xl font-semibold leading-tight">Run your shop or service business from one place.</h2>
          <ul className="mt-6 space-y-3 text-sm text-brand-50">
            {['Orders, deliveries and in-store POS', 'Stock, barcode scanning and offline sales', 'Bookings, staff and availability', 'Wallet, payouts and reports'].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-brand-200" aria-hidden /> {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-brand-200">© {new Date().getFullYear()} TheNearByShop</p>
      </div>
    </div>
  );
}
