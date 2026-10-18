import { useEffect, useState } from 'react';
import { liveQuery } from 'dexie';

/** Minimal equivalent of dexie-react-hooks' useLiveQuery: re-runs `querier` whenever the tables it reads change. */
export function useLiveQuery<T>(querier: () => Promise<T> | T, deps: unknown[], initial: T): T {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    const subscription = liveQuery(querier).subscribe({
      next: (v) => setValue(v),
      error: (e) => console.error('IndexedDB query failed', e),
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return value;
}
