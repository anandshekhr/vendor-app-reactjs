/**
 * Cameras decode the same barcode many times per second. This gate passes a code once, then ignores identical reads
 * until `windowMs` has elapsed since the last accepted read of that code.
 */
export function createScanGate(windowMs = 1500, now: () => number = Date.now) {
  let lastCode: string | null = null;
  let lastAt = 0;
  return (code: string): boolean => {
    const t = now();
    if (code === lastCode && t - lastAt < windowMs) return false;
    lastCode = code;
    lastAt = t;
    return true;
  };
}

export function normalizeBarcode(raw: string): string {
  return raw.replace(/[\r\n\t]/g, '').trim();
}
