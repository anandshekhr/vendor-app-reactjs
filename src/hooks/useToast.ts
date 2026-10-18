import { useCallback, useMemo } from 'react';
import { pushToast } from '@/app/uiSlice';
import { errorMessage } from '@/services/api/errors';
import { useAppDispatch } from './store';

export function useToast() {
  const dispatch = useAppDispatch();
  const success = useCallback((title: string, description?: string) => dispatch(pushToast({ tone: 'success', title, description })), [dispatch]);
  const error = useCallback(
    (title: string, err?: unknown) => dispatch(pushToast({ tone: 'error', title, description: err ? errorMessage(err) : undefined })),
    [dispatch],
  );
  const info = useCallback((title: string, description?: string) => dispatch(pushToast({ tone: 'info', title, description })), [dispatch]);
  const warning = useCallback((title: string, description?: string) => dispatch(pushToast({ tone: 'warning', title, description })), [dispatch]);
  return useMemo(() => ({ success, error, info, warning }), [success, error, info, warning]);
}
