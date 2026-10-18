import type { IScannerControls } from '@zxing/browser';

export type CameraErrorKind = 'permission' | 'no-camera' | 'insecure' | 'unsupported' | 'unknown';

export class CameraError extends Error {
  constructor(public kind: CameraErrorKind, message: string) {
    super(message);
  }
}

function classify(error: unknown): CameraError {
  const name = (error as { name?: string })?.name ?? '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return new CameraError('permission', 'Camera permission was denied. Allow camera access in your browser settings, or use a handheld scanner / manual entry.');
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return new CameraError('no-camera', 'No camera was found on this device.');
  if (name === 'NotReadableError') return new CameraError('unknown', 'The camera is in use by another application.');
  return new CameraError('unknown', error instanceof Error ? error.message : 'Could not start the camera.');
}

/**
 * Starts continuous decoding from the rear camera into `video`. The camera stays open between scans
 * (continuous scanning); call `stop()` on the returned controls when done.
 */
export async function startCameraScanner(video: HTMLVideoElement, onCode: (code: string, format: string) => void): Promise<IScannerControls> {
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    throw new CameraError('insecure', 'Camera scanning requires HTTPS (or localhost).');
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new CameraError('unsupported', 'This browser does not support camera access.');
  }
  // Loaded lazily so the ZXing bundle is only fetched when a camera is actually used.
  const { BrowserMultiFormatReader } = await import('@zxing/browser');
  const reader = new BrowserMultiFormatReader(undefined, { delayBetweenScanAttempts: 120, delayBetweenScanSuccess: 300 });
  try {
    return await reader.decodeFromConstraints({ video: { facingMode: { ideal: 'environment' } }, audio: false }, video, (result) => {
      if (result) onCode(result.getText(), String(result.getBarcodeFormat()));
    });
  } catch (error) {
    throw classify(error);
  }
}
