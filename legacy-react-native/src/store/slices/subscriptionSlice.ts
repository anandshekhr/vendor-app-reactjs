import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { SubscriptionState, SubscriptionStatus } from '../../models/types';
import { subscriptionApi } from '../../api';

const initialState: SubscriptionState = {
  subscriptions: [],
  todayDeliveries: [],
  selectedSubscription: null,
  isLoading: false,
  error: null,
  activeTab: 'all',
  stats: {
    totalActive: 0,
    todayDeliveries: 0,
    tomorrowDeliveries: 0,
    monthlyRecurringRevenue: 0,
  },
};

export const fetchSubscriptions = createAsyncThunk(
  'subscriptions/fetchAll',
  async (params: { status?: SubscriptionStatus; page?: number } | undefined, { rejectWithValue }) => {
    try {
      return await subscriptionApi.getSubscriptions(params);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch subscriptions');
    }
  }
);

export const fetchSubscriptionStats = createAsyncThunk(
  'subscriptions/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      return await subscriptionApi.getStats();
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch stats');
    }
  }
);

export const fetchTodayDeliveries = createAsyncThunk(
  'subscriptions/fetchToday',
  async (_, { rejectWithValue }) => {
    try {
      return await subscriptionApi.getTodayDeliveries();
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch deliveries');
    }
  }
);

export const fetchSubscriptionById = createAsyncThunk(
  'subscriptions/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      return await subscriptionApi.getSubscriptionById(id);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch subscription');
    }
  }
);

export const pauseSubscription = createAsyncThunk(
  'subscriptions/pause',
  async (id: string, { rejectWithValue }) => {
    try {
      return await subscriptionApi.pauseSubscription(id);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to pause');
    }
  }
);

export const resumeSubscription = createAsyncThunk(
  'subscriptions/resume',
  async (id: string, { rejectWithValue }) => {
    try {
      return await subscriptionApi.resumeSubscription(id);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to resume');
    }
  }
);

export const cancelSubscription = createAsyncThunk(
  'subscriptions/cancel',
  async ({ id, reason }: { id: string; reason?: string }, { rejectWithValue }) => {
    try {
      return await subscriptionApi.cancelSubscription(id, reason);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to cancel');
    }
  }
);

export const skipDelivery = createAsyncThunk(
  'subscriptions/skipDelivery',
  async ({ id, deliveryDate }: { id: string; deliveryDate: string }, { rejectWithValue }) => {
    try {
      return await subscriptionApi.skipDelivery(id, deliveryDate);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to skip');
    }
  }
);

export const updateSubscriptionQuantity = createAsyncThunk(
  'subscriptions/updateQuantity',
  async ({ id, quantity }: { id: string; quantity: number }, { rejectWithValue }) => {
    try {
      return await subscriptionApi.updateQuantity(id, quantity);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update quantity');
    }
  }
);

export const markSubscriptionDelivered = createAsyncThunk(
  'subscriptions/markDelivered',
  async (deliveryId: string, { rejectWithValue }) => {
    try {
      return await subscriptionApi.markDelivered(deliveryId);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to mark delivered');
    }
  }
);

const subscriptionSlice = createSlice({
  name: 'subscriptions',
  initialState,
  reducers: {
    clearSubscriptionError: (state) => {
      state.error = null;
    },
    setSubscriptionTab: (state, action) => {
      state.activeTab = action.payload;
    },
    clearSelectedSubscription: (state) => {
      state.selectedSubscription = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSubscriptions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSubscriptions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.subscriptions = action.payload.subscriptions;
      })
      .addCase(fetchSubscriptions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchSubscriptionStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      })
      .addCase(fetchTodayDeliveries.fulfilled, (state, action) => {
        state.todayDeliveries = action.payload.deliveries;
      })
      .addCase(fetchSubscriptionById.fulfilled, (state, action) => {
        state.selectedSubscription = action.payload;
      })
      .addCase(pauseSubscription.fulfilled, (state, action) => {
        const index = state.subscriptions.findIndex((s) => s.id === action.payload.id);
        if (index !== -1) state.subscriptions[index] = action.payload;
        state.selectedSubscription = action.payload;
      })
      .addCase(resumeSubscription.fulfilled, (state, action) => {
        const index = state.subscriptions.findIndex((s) => s.id === action.payload.id);
        if (index !== -1) state.subscriptions[index] = action.payload;
        state.selectedSubscription = action.payload;
      })
      .addCase(cancelSubscription.fulfilled, (state, action) => {
        const index = state.subscriptions.findIndex((s) => s.id === action.payload.id);
        if (index !== -1) state.subscriptions[index] = action.payload;
        state.selectedSubscription = action.payload;
      })
      .addCase(updateSubscriptionQuantity.fulfilled, (state, action) => {
        const index = state.subscriptions.findIndex((s) => s.id === action.payload.id);
        if (index !== -1) state.subscriptions[index] = action.payload;
        state.selectedSubscription = action.payload;
      })
      .addCase(markSubscriptionDelivered.fulfilled, (state, action) => {
        const index = state.todayDeliveries.findIndex((d) => d.id === action.payload.id);
        if (index !== -1) state.todayDeliveries[index] = action.payload;
      });
  },
});

export const { clearSubscriptionError, setSubscriptionTab, clearSelectedSubscription } = subscriptionSlice.actions;
export default subscriptionSlice.reducer;
