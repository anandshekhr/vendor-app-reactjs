import { z } from 'zod';

export const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export const bankAccountSchema = z
  .object({
    account_holder_name: z.string().trim().min(3, 'Enter the name exactly as on the bank account').max(255),
    bank_name: z.string().trim().min(2, 'Enter the bank name').max(255),
    account_number: z
      .string()
      .trim()
      .refine((v) => /^\d{9,18}$/.test(v), 'Account number must be 9–18 digits'),
    confirm_account_number: z.string().trim(),
    ifsc_code: z
      .string()
      .trim()
      .transform((v) => v.toUpperCase())
      .refine((v) => IFSC_RE.test(v), 'IFSC must look like SBIN0001234'),
    account_type: z.enum(['savings', 'current']),
    upi_id: z
      .string()
      .trim()
      .refine((v) => v === '' || /^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/.test(v), 'Enter a valid UPI ID like name@bank')
      .optional(),
    is_primary: z.boolean(),
  })
  .refine((v) => v.account_number === v.confirm_account_number, { path: ['confirm_account_number'], message: 'Account numbers do not match' });

export type BankAccountValues = z.infer<typeof bankAccountSchema>;
