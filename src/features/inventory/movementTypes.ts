import type { StockMovementType, StockOperation } from '@/types/api';

export type MovementType = 'restock' | 'addition' | 'returned' | 'damaged' | 'expired' | 'reduction' | 'correction';

export interface MovementSpec {
  type: MovementType;
  label: string;
  operation: StockOperation;
  /** The type recorded in the server's stock history. */
  serverType: StockMovementType;
  description: string;
  reasonRequired: boolean;
}

/** Business movement types offered in the adjust dialog, mapped onto the server's operation and history type. */
export const MOVEMENT_TYPES: MovementSpec[] = [
  { type: 'restock', label: 'Purchase / restock', operation: 'add', serverType: 'restock', description: 'New stock received from a supplier.', reasonRequired: false },
  { type: 'addition', label: 'Stock addition', operation: 'add', serverType: 'other', description: 'Other stock increase.', reasonRequired: true },
  { type: 'returned', label: 'Customer return', operation: 'add', serverType: 'returned', description: 'Saleable item returned by a customer.', reasonRequired: true },
  { type: 'damaged', label: 'Damaged', operation: 'subtract', serverType: 'damaged', description: 'Remove damaged units.', reasonRequired: true },
  { type: 'expired', label: 'Expired', operation: 'subtract', serverType: 'expired', description: 'Remove expired units.', reasonRequired: true },
  { type: 'reduction', label: 'Stock reduction', operation: 'subtract', serverType: 'other', description: 'Other stock decrease.', reasonRequired: true },
  { type: 'correction', label: 'Stock count correction', operation: 'set', serverType: 'correction', description: 'Set the exact counted quantity.', reasonRequired: true },
];

/** Labels for the server's history types. */
export const SERVER_MOVEMENT_LABELS: Record<StockMovementType, string> = {
  restock: 'Restock',
  sale: 'Sale',
  damaged: 'Damaged',
  expired: 'Expired',
  returned: 'Returned',
  correction: 'Count correction',
  other: 'Other',
};

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
