import { layoutText, type PaperSize, type PrintDocument } from './document';

/**
 * ESC/POS encoding for thermal receipt printers (Epson TM, Xprinter, TVS, Everycom and most 58/80 mm printers).
 * Commands used: ESC @ (reset), ESC a n (align), ESC E n (bold), GS ! n (size), LF, GS V 66 0 (feed and cut).
 * Text is sent as ASCII: anything else is transliterated or replaced, because code pages differ between printers.
 */
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

const REPLACEMENTS: Record<string, string> = { '₹': 'Rs', '–': '-', '—': '-', '•': '*', '‘': "'", '’': "'", '“': '"', '”': '"', '×': 'x', '…': '...' };

export function toAscii(text: string): string {
  let out = '';
  for (const ch of text.normalize('NFKD')) {
    if (REPLACEMENTS[ch] !== undefined) out += REPLACEMENTS[ch];
    else {
      const code = ch.charCodeAt(0);
      if (code >= 0x20 && code < 0x7f) out += ch;
      else if (code >= 0x300 && code <= 0x36f) continue; // combining accents dropped
      else out += '?';
    }
  }
  return out;
}

export function encodeEscPos(doc: PrintDocument, paper: PaperSize, opts: { cut?: boolean } = {}): Uint8Array {
  const bytes: number[] = [ESC, 0x40];
  const align = { left: 0, center: 1, right: 2 } as const;
  let currentAlign = -1;
  let currentBold = false;
  let currentLarge = false;
  for (const line of layoutText(doc, paper === 'a4' ? '80mm' : paper)) {
    if (align[line.align] !== currentAlign) {
      currentAlign = align[line.align];
      bytes.push(ESC, 0x61, currentAlign);
    }
    if (line.bold !== currentBold) {
      currentBold = line.bold;
      bytes.push(ESC, 0x45, currentBold ? 1 : 0);
    }
    if (line.large !== currentLarge) {
      currentLarge = line.large;
      bytes.push(GS, 0x21, currentLarge ? 0x11 : 0x00);
    }
    for (const c of toAscii(line.text)) bytes.push(c.charCodeAt(0));
    bytes.push(LF);
  }
  bytes.push(ESC, 0x45, 0, GS, 0x21, 0, ESC, 0x61, 0);
  if (opts.cut !== false) bytes.push(GS, 0x56, 66, 0);
  return Uint8Array.from(bytes);
}
