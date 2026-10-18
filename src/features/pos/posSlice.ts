import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { PosPaymentMethod, PosProduct } from '@/types/api';

export interface CartLine {
  product: PosProduct;
  quantity: number;
}

export interface PosState {
  lines: CartLine[];
  customerName: string;
  customerPhone: string;
  paymentMethod: PosPaymentMethod;
}

const initialState: PosState = { lines: [], customerName: '', customerPhone: '', paymentMethod: 'cash' };

const posSlice = createSlice({
  name: 'pos',
  initialState,
  reducers: {
    /** Adds a product or increments it when scanned/selected again. */
    productAdded(state, action: PayloadAction<PosProduct>) {
      const line = state.lines.find((l) => l.product.id === action.payload.id);
      if (line) {
        line.quantity += 1;
        line.product = action.payload; // keep the freshest price/stock snapshot
      } else {
        state.lines.push({ product: action.payload, quantity: 1 });
      }
    },
    quantitySet(state, action: PayloadAction<{ productId: number; quantity: number }>) {
      const q = Math.floor(action.payload.quantity);
      if (q <= 0) {
        state.lines = state.lines.filter((l) => l.product.id !== action.payload.productId);
        return;
      }
      const line = state.lines.find((l) => l.product.id === action.payload.productId);
      if (line) line.quantity = Math.min(q, 9999);
    },
    lineRemoved(state, action: PayloadAction<number>) {
      state.lines = state.lines.filter((l) => l.product.id !== action.payload);
    },
    customerChanged(state, action: PayloadAction<{ name?: string; phone?: string }>) {
      if (action.payload.name !== undefined) state.customerName = action.payload.name;
      if (action.payload.phone !== undefined) state.customerPhone = action.payload.phone;
    },
    paymentMethodChanged(state, action: PayloadAction<PosPaymentMethod>) {
      state.paymentMethod = action.payload;
    },
    cartCleared() {
      return initialState;
    },
  },
});

export const { productAdded, quantitySet, lineRemoved, customerChanged, paymentMethodChanged, cartCleared } = posSlice.actions;
export default posSlice.reducer;

/** Display-only estimate from server-provided `final_price`; the server prices the sale at checkout. */
export function estimateTotal(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + Number(l.product.final_price) * l.quantity, 0);
}

export function itemCount(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}
