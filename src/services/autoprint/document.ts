import type { BusinessSnapshot } from '@/features/auth/businessCache';
import type { ReceiptData } from '@/services/printing/Receipt';
import type { BookingListItem, OrderDetail } from '@/types/api';
import { formatDateTime } from '@/utils/format';

/**
 * A printer-independent document: a list of lines that render either as ESC/POS bytes for a thermal printer or as
 * HTML for the browser's print dialog. Thermal printers lay text out in fixed character columns, so all layout here
 * is done in characters (see `columnsFor`).
 */
export type PaperSize = '58mm' | '80mm' | 'a4';

export type PrintLine =
  | { kind: 'text'; text: string; align?: 'left' | 'center' | 'right'; bold?: boolean; size?: 'normal' | 'large' }
  | { kind: 'pair'; left: string; right: string; bold?: boolean }
  | { kind: 'item'; name: string; qty: number; amount: string }
  | { kind: 'rule' }
  | { kind: 'feed'; lines?: number };

export interface PrintDocument {
  /** Shown in the print log and used as the browser print title. */
  title: string;
  lines: PrintLine[];
}

/** Characters per line for normal-size text. */
export function columnsFor(paper: PaperSize): number {
  return paper === '58mm' ? 32 : paper === '80mm' ? 48 : 64;
}

/** Thermal printers have no ₹ glyph; keep amounts readable everywhere. */
export function money(value: string | number | null | undefined): string {
  const n = Number(value ?? 0);
  return `Rs ${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
}

function header(business: BusinessSnapshot | null): PrintLine[] {
  const lines: PrintLine[] = [{ kind: 'text', text: business?.businessName || business?.shopName || 'TheNearByShop', align: 'center', bold: true, size: 'large' }];
  if (business?.shopName && business.shopName !== business.businessName) lines.push({ kind: 'text', text: business.shopName, align: 'center' });
  if (business?.address) lines.push({ kind: 'text', text: business.address, align: 'center' });
  if (business?.phone) lines.push({ kind: 'text', text: `Ph: ${business.phone}`, align: 'center' });
  if (business?.gstin) lines.push({ kind: 'text', text: `GSTIN: ${business.gstin}`, align: 'center' });
  return lines;
}

function addressText(address: Record<string, unknown> | null | undefined): string {
  if (!address) return '';
  const keys = ['address_line1', 'address_line_1', 'address_line2', 'address_line_2', 'landmark', 'city', 'state', 'pincode', 'postal_code'];
  const parts = keys.map((k) => address[k]).filter((v): v is string => typeof v === 'string' && v.trim() !== '');
  if (parts.length) return parts.join(', ');
  return typeof address.address === 'string' ? address.address : '';
}

/** Order slip for the packing counter / kitchen: what to pack and where it goes. */
export function orderSlip(order: OrderDetail, business: BusinessSnapshot | null, heading = 'NEW ORDER'): PrintDocument {
  const lines: PrintLine[] = [
    ...header(business),
    { kind: 'rule' },
    { kind: 'text', text: `${heading} #${order.id}`, align: 'center', bold: true, size: 'large' },
    { kind: 'text', text: formatDateTime(order.created_at), align: 'center' },
    { kind: 'rule' },
  ];
  if (order.customer_name) lines.push({ kind: 'pair', left: 'Customer', right: order.customer_name });
  if (order.customer_phone && !order.contact_masked) lines.push({ kind: 'pair', left: 'Phone', right: order.customer_phone });
  const addr = addressText(order.customer_address);
  if (addr) lines.push({ kind: 'text', text: `Deliver to: ${addr}` });
  lines.push({ kind: 'rule' });
  for (const item of order.items ?? []) {
    lines.push({
      kind: 'item',
      name: String(item.product_snapshot?.name ?? `Item #${item.product ?? item.id}`),
      qty: item.quantity,
      amount: money(item.line_total ?? Number(item.unit_price) * item.quantity),
    });
  }
  if (!order.items?.length) lines.push({ kind: 'text', text: '(items not available — open the order in the portal)' });
  lines.push({ kind: 'rule' });
  if (order.item_total !== undefined) lines.push({ kind: 'pair', left: 'Items', right: money(order.item_total) });
  if (Number(order.discount_amount ?? 0) > 0) lines.push({ kind: 'pair', left: 'Discount', right: `-${money(order.discount_amount)}` });
  if (Number(order.shipping_amount ?? 0) > 0) lines.push({ kind: 'pair', left: 'Delivery', right: money(order.shipping_amount) });
  lines.push({ kind: 'pair', left: 'TOTAL', right: money(order.total_amount), bold: true });
  lines.push({ kind: 'text', text: order.is_paid ? 'PAID' : 'NOT PAID - collect on delivery', align: 'center', bold: true });
  lines.push({ kind: 'feed', lines: 3 });
  return { title: `Order #${order.id}`, lines };
}

