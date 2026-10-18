import type { StockOperation, StockUpdateResponse } from '@/types/api';
import { db, type PosDatabase } from '@/services/offline/db';

export type MovementType = 'restock' | 'addition' | 'returned' | 'damaged' | 'expired' | 'reduction' | 'correction';

export interface MovementSpec {
  type: MovementType;
  label: string;
  operation: StockOperation;
  description: string;
  reasonRequired: boolean;
}

/**
 * The backend accepts only `add | subtract | set` (StockUpdateAPIView). Business movement types are mapped onto those;
 * the type, reason and reference are kept in the device-local journal until the server has a ledger (API_MAPPING G-8).
 */
export const MOVEMENT_TYPES: MovementSpec[] = [
  { type: 'restock', label: 'Purchase / restock', operation: 'add', description: 'New stock received from a supplier.', reasonRequired: false },
  { type: 'addition', label: 'Stock addition', operation: 'add', description: 'Other stock increase.', reasonRequired: true },
  { type: 'returned', label: 'Customer return', operation: 'add', description: 'Saleable item returned by a customer.', reasonRequired: true },
  { type: 'damaged', label: 'Damaged', operation: 'subtract', description: 'Remove damaged units.', reasonRequired: true },
  { type: 'expired', label: 'Expired', operation: 'subtract', description: 'Remove expired units.', reasonRequired: true },
  { type: 'reduction', label: 'Stock reduction', operation: 'subtract', description: 'Other stock decrease.', reasonRequired: true },
  { type: 'correction', label: 'Stock count correction', operation: 'set', description: 'Set the exact counted quantity.', reasonRequired: true },
];

export function movementSpec(type: MovementType): MovementSpec {
  return MOVEMENT_TYPES.find((m) => m.type === type)!;
}

/** Client-side pre-check for obvious mistakes; the server performs the authoritative validation. */
export function validateAdjustment(spec: MovementSpec, quantity: number, currentStock: number | null): string | null {
  if (!Number.isInteger(quantity) || quantity < 0) return 'Enter a whole number.';
  if (spec.operation !== 'set' && quantity === 0) return 'Quantity must be greater than zero.';
  if (spec.operation === 'subtract' && currentStock !== null && quantity > currentStock) {
    return `Only ${currentStock} in stock (as last loaded). The server will reject a negative result.`;
  }
  return null;
}

export async function recordJournal(
  res: StockUpdateResponse,
  spec: MovementSpec,
  quantity: number,
  reason: string,
  reference: string,
  database: PosDatabase = db,
) {
  await database.stockJournal.add({
    productId: res.product_id,
    productName: res.product_name,
    movementType: spec.type,
    operation: spec.operation,
    quantity,
    previousStock: res.previous_stock,
    newStock: res.new_stock,
    reason,
    reference,
    at: Date.now(),
  });
}
