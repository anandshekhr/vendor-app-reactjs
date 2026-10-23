import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button, Skeleton } from '@/components/ui';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useAppSelector } from '@/hooks/store';
import { rupeesInWords } from '@/utils/amountInWords';
import { formatCurrency, formatDateTime, titleCase } from '@/utils/format';
import { useGetOrderFullQuery, useGetOrderQuery } from './api';
import { orderView } from './orderView';

const money = (v: unknown) => (v == null || v === '' ? '—' : Number(v).toFixed(2));

/**
 * Printable A4 invoice for one of the shop's orders (online or POS). Figures come straight from the server's order
 * record, including the delivery charge for this shop's part of the order.
 */
export function InvoicePage() {
  const { id } = useParams();
  const orderId = Number(id);
  const business = useAppSelector((s) => s.auth.business);
  const { data: order, error, isLoading, refetch } = useGetOrderQuery(orderId, { skip: !orderId });
  const full = useGetOrderFullQuery(orderId, { skip: !order || order.items !== undefined });

  // A4 page size only while this page is mounted (POS receipts use 80 mm).
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = '@page { size: A4; margin: 12mm; }';
    document.head.appendChild(style);
    const title = document.title;
    document.title = `Invoice ${orderId}`;
    return () => {
      style.remove();
      document.title = title;
    };
  }, [orderId]);

  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (isLoading || !order || (order.items === undefined && full.isLoading)) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const v = orderView(order, full.data);
  const invoiceNo = order.external_id ? `${order.external_id}-${order.id}` : `TNBS-${order.id}`;
  const payment = order.payments?.[0]?.provider ?? (v.source === 'pos' ? 'In store' : undefined);
  const hasShippingField = v.shipping !== null;
  const shipping = Number(v.shipping ?? 0);
  // Never print totals that don't add up: show an explicit adjustment if the server breakdown differs from the total.
  const computed = Number(v.itemTotal ?? 0) - Number(v.discount ?? 0) + shipping + Number(v.tax ?? 0);
  const adjustment = Math.round((Number(order.total_amount) - computed) * 100) / 100;

  return (
    <div className="min-h-full bg-canvas py-6 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-2 px-4 print:hidden">
        <Link to={v.source === 'pos' ? `/pos/sales/${order.id}` : `/orders/${order.id}`}>
          <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Back
          </Button>
        </Link>
        <Button onClick={() => window.print()} leftIcon={<Printer className="h-4 w-4" />}>
          Print / Save as PDF
        </Button>
      </div>

      <article className="print-area print-a4 mx-auto max-w-[210mm] bg-white p-8 text-[13px] leading-relaxed text-black shadow-card print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b-2 border-black pb-4">
          <div>
            <h1 className="text-xl font-bold">{business?.businessName || business?.shopName}</h1>
            {business?.shopName && business.shopName !== business.businessName && <p>{business.shopName}</p>}
            {business?.address && <p className="max-w-xs">{business.address}</p>}
            {business?.phone && <p>Phone: {business.phone}</p>}
            {business?.gstin && <p className="font-medium">GSTIN: {business.gstin}</p>}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold tracking-wide">INVOICE</p>
            <p>
              Invoice no: <span className="font-mono font-medium">{invoiceNo}</span>
            </p>
            <p>Order: #{order.id}</p>
            <p>Date: {formatDateTime(order.delivered_at ?? order.created_at)}</p>
            <p>
              Status: <span className="font-medium">{order.is_paid ? 'PAID' : 'PAYMENT PENDING'}</span>
            </p>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-6 border-b border-black/30 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-black/60">Bill to</p>
            <p className="font-medium">{order.customer_name || 'Walk-in customer'}</p>
            {order.customer_phone && <p>Phone: {order.customer_phone}</p>}
            {v.addressText && <p className="max-w-xs">{v.addressText}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-black/60">Order details</p>
            <p>Channel: {v.source === 'pos' ? 'In-store (POS)' : 'TheNearByShop online'}</p>
            {payment && <p>Payment: {titleCase(payment)}</p>}
            <p>Placed: {formatDateTime(order.created_at)}</p>
          </div>
        </section>

        <table className="mt-4 w-full border-collapse">
          <thead>
            <tr className="border-b border-black text-left text-xs uppercase">
              <th className="w-8 py-2">#</th>
              <th className="py-2">Item</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Rate (₹)</th>
              <th className="py-2 text-right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {(v.items ?? []).map((item, i) => (
              <tr key={item.id} className="border-b border-black/15 align-top">
                <td className="py-2">{i + 1}</td>
                <td className="py-2">
                  {item.product_snapshot?.name ?? `Product #${item.product}`}
                  {item.product_snapshot?.sku && <span className="block text-xs text-black/60">SKU {String(item.product_snapshot.sku)}</span>}
                </td>
                <td className="py-2 text-right tabular">{item.quantity}</td>
                <td className="py-2 text-right tabular">{money(item.unit_price)}</td>
                <td className="py-2 text-right tabular">{money(item.line_total ?? Number(item.unit_price) * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="mt-4 flex justify-end">
          <dl className="w-72 space-y-1">
            <div className="flex justify-between">
              <dt>Items subtotal</dt>
              <dd className="tabular">{money(v.itemTotal)}</dd>
            </div>
            {Number(v.discount ?? 0) > 0 && (
              <div className="flex justify-between">
                <dt>Discount</dt>
                <dd className="tabular">− {money(v.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt>Delivery charges</dt>
              <dd className="tabular">{hasShippingField ? money(shipping) : 'Included in total'}</dd>
            </div>
            {Number(v.tax ?? 0) > 0 && (
              <div className="flex justify-between">
                <dt>Tax</dt>
                <dd className="tabular">{money(v.tax)}</dd>
              </div>
            )}
            {hasShippingField && adjustment !== 0 && (
              <div className="flex justify-between">
                <dt>Adjustment</dt>
                <dd className="tabular">{money(adjustment)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t-2 border-black pt-1 text-base font-bold">
              <dt>Grand total</dt>
              <dd className="tabular">{formatCurrency(order.total_amount)}</dd>
            </div>
          </dl>
        </section>
        <p className="mt-2 text-right text-xs italic">{rupeesInWords(order.total_amount)}</p>

        {order.status === 'cancelled' || order.status === 'rejected' ? (
          <p className="mt-6 border border-black p-2 text-center font-bold">THIS ORDER WAS {order.status.toUpperCase()}. NOT PAYABLE.</p>
        ) : null}

        <footer className="mt-10 grid grid-cols-2 gap-6 border-t border-black/30 pt-4 text-xs text-black/70">
          <p>
            This is a computer-generated invoice and does not require a signature. Prices are as recorded by TheNearByShop at the time of the order.
            {!business?.gstin && ' Seller GSTIN not on file.'}
          </p>
          <p className="text-right">
            For {business?.businessName || business?.shopName}
            <br />
            <br />
            Authorised signatory
          </p>
        </footer>
      </article>
    </div>
  );
}
