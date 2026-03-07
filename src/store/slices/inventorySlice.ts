import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { InventoryState, StockUpdate } from '../../models/types';
import { inventoryApi } from '../../api';

const initialState: InventoryState = {
  items: [],
  isLoading: false,
  error: null,
  showLowStockOnly: false,
};

export const fetchInventory = createAsyncThunk(
  'inventory/fetchAll',
  async (params: { lowStockOnly?: boolean } | undefined, { rejectWithValue }) => {
    try {
      return await inventoryApi.getInventory(params);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch inventory');
    }
  }
);

export const updateStock = createAsyncThunk(
  'inventory/updateStock',
  async (update: StockUpdate, { rejectWithValue }) => {
    try {
      return await inventoryApi.updateStock(update);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update stock');
    }
  }
);

export const bulkUpdateInventory = createAsyncThunk(
  'inventory/bulkUpdate',
  async (updates: StockUpdate[], { rejectWithValue }) => {
    try {
      await inventoryApi.bulkUpdateInventory(updates);
      return updates;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Bulk update failed');
    }
  }
);

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    clearInventoryError: (state) => {
      state.error = null;
    },
    toggleLowStockFilter: (state) => {
      state.showLowStockOnly = !state.showLowStockOnly;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInventory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchInventory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload.items;
      })
      .addCase(fetchInventory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(updateStock.fulfilled, (state, action) => {
        const index = state.items.findIndex((i) => i.productId === action.payload.productId);
        if (index !== -1) state.items[index] = action.payload;
      })
      .addCase(bulkUpdateInventory.fulfilled, (state) => {
        state.isLoading = false;
      });
  },
});

export const { clearInventoryError, toggleLowStockFilter } = inventorySlice.actions;
export default inventorySlice.reducer;
