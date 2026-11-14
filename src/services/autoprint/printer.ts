import { useSyncExternalStore } from 'react';
import type { PrintDocument } from './document';
import { encodeEscPos } from './escpos';
import { renderHtml } from './html';
import { loadPrinterSettings, type PrinterSettings } from './settings';
import { printHtml, writeSerial, writeUsb } from './transports';

/** Sends a document to the configured printer (all copies). Throws when the printer can't be reached. */
export async function printDocument(doc: PrintDocument, settings: PrinterSettings = loadPrinterSettings()): Promise<void> {
  if (settings.connection === 'browser') {
    await printHtml(renderHtml(doc, settings.paper, settings.copies));
    return;
  }
  const bytes = encodeEscPos(doc, settings.paper, { cut: settings.cut });
  for (let i = 0; i < settings.copies; i++) {
    if (settings.connection === 'usb') await writeUsb(bytes);
    else await writeSerial(bytes, settings.baudRate);
  }
}

// ─── Print log (this device) ────────────────────────────────────────────────

export interface PrintLogEntry {
  /** Stable key of what was printed, e.g. `order:1093:new` -- also the dedupe key for auto-print. */
  key: string;
  title: string;
  at: number;
  ok: boolean;
  error?: string;
  auto: boolean;
  /** Kept so the slip can be reprinted from Printer settings. */
  doc?: PrintDocument;
}

const LOG_KEY = 'tnbs.printer.log';
const LOG_SIZE = 50;
const logListeners = new Set<() => void>();
let logCache: PrintLogEntry[] | null = null;

export function readPrintLog(): PrintLogEntry[] {
  if (logCache) return logCache;
  try {
    logCache = JSON.parse(localStorage.getItem(LOG_KEY) ?? '[]') as PrintLogEntry[];
  } catch {
    logCache = [];
  }
  return logCache;
}

function appendLog(entry: PrintLogEntry) {
  logCache = [entry, ...readPrintLog().filter((e) => !(e.key === entry.key && !e.ok && entry.ok))].slice(0, LOG_SIZE);
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(logCache));
  } catch {
    /* session only */
  }
  logListeners.forEach((l) => l());
}

export function usePrintLog(): PrintLogEntry[] {
  return useSyncExternalStore(
    (l) => {
      logListeners.add(l);
      return () => logListeners.delete(l);
    },
    readPrintLog,
    readPrintLog,
  );
}

// ─── Auto-print dedupe across tabs ──────────────────────────────────────────

const CLAIM_PREFIX = 'tnbs.printer.claim:';
const CLAIM_TTL_MS = 7 * 24 * 3600_000;

/**
 * Claims a print job so it happens once per device, even with the portal open in several tabs: the first tab to
 * write the claim wins (localStorage writes are synchronous within an origin). Old claims expire after a week.
 */
export function claimPrintJob(key: string, now = Date.now()): boolean {
  try {
    const existing = localStorage.getItem(CLAIM_PREFIX + key);
    if (existing && now - Number(existing) < CLAIM_TTL_MS) return false;
    localStorage.setItem(CLAIM_PREFIX + key, String(now));
    pruneClaims(now);
    return true;
  } catch {
    return true; // no storage: better to print than to miss an order
  }
}

function pruneClaims(now: number) {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k?.startsWith(CLAIM_PREFIX) && now - Number(localStorage.getItem(k)) >= CLAIM_TTL_MS) localStorage.removeItem(k);
  }
}

/**
 * Prints and records the outcome in the log. With `auto`, prints only if this job hasn't been printed on this device
 * yet. Returns false when skipped or failed (never throws, so callers in background loops stay simple).
 */
export async function runPrintJob(key: string, build: () => Promise<PrintDocument> | PrintDocument, opts: { auto: boolean }): Promise<boolean> {
  if (opts.auto && !claimPrintJob(key)) return false;
  let title = key;
  let doc: PrintDocument | undefined;
  try {
    doc = await build();
    title = doc.title;
    await printDocument(doc);
    appendLog({ key, title, at: Date.now(), ok: true, auto: opts.auto, doc });
    return true;
  } catch (err) {
    appendLog({ key, title, at: Date.now(), ok: false, error: err instanceof Error ? err.message : String(err), auto: opts.auto, doc });
    return false;
  }
}
