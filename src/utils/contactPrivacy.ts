/**
 * The API masks a customer's phone/email for vendors some time after an order closes (api-services
 * common/contact_privacy.py), e.g. "+91•••••••678". Masked values can't be dialled or matched in full.
 */
export const CONTACT_MASK = '•';

export function isMaskedContact(value?: string | null): boolean {
  return Boolean(value && value.includes(CONTACT_MASK));
}
