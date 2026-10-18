import { useEffect, useRef } from 'react';

/**
 * USB/Bluetooth barcode scanners act as keyboards: they type the code very quickly and press Enter.
 * This captures such bursts globally (when focus is not in a text field) so scanning works without clicking first.
 */
export function useKeyboardWedge(onScan: (code: string) => void, { enabled = true, minLength = 4, maxGapMs = 40 } = {}) {
  const buffer = useRef('');
  const lastAt = useRef(0);
  const cb = useRef(onScan);
  cb.current = onScan;

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);
      if (typing && !target?.dataset.scannerInput) return;
      const now = performance.now();
      if (now - lastAt.current > maxGapMs * 5) buffer.current = '';
      lastAt.current = now;
      if (e.key === 'Enter') {
        const code = buffer.current;
        buffer.current = '';
        if (code.length >= minLength) {
          e.preventDefault();
          cb.current(code);
        }
        return;
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) buffer.current += e.key;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, minLength, maxGapMs]);
}
