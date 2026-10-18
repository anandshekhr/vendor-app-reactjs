import { clients } from '@/services/api/client';
import { normalizePage, DRF_PAGE_SIZE } from '@/services/api/pagination';
import { db, META_CATALOGUE_SYNCED_AT, setMeta, type CachedProduct, type PosDatabase } from '@/services/offline/db';
import type { PosProduct, ProductListItem, ScannedProduct } from '@/types/api';

async function fetchAllPages<T>(url: string, params: Record<string, unknown> = {}, concurrency = 3): Promise<T[]> {
  const first = normalizePage<T>((await clients.main.get(url, { params: { ...params, page: 1 } })).data);
  const pages = Math.ceil(first.count / DRF_PAGE_SIZE);
  const results = [...first.results];
  if (!first.next || pages <= 1) return results;
  const remaining = Array.from({ length: pages - 1 }, (_, i) => i + 2);
  while (remaining.length) {
    const batch = remaining.splice(0, concurrency);
    const responses = await Promise.all(batch.map((page) => clients.main.get(url, { params: { ...params, page } })));
    responses.forEach((r) => results.push(...normalizePage<T>(r.data).results));
  }
  return results;
}

export function toCached(p: PosProduct, now: number): CachedProduct {
  return {
    ...p,
    searchText: [p.name, p.sku, p.barcode].filter(Boolean).join(' ').toLowerCase(),
    syncedAt: now,
  };
}

/**
 * Replaces the device's POS catalogue snapshot with authoritative server data.
 * `/api/v2/vendors/products` (shop-scoped) carries `barcode` and `final_price`; it does not expose `is_active`, so
 * inactive ids are taken from the scoped products list and excluded (matching the POS lookup's is_active filter).
 */
export async function refreshCatalogue(database: PosDatabase = db): Promise<number> {
  const [products, inactive] = await Promise.all([
    fetchAllPages<ScannedProduct>('/api/v2/vendors/products'),
    fetchAllPages<ProductListItem>('/vendor/dashboard/api/products/', { status: 'inactive' }),
  ]);
  const inactiveIds = new Set(inactive.map((p) => p.id));
  const now = Date.now();
  const rows = products
    .filter((p) => !inactiveIds.has(p.id))
    .map((p) =>
      toCached(
        {
          id: p.id,
          name: p.name,
          sku: p.sku,
          barcode: p.barcode,
          category_name: p.category_name,
          price: p.price,
          mrp: p.mrp,
          final_price: p.final_price ?? p.price,
          stock: p.stock,
          image: p.image,
        },
        now,
      ),
    );
  await database.transaction('rw', database.products, database.meta, async () => {
    await database.products.clear();
    await database.products.bulkPut(rows);
    await setMeta(META_CATALOGUE_SYNCED_AT, now, database);
  });
  return rows.length;
}

export async function findCachedByBarcode(barcode: string, database: PosDatabase = db): Promise<CachedProduct | undefined> {
  return database.products.where('barcode').equals(barcode).first();
}

export async function searchCached(query: string, limit = 40, database: PosDatabase = db): Promise<CachedProduct[]> {
  const q = query.trim().toLowerCase();
  if (!q) return database.products.orderBy('searchText').limit(limit).toArray();
  return database.products.filter((p) => p.searchText.includes(q)).limit(limit).toArray();
}
