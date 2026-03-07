import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthState, Vendor, LoginRequest, OTPVerifyRequest, RegisterRequest } from '../../models/types';
import { authApi } from '../../api';
import { STORAGE_KEYS } from '../../utils/constants';

const initialState: AuthState = {
  isAuthenticated: false,
  token: null,
  vendor: null,
  isLoading: false,
  otpSent: false,
  error: null,
};

export const sendOTP = createAsyncThunk(
  'auth/sendOTP',
  async (data: LoginRequest, { rejectWithValue }) => {
    try {
      const response = await authApi.sendOTP(data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send OTP');
    }
  }
);

export const verifyOTP = createAsyncThunk(
  'auth/verifyOTP',
  async (data: OTPVerifyRequest, { rejectWithValue }) => {
    try {
      const response = await authApi.verifyOTP(data);
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.token);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'OTP verification failed');
    }
  }
);

export const registerVendor = createAsyncThunk(
  'auth/register',
  async (data: RegisterRequest, { rejectWithValue }) => {
    try {
      const response = await authApi.register(data);
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.token);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Registration failed');
    }
  }
);

export const loadStoredAuth = createAsyncThunk(
  'auth/loadStored',
  async (_, { rejectWithValue }) => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (token) {
        const vendor = await authApi.getProfile();
        return { token, vendor };
      }
      return null;
    } catch (error: any) {
      await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      return rejectWithValue('Session expired');
    }
  }
);

export const updateVendorProfile = createAsyncThunk(
  'auth/updateProfile',
  async (data: Partial<Vendor>, { rejectWithValue }) => {
    try {
      const vendor = await authApi.updateProfile(data);
      return vendor;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Update failed');
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    await authApi.logout();
  } finally {
    await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    resetOTPState: (state) => {
      state.otpSent = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Send OTP
      .addCase(sendOTP.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(sendOTP.fulfilled, (state) => {
        state.isLoading = false;
        state.otpSent = true;
      })
      .addCase(sendOTP.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Verify OTP
      .addCase(verifyOTP.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyOTP.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.token = action.payload.token;
        state.vendor = action.payload.vendor;
      })
      .addCase(verifyOTP.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Register
      .addCase(registerVendor.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerVendor.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.token = action.payload.token;
        state.vendor = action.payload.vendor;
      })
      .addCase(registerVendor.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Load stored auth
      .addCase(loadStoredAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadStoredAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.isAuthenticated = true;
          state.token = action.payload.token;
          state.vendor = action.payload.vendor;
        }
      })
      .addCase(loadStoredAuth.rejected, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.token = null;
        state.vendor = null;
      })
      // Update Profile
      .addCase(updateVendorProfile.fulfilled, (state, action) => {
        state.vendor = action.payload;
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.token = null;
        state.vendor = null;
        state.otpSent = false;
      });
  },
});

export const { clearError, resetOTPState } = authSlice.actions;
export default authSlice.reducer;
