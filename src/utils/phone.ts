/** Normalises Indian mobile numbers to the 10-digit national form the backend matches on. */
export function normalizeIndianMobile(input: string): string {
  const digits = input.replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/**
 * "+91XXXXXXXXXX": the form the shared login/signup API (/api/v1/login/...) stores users in. Send this to the
 * server so a vendor's account matches the one every other TheNearByShop app creates for the same number.
 */
export function toIndianE164(input: string): string {
  return `+91${normalizeIndianMobile(input)}`;
}

export function isValidIndianMobile(input: string): boolean {
  return /^[6-9]\d{9}$/.test(normalizeIndianMobile(input));
}
