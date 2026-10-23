import { normalizeIndianMobile } from '@/utils/phone';

export type StepId = 'phone' | 'business' | 'categories' | 'address' | 'service' | 'documents' | 'review';

export const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export type FileKey = 'business_license_files' | 'id_proof_files' | 'bank_detail_files' | 'supporting_files';

export interface OnboardingDraft {
  phone: string;
  otp: string;
  phoneVerified: boolean;
  vendorName: string;
  email: string;
  businessName: string;
  businessType: 'product' | 'service';
  categoryIds: number[];
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: string;
  longitude: string;
  gstTaxId: string;
  /** Payout account; optional at registration (it can be added from Bank accounts after approval). */
  bankHolder: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  upiId: string;
  shopHours: { day_of_week: number; start_time: string; end_time: string; open: boolean }[];
  employees: { client_id: string; full_name: string; phone: string; role: string; specialties: string }[];
  files: Record<FileKey, File[]>;
  acceptTerms: boolean;
}

const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** Mirrors the server-side rules in VendorApplicationSerializer so users see problems before submitting. */
export function validateStep(step: StepId, d: OnboardingDraft): Record<string, string> {
  const e: Record<string, string> = {};
  const all = step === 'review';
  if (step === 'phone' || all) {
    if (!d.phoneVerified) e.phone = 'Verify your mobile number first.';
  }
  if (step === 'business' || all) {
    if (d.vendorName.trim().length < 2) e.vendorName = 'Enter your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) e.email = 'Enter a valid email address.';
    if (d.businessName.trim().length < 2) e.businessName = 'Enter your business name.';
  }
  if (step === 'categories' || all) {
    if (d.categoryIds.length === 0) e.categoryIds = 'Select at least one category.';
  }
  if (step === 'address' || all) {
    if (d.address.trim().length < 5) e.address = 'Enter the full shop address.';
    if (!d.city.trim()) e.city = 'Required.';
    if (!d.state.trim()) e.state = 'Required.';
    if (!/^\d{6}$/.test(d.zipCode)) e.zipCode = 'Enter a 6-digit PIN code.';
  }
  if ((step === 'service' || all) && d.businessType === 'service') {
    const open = d.shopHours.filter((h) => h.open);
    if (open.length === 0) e.shopHours = 'Select at least one day your shop is open.';
    else if (open.some((h) => !h.start_time || !h.end_time || h.start_time >= h.end_time)) e.shopHours = 'Closing time must be after opening time.';
    if (d.employees.length === 0) e.employees = 'Add at least one employee with a mobile number.';
    else if (d.employees.some((x) => !x.full_name.trim() || !/^\+?\d{10,15}$/.test(x.phone.replace(/\s/g, '')))) e.employees = 'Each employee needs a name and a valid mobile number.';
  }
  if (step === 'documents' || all) {
    if (d.gstTaxId && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(d.gstTaxId)) e.gstTaxId = 'GSTIN must be 15 characters, e.g. 22AAAAA0000A1Z5.';
    const account = d.accountNumber.replace(/\s/g, '');
    if (account || d.ifsc) {
      if (!/^\d{6,20}$/.test(account)) e.accountNumber = 'Enter a valid account number (digits only).';
      if (!IFSC_PATTERN.test(d.ifsc.trim().toUpperCase())) e.ifsc = 'IFSC is 11 characters, e.g. HDFC0001234.';
      if (!d.bankHolder.trim()) e.bankHolder = 'Enter the account holder name.';
    }
    if (d.upiId && !/^[\w.-]{2,}@[a-zA-Z]{2,}$/.test(d.upiId.trim())) e.upiId = 'Enter a UPI ID like name@bank.';
    for (const [key, files] of Object.entries(d.files)) {
      if (files.some((f) => f.size > MAX_FILE_BYTES)) e[key] = 'Each file must be 10 MB or smaller.';
    }
  }
  if (all && !d.acceptTerms) e.acceptTerms = 'Please confirm to continue.';
  return e;
}

export function buildApplicationFormData(d: OnboardingDraft): FormData {
  const fd = new FormData();
  fd.append('vendor_name', d.vendorName.trim());
  fd.append('email', d.email.trim());
  fd.append('phone', normalizeIndianMobile(d.phone));
  // Older servers read this flag; updated ones ignore it and check their own OTP records.
  fd.append('phone_verified', String(d.phoneVerified));
  fd.append('business_name', d.businessName.trim());
  fd.append('gst_tax_id', d.gstTaxId.trim());
  fd.append('address', d.address.trim());
  fd.append('city', d.city.trim());
  fd.append('state', d.state.trim());
  fd.append('zip_code', d.zipCode.trim());
  if (d.latitude && d.longitude) {
    fd.append('latitude', d.latitude);
    fd.append('longitude', d.longitude);
  }
  d.categoryIds.forEach((id) => fd.append('category_ids', String(id)));
  const account = d.accountNumber.replace(/\s/g, '');
  if (account) {
    fd.append('bank_account_holder_name', d.bankHolder.trim());
    fd.append('bank_name', d.bankName.trim());
    fd.append('account_number', account);
    fd.append('ifsc_code', d.ifsc.trim().toUpperCase());
  }
  if (d.upiId.trim()) fd.append('upi_id', d.upiId.trim());
  if (d.businessType === 'service') {
    fd.append(
      'shop_hours_payload',
      JSON.stringify(d.shopHours.filter((h) => h.open).map(({ day_of_week, start_time, end_time }) => ({ day_of_week, start_time, end_time }))),
    );
    fd.append(
      'employees_payload',
      JSON.stringify(
        d.employees.map((x) => ({
          client_id: x.client_id,
          full_name: x.full_name.trim(),
          phone: x.phone.replace(/\s/g, ''),
          role: x.role.trim(),
          specialties: x.specialties.trim(),
          availability: d.shopHours.filter((h) => h.open).map(({ day_of_week, start_time, end_time }) => ({ day_of_week, start_time, end_time })),
        })),
      ),
    );
  }
  (Object.keys(d.files) as FileKey[]).forEach((key) => d.files[key].forEach((f) => fd.append(key, f)));
  return fd;
}
