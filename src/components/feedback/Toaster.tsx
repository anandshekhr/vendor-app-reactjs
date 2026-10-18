import { useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { dismissToast, type Toast } from '@/app/uiSlice';
import { useAppDispatch, useAppSelector } from '@/hooks/store';
import { cn } from '@/utils/cn';

const icons = { success: CheckCircle2, error: AlertCircle, info: Info, warning: TriangleAlert };
const colors = { success: 'text-emerald-600', error: 'text-red-600', info: 'text-sky-600', warning: 'text-amber-600' };

function ToastItem({ toast }: { toast: Toast }) {
  const dispatch = useAppDispatch();
  useEffect(() => {
    const id = window.setTimeout(() => dispatch(dismissToast(toast.id)), toast.tone === 'error' ? 8000 : 4500);
    return () => window.clearTimeout(id);
  }, [dispatch, toast.id, toast.tone]);
  const Icon = icons[toast.tone];
  return (
    <div className="pointer-events-auto flex w-full max-w-sm gap-3 rounded-lg border border-line bg-surface p-3 shadow-pop" role={toast.tone === 'error' ? 'alert' : 'status'}>
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', colors[toast.tone])} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{toast.title}</p>
        {toast.description && <p className="mt-0.5 break-words text-xs text-ink-muted">{toast.description}</p>}
      </div>
      <button type="button" onClick={() => dispatch(dismissToast(toast.id))} className="text-ink-subtle hover:text-ink" aria-label="Dismiss notification">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function Toaster() {
  const toasts = useAppSelector((s) => s.ui.toasts);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
