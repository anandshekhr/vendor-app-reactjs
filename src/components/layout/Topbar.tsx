import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ChevronDown, LogOut, Menu, Settings, ShieldAlert, ShieldCheck, Store, Wifi, WifiOff } from 'lucide-react';
import { setMobileNav } from '@/app/uiSlice';
import { useAppDispatch, useAppSelector } from '@/hooks/store';
import { useNavBadges } from '@/hooks/useNavBadges';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useLogout } from '@/features/auth/useLogout';
import { initials } from '@/utils/format';
import { Badge } from '@/components/ui';

function UserMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const business = useAppSelector((s) => s.auth.business);
  const logout = useLogout();
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-ink/5"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">{initials(business?.businessName)}</span>
        <ChevronDown className="hidden h-4 w-4 text-ink-subtle sm:block" aria-hidden />
        <span className="sr-only">Account menu</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-56 rounded-lg border border-line bg-surface p-1 shadow-pop">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium">{business?.businessName}</p>
            <p className="truncate text-xs text-ink-subtle">{business?.phone}</p>
          </div>
          <div className="my-1 border-t border-line" />
          <Link role="menuitem" to="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-ink/5">
            <Store className="h-4 w-4" /> Business profile
          </Link>
          <Link role="menuitem" to="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-ink/5">
            <Settings className="h-4 w-4" /> Settings
          </Link>
          <button role="menuitem" type="button" onClick={() => void logout()} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function Topbar() {
  const dispatch = useAppDispatch();
  const business = useAppSelector((s) => s.auth.business);
  const online = useOnlineStatus();
  const badges = useNavBadges();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-surface/95 px-3 backdrop-blur sm:px-5">
      <button type="button" className="rounded-md p-2 text-ink-muted hover:bg-ink/5 lg:hidden" onClick={() => dispatch(setMobileNav(true))} aria-label="Open navigation">
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <h2 className="truncate text-sm font-semibold">{business?.shopName}</h2>
        {business &&
          (business.isVerified ? (
            <Badge tone="success" className="hidden sm:inline-flex">
              <ShieldCheck className="h-3 w-3" /> Verified
            </Badge>
          ) : (
            <Link to="/profile/documents" className="hidden sm:inline-flex">
              <Badge tone="warning">
                <ShieldAlert className="h-3 w-3" /> Verification pending
              </Badge>
            </Link>
          ))}
      </div>
      <span className={`hidden items-center gap-1 text-xs font-medium sm:flex ${online ? 'text-emerald-600' : 'text-amber-600'}`} role="status">
        {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
        {online ? 'Online' : 'Offline'}
      </span>
      <Link to="/notifications" className="relative rounded-md p-2 text-ink-muted hover:bg-ink/5 hover:text-ink" aria-label={`Notifications${badges.notifications ? `, ${badges.notifications} unread` : ''}`}>
        <Bell className="h-5 w-5" />
        {badges.notifications ? <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand-600" aria-hidden /> : null}
      </Link>
      <UserMenu />
    </header>
  );
}