/** Customer receipt for a POS sale (same content as the on-screen receipt). */
export function receiptDocument(data: ReceiptData, business: BusinessSnapshot | null): PrintDocument {
  const provisional = data.orderId === null;
  const ref = provisional ? `P-${(data.clientReference ?? '').slice(0, 8).toUpperCase()}` : `#${data.orderId}`;
  const lines: PrintLine[] = [...header(business), { kind: 'rule' }];
  if (provisional) {
    lines.push({ kind: 'text', text: 'PROVISIONAL RECEIPT - PENDING SYNC', align: 'center', bold: true });
    lines.push({ kind: 'text', text: 'Not a tax invoice.', align: 'center' });
  }
  lines.push({ kind: 'pair', left: 'Receipt', right: ref });
  lines.push({ kind: 'pair', left: 'Date', right: formatDateTime(data.createdAt) });
  const customer = [data.customerName, data.customerPhone].filter(Boolean).join(' ');
  if (customer) lines.push({ kind: 'pair', left: 'Customer', right: customer });
  lines.push({ kind: 'rule' });
  for (const l of data.lines) lines.push({ kind: 'item', name: l.name, qty: l.quantity, amount: money(l.lineTotal) });
  lines.push({ kind: 'rule' });
  lines.push({ kind: 'pair', left: 'Items', right: money(data.itemTotal) });
  if (Number(data.discount ?? 0) > 0) lines.push({ kind: 'pair', left: 'Discount', right: `-${money(data.discount)}` });
  if (Number(data.tax ?? 0) > 0) lines.push({ kind: 'pair', left: 'Tax', right: money(data.tax) });
  lines.push({ kind: 'pair', left: 'TOTAL', right: money(data.total), bold: true });
  lines.push({ kind: 'pair', left: 'Payment', right: `${data.paymentMethod.toUpperCase()}${data.paidConfirmed ? ' - PAID' : ' - PENDING'}` });
  lines.push({ kind: 'text', text: 'Thank you! Visit again.', align: 'center' });
  lines.push({ kind: 'feed', lines: 3 });
  return { title: `Receipt ${ref}`, lines };
}

/** Booking slip for the front desk. */
export function bookingSlip(b: BookingListItem, business: BusinessSnapshot | null): PrintDocument {
  return {
    title: `Booking #${b.id}`,
    lines: [
      ...header(business),
      { kind: 'rule' },
      { kind: 'text', text: `NEW BOOKING #${b.id}`, align: 'center', bold: true, size: 'large' },
      { kind: 'rule' },
      { kind: 'pair', left: 'Service', right: b.service_name },
      { kind: 'pair', left: 'When', right: formatDateTime(b.start_time) },
      { kind: 'pair', left: 'Customer', right: b.customer_name },
      ...(b.staff ? [{ kind: 'pair' as const, left: 'Staff', right: b.staff }] : []),
      { kind: 'pair', left: 'Total', right: money(b.total_amount), bold: true },
      { kind: 'pair', left: 'Due', right: money(b.balance_due) },
      { kind: 'feed', lines: 3 },
    ],
  };
}

export function testDocument(business: BusinessSnapshot | null, paper: PaperSize): PrintDocument {
  const cols = columnsFor(paper);
  return {
    title: 'Test print',
    lines: [
      ...header(business),
      { kind: 'rule' },
      { kind: 'text', text: 'PRINTER TEST', align: 'center', bold: true, size: 'large' },
      { kind: 'text', text: `Paper ${paper} - ${cols} characters per line` },
      { kind: 'text', text: '1234567890'.repeat(Math.ceil(cols / 10)).slice(0, cols) },
      { kind: 'item', name: 'Sample item with a long name that wraps', qty: 2, amount: money(120) },
      { kind: 'pair', left: 'TOTAL', right: money(120), bold: true },
      { kind: 'text', text: 'If this looks right, auto-print is ready.', align: 'center' },
      { kind: 'feed', lines: 3 },
    ],
  };
}

// ─── Plain-text layout (shared by ESC/POS and the HTML preview) ─────────────────────────────

function wrap(text: string, width: number): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const out: string[] = [];
  let line = '';
  for (const word of words) {
    if (word.length > width) {
      if (line) out.push(line);
      for (let i = 0; i < word.length; i += width) out.push(word.slice(i, i + width));
      line = '';
      continue;
    }
    if (!line) line = word;
    else if (line.length + 1 + word.length <= width) line += ` ${word}`;
    else {
      out.push(line);
      line = word;
    }
  }
  if (line) out.push(line);
  return out.length ? out : [''];
}

/** Left and right text on one line, right-aligned; wraps the left part when needed. */
export function pairLines(left: string, right: string, width: number): string[] {
  const room = width - right.length - 1;
  if (room < 4) return [...wrap(left, width), right.padStart(width)];
  const wrapped = wrap(left, room);
  const last = wrapped.pop()!;
  return [...wrapped, `${last.padEnd(room)} ${right}`];
}

/** "2 x Amul Butter ........ Rs 112.00", wrapping long names onto following lines. */
export function itemLines(name: string, qty: number, amount: string, width: number): string[] {
  return pairLines(`${qty} x ${name}`, amount, width);
}

/** The document as fixed-width text lines (large text counts double width). */
export function layoutText(doc: PrintDocument, paper: PaperSize): { text: string; align: 'left' | 'center' | 'right'; bold: boolean; large: boolean }[] {
  const width = columnsFor(paper);
  const out: { text: string; align: 'left' | 'center' | 'right'; bold: boolean; large: boolean }[] = [];
  for (const line of doc.lines) {
    switch (line.kind) {
      case 'text': {
        const large = line.size === 'large';
        for (const t of wrap(line.text, large ? Math.floor(width / 2) : width)) out.push({ text: t, align: line.align ?? 'left', bold: Boolean(line.bold), large });
        break;
      }
      case 'pair':
        for (const t of pairLines(line.left, line.right, width)) out.push({ text: t, align: 'left', bold: Boolean(line.bold), large: false });
        break;
      case 'item':
        for (const t of itemLines(line.name, line.qty, line.amount, width)) out.push({ text: t, align: 'left', bold: false, large: false });
        break;
      case 'rule':
        out.push({ text: '-'.repeat(width), align: 'left', bold: false, large: false });
        break;
      case 'feed':
        for (let i = 0; i < (line.lines ?? 1); i++) out.push({ text: '', align: 'left', bold: false, large: false });
        break;
    }
  }
  return out;
}
