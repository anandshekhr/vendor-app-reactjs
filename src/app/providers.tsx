import { useEffect, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { Toaster } from '@/components/feedback/Toaster';
import { useSessionBootstrap } from '@/features/auth/useSessionBootstrap';
import { useAppSelector } from '@/hooks/store';
import type { AppStore } from './store';

function ThemeSync() {
  const theme = useAppSelector((s) => s.ui.theme);
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media?.matches);
      document.documentElement.classList.toggle('dark', Boolean(dark));
    };
    apply();
    media?.addEventListener?.('change', apply);
    return () => media?.removeEventListener?.('change', apply);
  }, [theme]);
  return null;
}

function SessionBootstrap() {
  useSessionBootstrap();
  return null;
}

export function AppProviders({ store, children }: { store: AppStore; children: ReactNode }) {
  return (
    <Provider store={store}>
      <ThemeSync />
      <SessionBootstrap />
      {children}
      <Toaster />
    </Provider>
  );
}
