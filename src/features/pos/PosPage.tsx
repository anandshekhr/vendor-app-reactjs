import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CloudOff,
  History,
  ImageOff,
  Minus,
  Plus,
  Printer,
  RefreshCw,
  ShoppingCart,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { Badge, Button, Checkbox, Dialog, Field, Input, Select } from '@/components/ui';
import { SearchInput } from '@/components/forms/SearchInput';
import { EmptyState } from '@/components/feedback/EmptyState';
import { BackendGap } from '@/components/feedback/BackendGap';
import { useAppDispatch, useAppSelector } from '@/hooks/store';
import { useDebounce } from '@/hooks/useDebounce';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useToast } from '@/hooks/useToast';
import { isApiError } from '@/services/api/errors';
import { db, getMeta, META_CATALOGUE_SYNCED_AT, type CachedProduct } from '@/services/offline/db';
import { Receipt, printReceipt, type ReceiptData } from '@/services/printing/Receipt';
import { formatCurrency, formatRelative } from '@/utils/format';
import { uuid } from '@/utils/id';
import { isValidIndianMobile, normalizeIndianMobile } from '@/utils/phone';
import type { PosPaymentMethod, PosProduct } from '@/types/api';
import { refreshCatalogue, findCachedByBarcode, searchCached } from '@/features/offline-sync/catalogue';
import { BarcodeScanner } from '@/features/scanner/BarcodeScanner';
import { useLazyPosLookupBarcodeQuery, usePosCheckoutMutation } from './api';
import { cartCleared, customerChanged, estimateTotal, itemCount, lineRemoved, paymentMethodChanged, productAdded, quantitySet } from './posSlice';
import { createOfflineSale, isCatalogueStale, isOfflinePaymentAllowed, OfflinePolicyError } from './offlineSale';

const PAYMENT_METHODS: { value: PosPaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
];

