import { describe, expect, it } from 'vitest';
import type { StarterCatalogItem, StarterProductSelection } from '@/types/api';
import { draftFor } from '@/features/products/catalogSelection';
import { buildApplicationFormData, validateStep, type OnboardingDraft } from './draft';
import { applicantStatusText, draftsFromSelections, minStarterProducts, starterSelectionProblems, toStarterItems } from './starterProducts';

const item = (id: number): StarterCatalogItem => ({ id, name: `Item ${id}`, image: null, brand_name: null, category_name: null, unit_name: null, selling_price: '40.00', max_retail_price: '50.00' });

describe('starter products', () => {
  it('requires the minimum number of valid products', () => {
    const four = [1, 2, 3, 4].map((i) => draftFor(item(i)));
    expect(starterSelectionProblems(four, 5)).toEqual(['Select 1 more product (at least 5).']);
    const five = [...four, draftFor(item(5))];
    expect(starterSelectionProblems(five, 5)).toEqual([]);
    five[0] = { ...five[0], price: '60' };
    expect(starterSelectionProblems(five, 5)[0]).toMatch(/1 product needs a valid price/);
  });

  it('falls back to 5 when the server does not say', () => {
    expect(minStarterProducts(null)).toBe(5);
    expect(minStarterProducts({ min_starter_products: 8 })).toBe(8);
  });

  it('round-trips the saved selection into editable drafts and back', () => {
    const saved: StarterProductSelection = { master_product_id: 9, name: 'Salt', image: null, brand_name: 'Tata', unit_name: 'kg', max_retail_price: '30.00', catalogue_price: '28.00', price: null, opening_stock: 4 };
    const [d] = draftsFromSelections([saved, { ...saved, master_product_id: 10, price: '29.5' }]).slice(0, 1);
    expect(d).toMatchObject({ price: '28.00', stock: '4' });
    expect(toStarterItems(draftsFromSelections([{ ...saved, price: '29.5' }]))).toEqual([{ master_product_id: 9, price: '29.50', stock: 4 }]);
  });

  it('explains statuses in plain language', () => {
    expect(applicantStatusText({ status: 'under_review' })).toMatch(/start selling once/);
    expect(applicantStatusText({ status: 'active', can_sign_in: true })).toMatch(/Sign in/);
  });
});

describe('registration bank details', () => {
  const base = { accountNumber: '', ifsc: '', bankHolder: '', bankName: '', upiId: '', gstTaxId: '', files: { business_license_files: [], id_proof_files: [], bank_detail_files: [], supporting_files: [] } } as unknown as OnboardingDraft;

  it('are optional, but validated once started', () => {
    expect(validateStep('documents', base)).toEqual({});
    const errs = validateStep('documents', { ...base, accountNumber: '12ab', ifsc: 'HDFC1' });
    expect(Object.keys(errs).sort()).toEqual(['accountNumber', 'bankHolder', 'ifsc']);
    expect(validateStep('documents', { ...base, accountNumber: '1234 5678 9012', ifsc: 'hdfc0001234', bankHolder: 'Ravi' })).toEqual({});
  });

  it('are only sent when an account number is given', () => {
    const draft = { ...base, phone: '9812345678', vendorName: 'R', email: 'r@x.in', businessName: 'B', address: 'a', city: 'c', state: 's', zipCode: '560001', latitude: '', longitude: '', categoryIds: [10], businessType: 'product', shopHours: [], employees: [] } as OnboardingDraft;
    expect(buildApplicationFormData(draft).has('account_number')).toBe(false);
    const fd = buildApplicationFormData({ ...draft, accountNumber: '1234 5678 9012', ifsc: 'hdfc0001234', bankHolder: 'Ravi' });
    expect(fd.get('account_number')).toBe('123456789012');
    expect(fd.get('ifsc_code')).toBe('HDFC0001234');
  });
});
