import type { StarterCatalogItem, StarterProductSelection, VendorApplication } from '@/types/api';
import { toBulkItems, validateDraft, type CatalogDraft } from '@/features/products/catalogSelection';

/** Fallback when the server doesn't say; matches MIN_STARTER_PRODUCTS in api-services. */
export const DEFAULT_MIN_STARTER_PRODUCTS = 5;

export type StarterDraft = CatalogDraft<StarterCatalogItem>;

export function minStarterProducts(app?: Pick<VendorApplication, 'min_starter_products'> | null): number {
  return app?.min_starter_products || DEFAULT_MIN_STARTER_PRODUCTS;
}

/** Turns the selection saved on an application back into editable drafts. */
export function draftsFromSelections(selections: StarterProductSelection[]): StarterDraft[] {
  return selections.map((s) => ({
    item: {
      id: s.master_product_id,
      name: s.name,
      image: s.image,
      brand_name: s.brand_name,
      category_name: null,
      unit_name: s.unit_name,
      selling_price: s.catalogue_price,
      max_retail_price: s.max_retail_price,
    },
    price: s.price != null ? Number(s.price).toFixed(2) : s.catalogue_price != null ? Number(s.catalogue_price).toFixed(2) : '',
    stock: String(s.opening_stock ?? 0),
  }));
}

/** Everything that stops a selection from being saved, in the order the vendor should fix it. */
export function starterSelectionProblems(drafts: StarterDraft[], min: number): string[] {
  const problems: string[] = [];
  if (drafts.length < min) problems.push(`Select ${min - drafts.length} more product${min - drafts.length === 1 ? '' : 's'} (at least ${min}).`);
  const invalid = drafts.filter((d) => Object.keys(validateDraft(d)).length > 0).length;
  if (invalid) problems.push(`${invalid} product${invalid === 1 ? ' needs' : 's need'} a valid price (not above MRP) or opening stock.`);
  return problems;
}

export const toStarterItems = (drafts: StarterDraft[]) => toBulkItems(drafts);

/** Statuses an applicant sees, in plain language. */
export function applicantStatusText(app: Pick<VendorApplication, 'status'> & { can_sign_in?: boolean }): string {
  switch (app.status) {
    case 'approved':
      return 'Approved. Your shop is being set up; you can sign in once it is activated.';
    case 'active':
    case 'enrolled':
      return app.can_sign_in ? 'Your shop is live. Sign in to start selling.' : 'Approved. Your shop is being set up.';
    case 'rejected':
      return 'Your application was not approved. See the note from the team below.';
    case 'information_required':
    case 'needs_more_documents':
    case 'vendor_update_pending':
      return 'The team needs more information from you. See the note below.';
    case 'suspended':
      return 'This account is suspended. Contact support.';
    case 'on_hold':
      return 'Your application is on hold. The team will contact you.';
    default:
      return 'Under review. You will start selling once the TheNearByShop team approves your application.';
  }
}
