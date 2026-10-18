import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { setMobileNav, toggleSidebar } from '@/app/uiSlice';
import { useAppDispatch, useAppSelector } from '@/hooks/store';
import { Drawer, FullPageSpinner } from '@/components/ui';
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary';
import { OfflineBanner } from '@/components/feedback/OfflineBanner';
import { useActivityPolling } from '@/features/notifications/useActivityPolling';
import { useOfflineSync } from '@/features/offline-sync/useOfflineSync';
import { Sidebar, SidebarNav } from './Sidebar';
import { Topbar } from './Topbar';
import { Logo } from './Logo';

export function AppShell() {
  const dispatch = useAppDispatch();
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed);
  const mobileOpen = useAppSelector((s) => s.ui.mobileNavOpen);
  const location = useLocation();
  useActivityPolling();
  useOfflineSync();

  useEffect(() => {
    dispatch(setMobileNav(false));
  }, [location.pathname, dispatch]);

  return (
    <div className="flex h-full">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>
      <Sidebar collapsed={collapsed} onToggle={() => dispatch(toggleSidebar())} />
      <Drawer open={mobileOpen} onClose={() => dispatch(setMobileNav(false))} title={<Logo />} side="left" widthClass="w-72 max-w-[85vw]">
        <SidebarNav onNavigate={() => dispatch(setMobileNav(false))} />
      </Drawer>
      <div className="flex min-w-0 flex-1 flex-col">
        <OfflineBanner />
        <Topbar />
        <main id="main" className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1400px] px-3 py-5 sm:px-5 lg:px-6">
            <ErrorBoundary resetKey={location.pathname}>
              <Suspense fallback={<FullPageSpinner />}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
