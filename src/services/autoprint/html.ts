import { layoutText, type PaperSize, type PrintDocument } from './document';

function escape(text: string) {
  return text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

/**
 * The document as a standalone HTML page sized for the paper, for the browser's print dialog. Thermal paper uses a
 * page as wide as the roll; A4 centres an 80 mm-wide slip.
 */
export function renderHtml(doc: PrintDocument, paper: PaperSize, copies = 1): string {
  const width = paper === '58mm' ? '58mm' : paper === '80mm' ? '80mm' : '210mm';
  const lines = layoutText(doc, paper)
    .map((l) => {
      const style = [`text-align:${l.align}`, l.bold ? 'font-weight:700' : '', l.large ? 'font-size:1.6em' : ''].filter(Boolean).join(';');
      return `<div style="${style}">${escape(l.text) || '&nbsp;'}</div>`;
    })
    .join('');
  const slip = `<section class="slip">${lines}</section>`;
  const body = Array.from({ length: Math.max(1, copies) }, () => slip).join('<div class="break"></div>');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escape(doc.title)}</title><style>
@page { size: ${paper === 'a4' ? 'A4' : `${width} auto`}; margin: ${paper === 'a4' ? '12mm' : '2mm'}; }
html, body { margin: 0; padding: 0; background: #fff; color: #000; }
.slip { font: 12px/1.35 ui-monospace, 'Courier New', monospace; white-space: pre; width: ${paper === 'a4' ? '80mm' : 'auto'}; margin: 0 auto; }
.break { break-after: page; }
</style></head><body>${body}</body></html>`;
}
