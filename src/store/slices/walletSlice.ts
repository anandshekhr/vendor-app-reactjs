import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { WalletState, WithdrawalRequest, BankAccount } from '../../models/types';
import { walletApi } from '../../api';

const initialState: WalletState = {
  wallet: null,
  transactions: [],
  bankAccounts: [],
  isLoading: false,
  error: null,
};

export const fetchWallet = createAsyncThunk(
  'wallet/fetch',
  async (_, { rejectWithValue }) => {
    try {
      return await walletApi.getWallet();
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch wallet');
    }
  }
);

export const fetchTransactions = createAsyncThunk(
  'wallet/fetchTransactions',
  async (params: { page?: number; type?: string } | undefined, { rejectWithValue }) => {
    try {
      return await walletApi.getTransactions(params);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch transactions');
    }
  }
);

export const requestWithdrawal = createAsyncThunk(
  'wallet/withdraw',
  async (data: WithdrawalRequest, { rejectWithValue }) => {
    try {
      return await walletApi.requestWithdrawal(data);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Withdrawal failed');
    }
  }
);

export const rechargeWallet = createAsyncThunk(
  'wallet/recharge',
  async (data: { amount: number; paymentId: string }, { rejectWithValue }) => {
    try {
      return await walletApi.rechargeWallet(data);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Recharge failed');
    }
  }
);

export const fetchBankAccounts = createAsyncThunk(
  'wallet/fetchBankAccounts',
  async (_, { rejectWithValue }) => {
    try {
      return await walletApi.getBankAccounts();
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch bank accounts');
    }
  }
);

export const addBankAccount = createAsyncThunk(
  'wallet/addBankAccount',
  async (data: Omit<BankAccount, 'id' | 'isVerified' | 'isPrimary'>, { rejectWithValue }) => {
    try {
      return await walletApi.addBankAccount(data);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add bank account');
    }
  }
);

export const deleteBankAccount = createAsyncThunk(
  'wallet/deleteBankAccount',
  async (id: string, { rejectWithValue }) => {
    try {
      await walletApi.deleteBankAccount(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete bank account');
    }
  }
);

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    clearWalletError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWallet.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchWallet.fulfilled, (state, action) => {
        state.isLoading = false;
        state.wallet = action.payload;
      })
      .addCase(fetchWallet.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.transactions = action.payload.transactions;
      })
      .addCase(requestWithdrawal.fulfilled, (state, action) => {
        state.transactions.unshift(action.payload);
        if (state.wallet) {
          state.wallet.balance -= action.payload.amount;
        }
      })
      .addCase(rechargeWallet.fulfilled, (state, action) => {
        state.transactions.unshift(action.payload);
        if (state.wallet) {
          state.wallet.balance += action.payload.amount;
        }
      })
      .addCase(fetchBankAccounts.fulfilled, (state, action) => {
        state.bankAccounts = action.payload;
      })
      .addCase(addBankAccount.fulfilled, (state, action) => {
        state.bankAccounts.push(action.payload);
      })
      .addCase(deleteBankAccount.fulfilled, (state, action) => {
        state.bankAccounts = state.bankAccounts.filter((a) => a.id !== action.payload);
      });
  },
});

export const { clearWalletError } = walletSlice.actions;
export default walletSlice.reducer;
