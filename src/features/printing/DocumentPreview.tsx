import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { Badge, Button, Skeleton } from '@/components/ui';
import type { PrintOrderFile } from '@/types/api';
import type { PDFDocumentProxy } from './pdf';
import { selectedPages } from './printOrderView';

const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'webp']);
const ZOOMS = [1, 1.5, 2, 3];

function extOf(file: PrintOrderFile): string {
  return (file.file_type || file.original_filename.split('.').pop() || '').toLowerCase();
}

/**
 * Shows a customer's document inside the portal. PDFs are drawn page by page with pdf.js (works on phones and
 * wherever the browser's own PDF viewer is blocked or missing); images are shown as images.
 */
export function DocumentPreview({ file, url, onDownload }: { file: PrintOrderFile; url: string; onDownload: () => void }) {
  if (IMAGE_EXT.has(extOf(file))) {
    return (
      <div className="flex justify-center rounded-md border border-line bg-ink/5 p-2">
        <img src={url} alt={`Preview of ${file.original_filename}`} referrerPolicy="no-referrer" className="max-h-[70vh] w-auto object-contain" />
      </div>
    );
  }
  return <PdfPreview file={file} url={url} onDownload={onDownload} />;
}

function PdfPreview({ file, url, onDownload }: { file: PrintOrderFile; url: string; onDownload: () => void }) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [failed, setFailed] = useState(false);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(0);
  const [rendering, setRendering] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  // The link expires in minutes, so the file is fetched once, straight away.
  useEffect(() => {
    let cancelled = false;
    let close: (() => void) | null = null;
    (async () => {
      try {
        const res = await fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer' });
        if (!res.ok) throw new Error(String(res.status));
        const { openPdf } = await import('./pdf');
        const opened = await openPdf(await res.arrayBuffer());
        close = opened.close;
        if (cancelled) close();
        else setDoc(opened.doc);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      close?.();
    };
  }, [url]);

  const pages = doc?.numPages ?? 0;
  const wanted = useMemo(() => selectedPages(file.page_range || '', pages), [file.page_range, pages]);

  const draw = useCallback(async () => {
    if (!doc || !canvas.current || !frame.current) return;
    setRendering(true);
    try {
      const p = await doc.getPage(page);
      const base = p.getViewport({ scale: 1 });
      const fit = Math.max(frame.current.clientWidth - 16, 200) / base.width;
      const viewport = p.getViewport({ scale: fit * ZOOMS[zoom] });
      const ratio = window.devicePixelRatio || 1;
      const c = canvas.current;
      c.width = Math.floor(viewport.width * ratio);
      c.height = Math.floor(viewport.height * ratio);
      c.style.width = `${Math.floor(viewport.width)}px`;
      c.style.height = `${Math.floor(viewport.height)}px`;
      await p.render({ canvas: c, viewport, transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined }).promise;
    } catch {
      // A broken page leaves the canvas blank; the other pages still work.
    } finally {
      setRendering(false);
    }
  }, [doc, page, zoom]);

  useEffect(() => {
    void draw();
  }, [draw]);

  const go = useCallback((delta: number) => setPage((p) => Math.min(Math.max(p + delta, 1), pages || 1)), [pages]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  if (failed) {
    return (
      <div className="space-y-3 rounded-md border border-line p-6 text-center text-sm">
        <p className="text-ink-muted">This document can’t be shown here. Download it to open it on this device.</p>
        <Button variant="outline" leftIcon={<Download className="h-4 w-4" />} onClick={onDownload}>
          Download
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" onClick={() => go(-1)} disabled={!doc || page <= 1} aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[6.5rem] text-center tabular" aria-live="polite">
            {doc ? `Page ${page} of ${pages}` : 'Loading…'}
          </span>
          <Button size="sm" variant="outline" onClick={() => go(1)} disabled={!doc || page >= pages} aria-label="Next page">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {doc && file.page_range && (
          <Badge tone={wanted.has(page) ? 'success' : 'neutral'}>{wanted.has(page) ? 'To print' : 'Not in page range'}</Badge>
        )}
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" onClick={() => setZoom((z) => Math.max(z - 1, 0))} disabled={zoom === 0} aria-label="Zoom out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setZoom((z) => Math.min(z + 1, ZOOMS.length - 1))} disabled={zoom === ZOOMS.length - 1} aria-label="Zoom in">
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {file.page_range && <p className="text-xs text-ink-muted">Customer asked for pages {file.page_range}.</p>}
      <div ref={frame} className="relative h-[65vh] overflow-auto rounded-md border border-line bg-ink/5 p-2">
        {!doc && <Skeleton className="mx-auto h-full w-full max-w-md" />}
        <canvas ref={canvas} aria-label={`Page ${page} of ${file.original_filename}`} className={`mx-auto bg-white shadow ${doc ? '' : 'hidden'} ${rendering ? 'opacity-70' : ''}`} />
      </div>
    </div>
  );
}
