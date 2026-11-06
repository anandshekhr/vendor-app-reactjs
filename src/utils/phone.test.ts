import { describe, expect, it } from 'vitest';
import { isValidIndianMobile, normalizeIndianMobile, toIndianE164 } from './phone';

describe('Indian mobile numbers', () => {
  it('sends the +91 form the shared login API stores, whatever the vendor typed', () => {
    for (const typed of ['9812345678', '98123 45678', '+91 98123-45678', '919812345678', '09812345678']) {
      expect(toIndianE164(typed)).toBe('+919812345678');
    }
  });

  it('keeps the 10-digit form for display and validation', () => {
    expect(normalizeIndianMobile('+91 98123 45678')).toBe('9812345678');
    expect(isValidIndianMobile('+919812345678')).toBe(true);
    expect(isValidIndianMobile('12345')).toBe(false);
  });
});
