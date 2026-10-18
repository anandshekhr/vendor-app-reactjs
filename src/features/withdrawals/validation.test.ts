import { describe, expect, it } from 'vitest';
import { bankAccountSchema } from '@/features/bank-accounts/validation';
import { withdrawalSchema } from './validation';

describe('withdrawal validation', () => {
  const schema = withdrawalSchema(1000);
  it('enforces the server minimum and available balance', () => {
    expect(schema.safeParse({ amount: '99', bankAccountId: '1' }).success).toBe(false);
    expect(schema.safeParse({ amount: '1000.01', bankAccountId: '1' }).success).toBe(false);
    expect(schema.safeParse({ amount: '500.5', bankAccountId: '1' }).success).toBe(true);
    expect(schema.safeParse({ amount: '12.345', bankAccountId: '1' }).success).toBe(false);
  });
  it('requires a bank account', () => {
    expect(schema.safeParse({ amount: '500', bankAccountId: '' }).success).toBe(false);
  });
});

describe('bank account validation', () => {
  const valid = {
    account_holder_name: 'Asha Rao',
    bank_name: 'SBI',
    account_number: '123456789012',
    confirm_account_number: '123456789012',
    ifsc_code: 'sbin0001234',
    account_type: 'savings' as const,
    upi_id: '',
    is_primary: true,
  };
  it('accepts a valid account and upper-cases IFSC', () => {
    const r = bankAccountSchema.safeParse(valid);
    expect(r.success && r.data.ifsc_code).toBe('SBIN0001234');
  });
  it('rejects bad IFSC, short numbers and mismatched confirmation', () => {
    expect(bankAccountSchema.safeParse({ ...valid, ifsc_code: 'SBIN1234' }).success).toBe(false);
    expect(bankAccountSchema.safeParse({ ...valid, account_number: '1234', confirm_account_number: '1234' }).success).toBe(false);
    const mismatch = bankAccountSchema.safeParse({ ...valid, confirm_account_number: '123456789013' });
    expect(mismatch.success).toBe(false);
    expect(!mismatch.success && mismatch.error.issues[0].path).toEqual(['confirm_account_number']);
  });
});
