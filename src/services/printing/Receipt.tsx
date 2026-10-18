import { forwardRef } from 'react';
import type { BusinessSnapshot } from '@/features/auth/businessCache';
import { formatCurrency, formatDateTime, titleCase } from '@/utils/format';

export interface ReceiptLine {
  name: string;
  quantity: number;
  unitPrice: string | number;
  lineTotal: string | number;
}

export interface ReceiptData {
  /** Server order id, or null for a provisional (offline, unsynced) receipt. */
  orderId: number | null;
  clientReference?: string;
  createdAt: string | number;
  lines: ReceiptLine[];
  itemTotal: string | number;
  discount?: string | number | null;
  tax?: string | number | null;
  total: string | number;
  paymentMethod: string;
  customerName?: string;
  customerPhone?: string;
  /** True only when the server confirmed the sale as paid. */
  paidConfirmed: boolean;
}

export const Receipt = forwardRef<HTMLDivElement, { business: BusinessSnapshot | null; data: ReceiptData }>(function Receipt({ business, data }, ref) {
  const provisional = data.orderId === null;
  return (
    <div ref={ref} className="print-area mx-auto w-full max-w-[80mm] bg-white p-3 font-mono text-[12px] leading-snug text-black">
      <div className="text-center">
        <p className="text-sm font-bold">{business?.businessName || business?.shopName || 'TheNearByShop vendor'}</p>
        {business?.shopName && business.shopName !== business.businessName && <p>{business.shopName}</p>}
        {business?.address && <p>{business.address}</p>}
        {business?.phone && <p>Ph: {business.phone}</p>}
        {business?.gstin && <p>GSTIN: {business.gstin}</p>}
      </div>
      {provisional && (
        <p className="my-2 border border-black p-1 text-center font-bold" role="note">
          PROVISIONAL RECEIPT — PENDING SYNC
          <br />
          Not a tax invoice. Prices and totals are confirmed when synced.
        </p>
      )}
      <div className="my-2 border-y border-dashed border-black py-1">
        <p>Receipt: {provisional ? `P-${(data.clientReference ?? '').slice(0, 8).toUpperCase()}` : `#${data.orderId}`}</p>
        <p>Date: {formatDateTime(data.createdAt)}</p>
        {(data.customerName || data.customerPhone) && <p>Customer: {[data.customerName, data.customerPhone].filter(Boolean).join(' · ')}</p>}
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-dashed border-black text-left">
            <th className="font-normal">Item</th>
            <th className="text-right font-normal">Qty</th>
            <th className="text-right font-normal">Rate</th>
            <th className="text-right font-normal">Amt</th>
          </tr>
        </thead>
        <tbody>
          {data.lines.map((l, i) => (
            <tr key={i} className="align-top">
              <td className="pr-1">{l.name}</td>
              <td className="text-right">{l.quantity}</td>
              <td className="text-right">{Number(l.unitPrice).toFixed(2)}</td>
              <td className="text-right">{Number(l.lineTotal).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 space-y-0.5 border-t border-dashed border-black pt-1">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatCurrency(data.itemTotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>Discount</span>
          <span>{data.discount == null ? (provisional ? 'on sync' : '—') : `- ${formatCurrency(data.discount)}`}</span>
        </div>
        <div className="flex justify-between">
          <span>Tax</span>
          <span>{data.tax == null ? (provisional ? 'on sync' : '—') : formatCurrency(data.tax)}</span>
        </div>
        <div className="flex justify-between text-sm font-bold">
          <span>{provisional ? 'Estimated total' : 'Total'}</span>
          <span>{formatCurrency(data.total)}</span>
        </div>
        <div className="flex justify-between">
          <span>Payment</span>
          <span>
            {titleCase(data.paymentMethod)} · {data.paidConfirmed ? 'PAID' : 'PENDING'}
          </span>
        </div>
      </div>
      <p className="mt-3 text-center">Thank you for shopping with us!</p>
      <p className="text-center text-[10px]">Powered by TheNearByShop</p>
    </div>
  );
});

export function printReceipt() {
  window.print();
}
