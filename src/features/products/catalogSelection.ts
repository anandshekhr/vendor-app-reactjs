import type { Decimal, MasterCatalogItem, ProductListItem } from '@/types/api';

/** The fields price/stock validation needs; satisfied by both the shop and the public (onboarding) catalogue. */
export interface PricedCatalogItem {
  id: number;
  name: string;
  selling_price: Decimal | null;
  max_retail_price: Decimal | null;
}

export interface CatalogDraft<T extends PricedCatalogItem = MasterCatalogItem> {
  item: T;
  /** Vendor's selling price (₹). Defaults to the catalogue price. */
  price: string;
  /** Opening stock. */
  stock: string;
}

export function draftFor<T extends PricedCatalogItem>(item: T): CatalogDraft<T> {
  return { item, price: item.selling_price != null ? Number(item.selling_price).toFixed(2) : '', stock: '0' };
}

/** Mirrors the server rules (price ≥ 0 and not above MRP; whole-number stock). */
export function validateDraft(d: CatalogDraft<PricedCatalogItem>): { price?: string; stock?: string } {
  const errors: { price?: string; stock?: string } = {};
  if (!/^\d+(\.\d{1,2})?$/.test(d.price.trim())) errors.price = 'Enter a price like 45 or 45.50';
  else if (d.item.max_retail_price != null && Number(d.price) > Number(d.item.max_retail_price)) errors.price = `Above MRP ₹${Number(d.item.max_retail_price).toFixed(2)}`;
  if (!/^\d+$/.test(d.stock.trim())) errors.stock = 'Whole number';
  else if (Number(d.stock) > 100000) errors.stock = 'Too large';
  return errors;
}

export function toBulkItems(drafts: CatalogDraft<PricedCatalogItem>[]) {
  return drafts.map((d) => ({ master_product_id: d.item.id, price: Number(d.price).toFixed(2), stock: Number(d.stock) }));
}

/**
 * Older servers ignore per-item price/stock and import at catalogue price with zero stock. Compares what was requested
 * with what the server actually created so the vendor is told instead of silently getting different values.
 */
export function ignoredOverrides(drafts: CatalogDraft[], created: ProductListItem[]): string[] {
  const byName = new Map(created.map((p) => [p.name, p]));
  return drafts
    .filter((d) => {
      const p = byName.get(d.item.name);
      return p && (Number(p.price) !== Number(d.price) || p.stock !== Number(d.stock));
    })
    .map((d) => d.item.name);
}
