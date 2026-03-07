import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { OrderState, OrderStatus } from '../../models/types';
import { orderApi } from '../../api';

const initialState: OrderState = {
  orders: [],
  selectedOrder: null,
  deliveryPartners: [],
  isLoading: false,
  error: null,
  activeTab: 'all',
};

export const fetchOrders = createAsyncThunk(
  'orders/fetchAll',
  async (params: { status?: OrderStatus; page?: number } | undefined, { rejectWithValue }) => {
    try {
      return await orderApi.getOrders(params);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch orders');
    }
  }
);

export const fetchOrderById = createAsyncThunk(
  'orders/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      return await orderApi.getOrderById(id);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch order');
    }
  }
);

export const acceptOrder = createAsyncThunk(
  'orders/accept',
  async (id: string, { rejectWithValue }) => {
    try {
      return await orderApi.acceptOrder(id);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to accept order');
    }
  }
);

export const rejectOrder = createAsyncThunk(
  'orders/reject',
  async ({ id, reason }: { id: string; reason?: string }, { rejectWithValue }) => {
    try {
      return await orderApi.rejectOrder(id, reason);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to reject order');
    }
  }
);

export const markOrderReady = createAsyncThunk(
  'orders/markReady',
  async (id: string, { rejectWithValue }) => {
    try {
      return await orderApi.markReadyForPickup(id);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update order');
    }
  }
);

export const fetchDeliveryPartners = createAsyncThunk(
  'orders/fetchPartners',
  async (_, { rejectWithValue }) => {
    try {
      return await orderApi.getDeliveryPartners();
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch partners');
    }
  }
);

export const assignDeliveryPartner = createAsyncThunk(
  'orders/assignPartner',
  async ({ orderId, partnerId }: { orderId: string; partnerId: string }, { rejectWithValue }) => {
    try {
      return await orderApi.assignDeliveryPartner(orderId, partnerId);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to assign partner');
    }
  }
);

export const autoAssignDelivery = createAsyncThunk(
  'orders/autoAssign',
  async (orderId: string, { rejectWithValue }) => {
    try {
      return await orderApi.autoAssignDelivery(orderId);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Auto assign failed');
    }
  }
);

const orderSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    clearOrderError: (state) => {
      state.error = null;
    },
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
    },
    clearSelectedOrder: (state) => {
      state.selectedOrder = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.isLoading = false;
        state.orders = action.payload.orders;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchOrderById.fulfilled, (state, action) => {
        state.selectedOrder = action.payload;
      })
      .addCase(acceptOrder.fulfilled, (state, action) => {
        const index = state.orders.findIndex((o) => o.id === action.payload.id);
        if (index !== -1) state.orders[index] = action.payload;
        state.selectedOrder = action.payload;
      })
      .addCase(rejectOrder.fulfilled, (state, action) => {
        const index = state.orders.findIndex((o) => o.id === action.payload.id);
        if (index !== -1) state.orders[index] = action.payload;
        state.selectedOrder = action.payload;
      })
      .addCase(markOrderReady.fulfilled, (state, action) => {
        const index = state.orders.findIndex((o) => o.id === action.payload.id);
        if (index !== -1) state.orders[index] = action.payload;
        state.selectedOrder = action.payload;
      })
      .addCase(fetchDeliveryPartners.fulfilled, (state, action) => {
        state.deliveryPartners = action.payload;
      })
      .addCase(assignDeliveryPartner.fulfilled, (state, action) => {
        const index = state.orders.findIndex((o) => o.id === action.payload.id);
        if (index !== -1) state.orders[index] = action.payload;
        state.selectedOrder = action.payload;
      })
      .addCase(autoAssignDelivery.fulfilled, (state, action) => {
        const index = state.orders.findIndex((o) => o.id === action.payload.id);
        if (index !== -1) state.orders[index] = action.payload;
        state.selectedOrder = action.payload;
      });
  },
});

export const { clearOrderError, setActiveTab, clearSelectedOrder } = orderSlice.actions;
export default orderSlice.reducer;
