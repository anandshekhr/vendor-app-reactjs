import { Link, useParams } from 'react-router-dom';
import { ExternalLink, FileText, Printer } from 'lucide-react';
import { Button, Card, CardBody, Skeleton } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { BackendGap } from '@/components/feedback/BackendGap';
import { useAppSelector } from '@/hooks/store';
import { Receipt, printReceipt } from '@/services/printing/Receipt';
import { formatDateTime } from '@/utils/format';
import { useGetOrderFullQuery, useGetOrderQuery } from '@/features/orders/api';

export function PosSaleDetailPage() {
  const { id } = useParams();
  const orderId = Number(id);
  const business = useAppSelector((s) => s.auth.business);
  const scoped = useGetOrderQuery(orderId, { skip: !orderId });
  // Prefer the shop-scoped detail; the unscoped v2 detail is only a fallback for servers without the vendor-portal update.
  const full = useGetOrderFullQuery(orderId, { skip: !scoped.data || scoped.data.items !== undefined });

  if (scoped.error) return <ErrorState error={scoped.error} onRetry={scoped.refetch} />;
  if (full.error) return <ErrorState error={full.error} onRetry={full.refetch} />;
  const src = scoped.data?.items !== undefined ? scoped.data : full.data;
  if (!scoped.data || !src) return <Skeleton className="h-96 w-full" />;
  const o = { ...src, id: scoped.data.id, created_at: scoped.data.created_at, total_amount: scoped.data.total_amount, is_paid: scoped.data.is_paid };
  const payment = (src as { payments?: { provider?: string }[] }).payments?.[0]?.provider;

  return (
    <>
      <PageHeader
        backTo="/pos/sales"
        title={`Sale #${o.id}`}
        description={`${o.source === 'pos' ? 'In-store sale' : 'Online order'} · ${formatDateTime(o.created_at)}`}
        actions={
          <>
            {o.invoice_url && (
              <a href={o.invoice_url} target="_blank" rel="noreferrer">
                <Button variant="outline" leftIcon={<ExternalLink className="h-4 w-4" />}>
                  Server invoice
                </Button>
              </a>
            )}
            <Link to={`/orders/${o.id}/invoice`}>
              <Button variant="outline" leftIcon={<FileText className="h-4 w-4" />}>
                A4 invoice
              </Button>
            </Link>
            <Button onClick={printReceipt} leftIcon={<Printer className="h-4 w-4" />}>
              Print receipt
            </Button>
          </>
        }
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardBody>
            <Receipt
              business={business}
              data={{
                orderId: o.id,
                createdAt: o.created_at,
                lines: (o.items ?? []).map((i) => ({
                  name: i.product_snapshot?.name ?? `#${i.product}`,
                  quantity: i.quantity,
                  unitPrice: i.unit_price,
                  lineTotal: i.line_total ?? Number(i.unit_price) * i.quantity,
                })),
                itemTotal: o.item_total ?? o.total_amount,
                discount: o.discount_amount,
                tax: o.tax_amount,
                total: o.total_amount,
                paymentMethod: payment ?? 'recorded',
                customerName: o.customer_name,
                customerPhone: o.customer_phone,
                paidConfirmed: o.is_paid,
              }}
            />
          </CardBody>
        </Card>
        <div className="space-y-3">
          <BackendGap gap="G-9" title="Cancelling or refunding a POS sale is not supported by the server">
            POS sales are recorded as delivered and have no permitted transitions. Contact support for corrections.
          </BackendGap>
        </div>
      </div>
    </>
  );
}
