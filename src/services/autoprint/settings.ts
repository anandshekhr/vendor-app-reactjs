import { useSyncExternalStore } from 'react';
import type { PaperSize } from './document';

/**
 * Printer setup is per device (each counter has its own printer), so it lives in this browser's localStorage, not on
 * the server. Every read/write is guarded: storage can be unavailable (private mode, blocked site data).
 */
export type PrinterConnection = 'browser' | 'usb' | 'serial';

export interface AutoPrintEvents {
  /** A new online order arrives (order slip for packing). */
  newOrder: boolean;
  /** You accept an order (order slip). */
  acceptedOrder: boolean;
  /** A POS sale is completed (customer receipt). */
  posSale: boolean;
  /** A new service booking arrives (booking slip). */
  newBooking: boolean;
}

export interface PrinterSettings {
  /** Master switch for automatic printing. Manual "Print" buttons always work. */
  autoPrint: boolean;
  connection: PrinterConnection;
  paper: PaperSize;
  copies: number;
  events: AutoPrintEvents;
  /** Serial baud rate (Bluetooth/serial thermal printers are usually 9600 or 115200). */
  baudRate: number;
  /** Cut the paper after each slip (printers without a cutter ignore it). */
  cut: boolean;
  /** Name of the remembered USB/serial device, for display. */
  deviceLabel?: string;
}

export const DEFAULT_PRINTER_SETTINGS: PrinterSettings = {
  autoPrint: false,
  connection: 'browser',
  paper: '80mm',
  copies: 1,
  events: { newOrder: true, acceptedOrder: false, posSale: true, newBooking: false },
  baudRate: 9600,
  cut: true,
};

const KEY = 'tnbs.printer.settings';
const listeners = new Set<() => void>();
let cached: PrinterSettings | null = null;

export function loadPrinterSettings(): PrinterSettings {
  if (cached) return cached;
  let value = DEFAULT_PRINTER_SETTINGS;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PrinterSettings>;
      value = { ...DEFAULT_PRINTER_SETTINGS, ...parsed, events: { ...DEFAULT_PRINTER_SETTINGS.events, ...parsed.events } };
    }
  } catch {
    /* storage unavailable or corrupt: defaults */
  }
  cached = sanitize(value);
  return cached;
}

function sanitize(s: PrinterSettings): PrinterSettings {
  return {
    ...s,
    copies: Math.min(3, Math.max(1, Math.round(Number(s.copies) || 1))),
    paper: (['58mm', '80mm', 'a4'] as const).includes(s.paper) ? s.paper : '80mm',
    connection: (['browser', 'usb', 'serial'] as const).includes(s.connection) ? s.connection : 'browser',
    baudRate: Number(s.baudRate) || 9600,
  };
}

export function savePrinterSettings(next: PrinterSettings) {
  cached = sanitize(next);
  try {
    localStorage.setItem(KEY, JSON.stringify(cached));
  } catch {
    /* kept for this session only */
  }
  listeners.forEach((l) => l());
}

export function updatePrinterSettings(patch: Partial<PrinterSettings>) {
  const current = loadPrinterSettings();
  savePrinterSettings({ ...current, ...patch, events: { ...current.events, ...patch.events } });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cached = null;
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function usePrinterSettings(): PrinterSettings {
  return useSyncExternalStore(subscribe, loadPrinterSettings, loadPrinterSettings);
}

/** Test hook: forget the in-memory copy. */
export function resetPrinterSettingsCache() {
  cached = null;
}
