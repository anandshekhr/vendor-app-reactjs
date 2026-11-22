/**
 * pdf.js, loaded only when a vendor opens a preview. The legacy build also runs on older Android browsers.
 * Pages are drawn onto a canvas: nothing in the customer's file runs (pdf.js has no scripting here, and XFA forms are off).
 */
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = workerUrl;

export type { PDFDocumentProxy };

/** Opens a PDF; call `close` when done to stop the worker. */
export async function openPdf(data: ArrayBuffer): Promise<{ doc: PDFDocumentProxy; close: () => void }> {
  const task = getDocument({ data, enableXfa: false, stopAtErrors: false });
  const doc = await task.promise;
  return { doc, close: () => void task.destroy() };
}