function ProductTile({ product, onAdd, inCart }: { product: PosProduct; onAdd: () => void; inCart: number }) {
  const out = product.stock <= 0;
  return (
    <button
      type="button"
      onClick={onAdd}
      className="group flex flex-col overflow-hidden rounded-lg border border-line bg-surface text-left transition hover:border-brand-400 hover:shadow-card focus-visible:ring-2"
      aria-label={`Add ${product.name}, ${formatCurrency(product.final_price)}`}
    >
      <div className="relative flex aspect-[4/3] items-center justify-center bg-ink/[0.03]">
        {product.image ? <img src={product.image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <ImageOff className="h-6 w-6 text-ink-subtle" aria-hidden />}
        {inCart > 0 && <span className="absolute right-1.5 top-1.5 rounded-full bg-brand-600 px-1.5 text-xs font-semibold text-white">{inCart}</span>}
      </div>
      <div className="flex flex-1 flex-col p-2">
        <p className="line-clamp-2 text-xs font-medium leading-snug">{product.name}</p>
        <div className="mt-auto flex items-center justify-between pt-1">
          <span className="text-sm font-semibold tabular">{formatCurrency(product.final_price)}</span>
          <span className={`text-[11px] ${out ? 'font-semibold text-red-600' : 'text-ink-subtle'}`}>{out ? 'Out' : `${product.stock} left`}</span>
        </div>
      </div>
    </button>
  );
}

export function PosPage() {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const online = useOnlineStatus();
  const business = useAppSelector((s) => s.auth.business);
  const cart = useAppSelector((s) => s.pos);
  const [search, setSearch] = useState('');
  const q = useDebounce(search, 200);
  const [category, setCategory] = useState<string>('');
  const [syncing, setSyncing] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [ambiguous, setAmbiguous] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [lookupBarcode] = useLazyPosLookupBarcodeQuery();
  const [checkout, checkoutState] = usePosCheckoutMutation();
  // One idempotency key per cart attempt; regenerated whenever the cart contents change.
  const idempotencyKey = useRef(uuid());

  const catalogueSyncedAt = useLiveQuery(() => getMeta<number>(META_CATALOGUE_SYNCED_AT), [], undefined as number | undefined);
  const catalogueCount = useLiveQuery(() => db.products.count(), [], 0);
  const results = useLiveQuery(() => searchCached(q, 60), [q], [] as CachedProduct[]);
  const categories = useLiveQuery(
    async () => [...new Set((await db.products.toArray()).map((p) => p.category_name).filter(Boolean) as string[])].sort(),
    [catalogueCount],
    [] as string[],
  );
  const pendingOffline = useLiveQuery(
    () => db.sales.where('status').anyOf('pending', 'syncing', 'unknown', 'conflict').filter((s) => s.shopId === business?.shopId).count(),
    [business?.shopId],
    0,
  );

  const stale = isCatalogueStale(catalogueSyncedAt);
  const total = estimateTotal(cart.lines);
  const count = itemCount(cart.lines);
  const methodNeedsConfirmation = cart.paymentMethod !== 'cash';
  const offlineMethodBlocked = !online && !isOfflinePaymentAllowed(cart.paymentMethod);
  const phoneInvalid = cart.customerPhone.trim() !== '' && !isValidIndianMobile(cart.customerPhone);

  useEffect(() => {
    idempotencyKey.current = uuid();
    setAmbiguous(false);
  }, [cart.lines, cart.paymentMethod]);

  useEffect(() => {
    setPaymentConfirmed(false);
  }, [cart.paymentMethod, total]);

  const syncCatalogue = useCallback(async () => {
    if (!navigator.onLine) return;
    setSyncing(true);
    try {
      const n = await refreshCatalogue();
      toast.success('Catalogue synced', `${n} active products cached for offline use.`);
    } catch (err) {
      toast.error('Catalogue sync failed', err);
    } finally {
      setSyncing(false);
    }
  }, [toast]);

  // First open on this device: build the offline catalogue automatically.
  useEffect(() => {
    if (online && catalogueSyncedAt === undefined) {
      const t = window.setTimeout(() => {
        void db.products.count().then((n) => {
          if (n === 0) void syncCatalogue();
        });
      }, 300);
      return () => window.clearTimeout(t);
    }
  }, [online, catalogueSyncedAt, syncCatalogue]);

  const filtered = useMemo(() => (category ? results.filter((p) => p.category_name === category) : results), [results, category]);
  const quantities = useMemo(() => new Map(cart.lines.map((l) => [l.product.id, l.quantity])), [cart.lines]);

  const addProduct = (p: PosProduct) => {
    const current = quantities.get(p.id) ?? 0;
    if (current + 1 > p.stock) toast.warning(`${p.name}: only ${p.stock} in stock`, 'The server will reject the sale if stock is insufficient.');
    dispatch(productAdded(p));
  };

  const handleScan = async (code: string) => {
    if (navigator.onLine) {
      const res = await lookupBarcode(code);
      if (res.data) return addProduct(res.data);
      if (isApiError(res.error) && res.error.status === 404) return toast.error(`No active product for barcode ${code}`);
      // Network trouble: fall through to the cached catalogue.
    }
    const cached = await findCachedByBarcode(code);
    if (cached) {
      addProduct(cached);
      if (!navigator.onLine) toast.info(`Added from offline catalogue`, cached.name);
    } else {
      toast.error(`Barcode ${code} not found`, navigator.onLine ? undefined : 'Not in the offline catalogue.');
    }
  };

  const completeOnline = async () => {
    try {
      const order = await checkout({
        request: {
          items: cart.lines.map((l) => ({ product_id: l.product.id, quantity: l.quantity })),
          payment_method: cart.paymentMethod,
          customer_name: cart.customerName.trim(),
          customer_phone: cart.customerPhone.trim() ? normalizeIndianMobile(cart.customerPhone) : '',
          client_reference: idempotencyKey.current,
        },
        idempotencyKey: idempotencyKey.current,
      }).unwrap();
      setReceipt({
        orderId: order.id,
        createdAt: order.created_at,
        lines: (order.items ?? []).map((i) => ({
          name: i.product_snapshot?.name ?? `#${i.product}`,
          quantity: i.quantity,
          unitPrice: i.unit_price,
          lineTotal: i.line_total ?? Number(i.unit_price) * i.quantity,
        })),
        itemTotal: order.item_total,
        discount: order.discount_amount,
        tax: order.tax_amount,
        total: order.total_amount,
        paymentMethod: cart.paymentMethod,
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        paidConfirmed: order.is_paid,
      });
      dispatch(cartCleared());
      setCartOpen(false);
    } catch (err) {
      const e = isApiError(err) ? err : null;
      if (e?.isNetworkError && !e.isAmbiguous) {
        toast.warning('You went offline', 'Record the sale offline or try again when connected.');
      } else if (e && (e.isAmbiguous || e.status === null || (e.status ?? 0) >= 500)) {
        // The request may have been processed. Never auto-retry a non-idempotent checkout.
        setAmbiguous(true);
      } else {
        toast.error('Checkout rejected', err);
      }
    }
  };

  const completeOffline = async () => {
    try {
      if (!business) throw new OfflinePolicyError('Business profile is not loaded.');
      const sale = await createOfflineSale({
        shopId: business.shopId,
        lines: cart.lines,
        paymentMethod: cart.paymentMethod,
        customerName: cart.customerName,
        customerPhone: cart.customerPhone.trim() ? normalizeIndianMobile(cart.customerPhone) : '',
      });
      setReceipt({
        orderId: null,
        clientReference: sale.clientReference,
        createdAt: sale.createdAt,
        lines: sale.items.map((i) => ({ name: i.name, quantity: i.quantity, unitPrice: i.unitPrice, lineTotal: Number(i.unitPrice) * i.quantity })),
        itemTotal: sale.provisionalTotal,
        discount: null,
        tax: null,
        total: sale.provisionalTotal,
        paymentMethod: sale.paymentMethod,
        customerName: sale.customerName,
        customerPhone: sale.customerPhone,
        paidConfirmed: false,
      });
      dispatch(cartCleared());
      setCartOpen(false);
      toast.info('Sale saved offline', 'It will sync automatically when you are back online.');
    } catch (err) {
      toast.error(err instanceof OfflinePolicyError ? 'Not allowed offline' : 'Could not save offline sale', err instanceof Error ? err.message : err);
    }
  };

  const canCheckout = cart.lines.length > 0 && !phoneInvalid && !offlineMethodBlocked && (!methodNeedsConfirmation || paymentConfirmed || !online);

  const cartPanel = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold">
          Current sale <span className="text-ink-subtle">({count} item{count === 1 ? '' : 's'})</span>
        </h2>
        {cart.lines.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => dispatch(cartCleared())} leftIcon={<Trash2 className="h-3.5 w-3.5" />}>
            Clear
          </Button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {cart.lines.length === 0 ? (
          <EmptyState icon={<ShoppingCart className="h-5 w-5" />} title="Cart is empty" description="Scan a barcode or tap a product." />
        ) : (
          <ul className="divide-y divide-line">
            {cart.lines.map((l) => {
              const over = l.quantity > l.product.stock;
              return (
                <li key={l.product.id} className="px-4 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{l.product.name}</p>
                      <p className="text-xs text-ink-subtle">{formatCurrency(l.product.final_price)} each</p>
                    </div>
                    <button type="button" onClick={() => dispatch(lineRemoved(l.product.id))} className="text-ink-subtle hover:text-red-600" aria-label={`Remove ${l.product.name}`}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => dispatch(quantitySet({ productId: l.product.id, quantity: l.quantity - 1 }))} aria-label="Decrease quantity">
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        aria-label={`Quantity of ${l.product.name}`}
                        className="h-7 w-14 px-1 text-center"
                        inputMode="numeric"
                        value={l.quantity}
                        onChange={(e) => dispatch(quantitySet({ productId: l.product.id, quantity: Number(e.target.value.replace(/\D/g, '')) || 0 }))}
                      />
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => addProduct(l.product)} aria-label="Increase quantity">
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="text-sm font-semibold tabular">{formatCurrency(Number(l.product.final_price) * l.quantity)}</span>
                  </div>
                  {over && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-amber-700">
                      <AlertTriangle className="h-3 w-3" /> Only {l.product.stock} in stock (last known)
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="space-y-3 border-t border-line p-4">
        <div className="grid grid-cols-2 gap-2">
          <Input aria-label="Customer name" placeholder="Customer name (optional)" value={cart.customerName} onChange={(e) => dispatch(customerChanged({ name: e.target.value }))} maxLength={100} />
          <Input
            aria-label="Customer phone"
            aria-invalid={phoneInvalid || undefined}
            placeholder="Phone (optional)"
            inputMode="tel"
            value={cart.customerPhone}
            onChange={(e) => dispatch(customerChanged({ phone: e.target.value }))}
          />
        </div>
        {phoneInvalid && <p className="text-xs text-red-600">Enter a valid 10-digit mobile number or leave it blank.</p>}
        {!cart.customerName && !cart.customerPhone && (
          <p className="flex items-center gap-1 text-xs text-ink-subtle">
            <UserRound className="h-3 w-3" /> Walk-in customer
          </p>
        )}
        <Field label="Payment method">
          <Select value={cart.paymentMethod} onChange={(e) => dispatch(paymentMethodChanged(e.target.value as PosPaymentMethod))}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value} disabled={!online && !isOfflinePaymentAllowed(m.value)}>
                {m.label}
                {!online && !isOfflinePaymentAllowed(m.value) ? ' (online only)' : ''}
              </option>
            ))}
          </Select>
        </Field>
        {online && methodNeedsConfirmation && cart.lines.length > 0 && (
          <label className="flex items-start gap-2 rounded-md bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
            <Checkbox checked={paymentConfirmed} onChange={(e) => setPaymentConfirmed(e.target.checked)} className="mt-0.5" />
            I have confirmed {formatCurrency(total)} was received on the {cart.paymentMethod.toUpperCase()} terminal/app. (The server records POS sales as paid without a provider check.)
          </label>
        )}
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between text-ink-muted">
            <dt>Discount</dt>
            <dd>Not supported at POS</dd>
          </div>
          <div className="flex justify-between text-ink-muted">
            <dt>Tax</dt>
            <dd>Calculated by server</dd>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <dt>Estimated total</dt>
            <dd className="tabular">{formatCurrency(total)}</dd>
          </div>
        </dl>
        {ambiguous && (
          <div role="alert" className="rounded-md border border-amber-400 bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
            The server did not respond, so we cannot tell whether this sale was saved.{' '}
            <Link to="/pos/sales" className="font-semibold underline">
              Check sales history
            </Link>{' '}
            before trying again, to avoid a duplicate sale.
          </div>
        )}
        {online ? (
          <Button size="lg" className="w-full" disabled={!canCheckout} loading={checkoutState.isLoading} onClick={completeOnline}>
            {ambiguous ? 'Retry checkout anyway' : `Charge ${formatCurrency(total)}`}
          </Button>
        ) : (
          <Button size="lg" className="w-full" disabled={!canCheckout} onClick={completeOffline} leftIcon={<CloudOff className="h-4 w-4" />}>
            Save offline sale · {formatCurrency(total)}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="-mx-3 -my-5 flex min-h-[calc(100vh-3.5rem)] flex-col sm:-mx-5 lg:-mx-6 lg:flex-row">
      <section className="flex min-w-0 flex-1 flex-col gap-3 p-3 sm:p-4" aria-label="Products">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-semibold">Point of Sale</h1>
          <div className="flex flex-wrap items-center gap-2">
            {pendingOffline > 0 && (
              <Link to="/pos/sales?tab=offline">
                <Badge tone="warning">{pendingOffline} offline sale(s) pending</Badge>
              </Link>
            )}
            <Link to="/pos/sales">
              <Button variant="outline" size="sm" leftIcon={<History className="h-3.5 w-3.5" />}>
                Sales
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={syncCatalogue} loading={syncing} disabled={!online} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
              Sync catalogue
            </Button>
          </div>
        </div>
        <p className={`text-xs ${stale ? 'font-medium text-amber-700' : 'text-ink-subtle'}`} role="status">
          {catalogueSyncedAt ? `Catalogue: ${catalogueCount} products, synced ${formatRelative(catalogueSyncedAt)}.` : 'Catalogue not synced on this device yet.'}
          {stale && catalogueSyncedAt ? ' Prices and stock may be outdated.' : ''}
          {!online && ' Offline: cash sales are queued and synced later.'}
        </p>
        <BarcodeScanner onScan={handleScan} compact dedupeMs={900} />
        <div className="flex flex-col gap-2 sm:flex-row">
          <SearchInput value={search} onChange={setSearch} placeholder="Search name, SKU or barcode" label="Search products" className="w-full sm:flex-1" />
        </div>
        {categories.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Categories">
            {['', ...categories].map((c) => (
              <button
                key={c || 'all'}
                type="button"
                onClick={() => setCategory(c)}
                aria-pressed={category === c}
                className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium ${category === c ? 'border-brand-600 bg-brand-600 text-white' : 'border-line bg-surface text-ink-muted hover:text-ink'}`}
              >
                {c || 'All'}
              </button>
            ))}
          </div>
        )}
        {catalogueCount === 0 ? (
          <EmptyState
            title={online ? 'Building offline catalogue…' : 'No offline catalogue'}
            description={online ? 'Your products are being cached so the POS works without internet.' : 'Connect to the internet once to cache your products.'}
          />
        ) : filtered.length === 0 ? (
          <EmptyState title="No products found" />
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {filtered.map((p) => (
              <ProductTile key={p.id} product={p} inCart={quantities.get(p.id) ?? 0} onAdd={() => addProduct(p)} />
            ))}
          </div>
        )}
        <BackendGap gap="G-9" title="POS discounts and tax rules are not supported by the server yet" className="mt-auto" />
      </section>

      <aside className="hidden w-[380px] shrink-0 border-l border-line bg-surface lg:block" aria-label="Cart">
        <div className="sticky top-0 h-[calc(100vh-3.5rem)]">{cartPanel}</div>
      </aside>

      <div className="sticky bottom-0 border-t border-line bg-surface p-3 lg:hidden">
        <Button size="lg" className="w-full" onClick={() => setCartOpen(true)} leftIcon={<ShoppingCart className="h-4 w-4" />}>
          View cart · {count} · {formatCurrency(total)}
        </Button>
      </div>
      <Dialog open={cartOpen} onClose={() => setCartOpen(false)} title="Cart" size="md">
        <div className="-mx-5 -my-4">{cartPanel}</div>
      </Dialog>

      <Dialog
        open={Boolean(receipt)}
        onClose={() => setReceipt(null)}
        title={receipt?.orderId ? `Sale #${receipt.orderId} completed` : 'Offline sale recorded'}
        description={receipt?.orderId ? 'Saved on the server. Stock has been updated.' : 'Pending sync — shown as provisional until the server confirms it.'}
        footer={
          <>
            <Button variant="outline" onClick={() => setReceipt(null)}>
              New sale
            </Button>
            <Button onClick={printReceipt} leftIcon={<Printer className="h-4 w-4" />}>
              Print receipt
            </Button>
          </>
        }
      >
        {receipt && <Receipt business={business} data={receipt} />}
      </Dialog>
    </div>
  );
}
