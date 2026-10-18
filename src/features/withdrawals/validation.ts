import { z } from 'zod';

/** Serializer minimum (WithdrawalRequestCreateSerializer.amount min_value=100). */
export const MIN_WITHDRAWAL = 100;

export function withdrawalSchema(available: number) {
  return z.object({
    amount: z
      .string()
      .trim()
      .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), 'Enter an amount like 500 or 500.50')
      .refine((v) => Number(v) >= MIN_WITHDRAWAL, `Minimum withdrawal is ₹${MIN_WITHDRAWAL}`)
      .refine((v) => Number(v) <= available, 'Amount exceeds your available balance'),
    bankAccountId: z.string().min(1, 'Choose a verified bank account'),
    notes: z.string().max(500).optional(),
  });
}

export type WithdrawalValues = z.infer<ReturnType<typeof withdrawalSchema>>;
