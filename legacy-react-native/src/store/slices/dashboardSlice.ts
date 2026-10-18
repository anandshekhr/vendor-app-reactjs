import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { DashboardStats, AnalyticsData, PlanState, VendorPlan, VendorSubscription, AppNotification } from '../../models/types';
import { dashboardApi, analyticsApi, planApi, notificationApi } from '../../api';

// Dashboard
interface DashboardState {
  stats: DashboardStats | null;
  analytics: AnalyticsData | null;
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
}

const initialDashboardState: DashboardState = {
  stats: null,
  analytics: null,
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
};

export const fetchDashboardStats = createAsyncThunk(
  'dashboard/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      return await dashboardApi.getStats();
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch stats');
    }
  }
);

export const fetchAnalytics = createAsyncThunk(
  'dashboard/fetchAnalytics',
  async (period: 'daily' | 'weekly' | 'monthly' = 'daily', { rejectWithValue }) => {
    try {
      return await analyticsApi.getAnalytics(period);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch analytics');
    }
  }
);

export const fetchNotifications = createAsyncThunk(
  'dashboard/fetchNotifications',
  async (params: { page?: number } | undefined, { rejectWithValue }) => {
    try {
      return await notificationApi.getNotifications(params);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch notifications');
    }
  }
);

export const markNotificationRead = createAsyncThunk(
  'dashboard/markNotificationRead',
  async (id: string, { rejectWithValue }) => {
    try {
      await notificationApi.markAsRead(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed');
    }
  }
);

export const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState: initialDashboardState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardStats.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.isLoading = false;
        state.stats = action.payload;
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchAnalytics.fulfilled, (state, action) => {
        state.analytics = action.payload;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.notifications = action.payload.notifications;
        state.unreadCount = action.payload.notifications.filter((n) => !n.isRead).length;
      })
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const notification = state.notifications.find((n) => n.id === action.payload);
        if (notification) {
          notification.isRead = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      });
  },
});

// Plans
const initialPlanState: PlanState = {
  plans: [],
  currentSubscription: null,
  isLoading: false,
  error: null,
};

export const fetchPlans = createAsyncThunk(
  'plans/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return await planApi.getPlans();
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch plans');
    }
  }
);

export const fetchCurrentPlan = createAsyncThunk(
  'plans/fetchCurrent',
  async (_, { rejectWithValue }) => {
    try {
      return await planApi.getCurrentSubscription();
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed');
    }
  }
);

export const purchasePlan = createAsyncThunk(
  'plans/purchase',
  async ({ planId, paymentId }: { planId: string; paymentId: string }, { rejectWithValue }) => {
    try {
      return await planApi.purchasePlan(planId, paymentId);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Purchase failed');
    }
  }
);

export const planSlice = createSlice({
  name: 'plans',
  initialState: initialPlanState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlans.fulfilled, (state, action) => {
        state.plans = action.payload;
      })
      .addCase(fetchCurrentPlan.fulfilled, (state, action) => {
        state.currentSubscription = action.payload;
      })
      .addCase(purchasePlan.fulfilled, (state, action) => {
        state.currentSubscription = action.payload;
      });
  },
});

export const dashboardReducer = dashboardSlice.reducer;
export const planReducer = planSlice.reducer;
