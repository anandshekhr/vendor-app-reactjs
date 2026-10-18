import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { IScannerControls } from '@zxing/browser';
import { Camera, CameraOff, Keyboard } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { CameraError, startCameraScanner } from '@/services/scanner/camera';
import { createScanGate, normalizeBarcode } from '@/services/scanner/dedupe';
import { useKeyboardWedge } from '@/services/scanner/useKeyboardWedge';
import { cn } from '@/utils/cn';

export interface BarcodeScannerProps {
  onScan: (code: string) => void;
  /** Ignore identical reads within this window (ms). */
  dedupeMs?: number;
  className?: string;
  compact?: boolean;
  autoStartCamera?: boolean;
  disabled?: boolean;
}

/**
 * Camera + handheld-scanner + manual entry. The camera stays open for continuous scanning.
 */
export function BarcodeScanner({ onScan, dedupeMs = 1500, className, compact, autoStartCamera = false, disabled }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controls = useRef<IScannerControls | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [starting, setStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manual, setManual] = useState('');
  const gate = useMemo(() => createScanGate(dedupeMs), [dedupeMs]);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const emit = useCallback(
    (raw: string, force = false) => {
      const code = normalizeBarcode(raw);
      if (!code || disabled) return;
      if (force || gate(code)) {
        if ('vibrate' in navigator) navigator.vibrate?.(40);
        onScanRef.current(code);
      }
    },
    [gate, disabled],
  );

  useKeyboardWedge((code) => emit(code, true), { enabled: !disabled });

  const stop = useCallback(() => {
    controls.current?.stop();
    controls.current = null;
    setCameraOn(false);
  }, []);

  const start = useCallback(async () => {
    if (!videoRef.current) return;
    setStarting(true);
    setCameraError(null);
    try {
      controls.current = await startCameraScanner(videoRef.current, (code) => emit(code));
      setCameraOn(true);
    } catch (err) {
      setCameraError(err instanceof CameraError ? err.message : 'Could not start the camera.');
    } finally {
      setStarting(false);
    }
  }, [emit]);

  useEffect(() => {
    if (autoStartCamera) void start();
    return () => controls.current?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={cn('space-y-3', className)}>
      <div className={cn('relative overflow-hidden rounded-lg bg-black', compact ? 'aspect-[16/7]' : 'aspect-video', !cameraOn && 'hidden')}>
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline aria-label="Camera preview" />
        <div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-brand-500/80 shadow-[0_0_12px_rgba(194,60,60,0.9)]" aria-hidden />
      </div>
      <div className="flex flex-wrap gap-2">
        {cameraOn ? (
          <Button variant="outline" onClick={stop} leftIcon={<CameraOff className="h-4 w-4" />}>
            Stop camera
          </Button>
        ) : (
          <Button variant="outline" onClick={start} loading={starting} leftIcon={<Camera className="h-4 w-4" />} disabled={disabled}>
            Scan with camera
          </Button>
        )}
        <form
          className="flex min-w-[220px] flex-1 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            emit(manual, true);
            setManual('');
          }}
        >
          <div className="relative flex-1">
            <Keyboard className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
            <Input
              data-scanner-input="true"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="Type or scan a barcode"
              aria-label="Barcode"
              className="pl-8"
              autoComplete="off"
              disabled={disabled}
            />
          </div>
          <Button type="submit" variant="secondary" disabled={!manual.trim() || disabled}>
            Look up
          </Button>
        </form>
      </div>
      {cameraError && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {cameraError}
        </p>
      )}
      {!compact && <p className="text-xs text-ink-subtle">Handheld USB/Bluetooth scanners work anywhere on this page — just scan.</p>}
    </div>
  );
}
