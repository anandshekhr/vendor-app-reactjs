import { api } from '@/services/api';
import { normalizePage, type Paginated } from '@/services/api/pagination';
import type { BankAccount, WalletBalanceBreakdown, WalletResponse, WalletTransaction, Withdrawal } from '@/types/api';

export interface BankAccountCreate {
  account_holder_name: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  account_type: 'savings' | 'current';
  upi_id?: string;
  is_primary?: boolean;
}

export const walletApi = api.injectEndpoints({
  endpoints: (build) => ({
    getWallet: build.query<WalletResponse, void>({
      query: () => '/vendor/dashboard/api/wallet/',
      providesTags: ['Wallet'],
    }),
    getBalanceBreakdown: build.query<WalletBalanceBreakdown, void>({
      query: () => '/api/v2/vendors/wallet/balance/',
      providesTags: ['Wallet'],
    }),
    listTransactions: build.query<Paginated<WalletTransaction>, { page?: number }>({
      query: ({ page = 1 }) => ({ url: '/api/v2/wallet/transactions/', params: { page } }),
      transformResponse: (data: unknown) => normalizePage<WalletTransaction>(data),
      providesTags: ['Transactions'],
    }),
    /** v2 list includes `is_verified`; the scoped vendor_dashboard serializer does not. */
    listBankAccounts: build.query<BankAccount[], void>({
      query: () => '/api/v2/vendors/bank-accounts/',
      transformResponse: (data: unknown) => normalizePage<BankAccount>(data).results,
      providesTags: ['BankAccounts'],
    }),
    createBankAccount: build.mutation<BankAccount, BankAccountCreate>({
      query: (data) => ({ url: '/vendor/dashboard/api/bank-accounts/', method: 'POST', data }),
      invalidatesTags: ['BankAccounts'],
    }),
    deleteBankAccount: build.mutation<void, number>({
      query: (id) => ({ url: `/vendor/dashboard/api/bank-accounts/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['BankAccounts'],
    }),
    listWithdrawals: build.query<Paginated<Withdrawal>, { page?: number }>({
      query: ({ page = 1 }) => ({ url: '/api/v2/vendors/withdrawals/', params: { page } }),
      transformResponse: (data: unknown) => normalizePage<Withdrawal>(data),
      providesTags: [{ type: 'Withdrawals', id: 'LIST' }],
    }),
    getWithdrawal: build.query<Withdrawal, number>({
      query: (id) => `/api/v2/vendors/withdrawals/${id}/`,
      providesTags: (_r, _e, id) => [{ type: 'Withdrawals', id }],
    }),
    createWithdrawal: build.mutation<Withdrawal, { amount: string; bank_account_id: number; notes?: string; idempotencyKey: string }>({
      query: ({ idempotencyKey, ...data }) => ({
        url: '/api/v2/vendors/withdrawals/',
        method: 'POST',
        data,
        headers: { 'Idempotency-Key': idempotencyKey },
      }),
      invalidatesTags: [{ type: 'Withdrawals', id: 'LIST' }, 'Wallet', 'Dashboard'],
    }),
  }),
});

export const {
  useGetWalletQuery,
  useGetBalanceBreakdownQuery,
  useListTransactionsQuery,
  useListBankAccountsQuery,
  useCreateBankAccountMutation,
  useDeleteBankAccountMutation,
  useListWithdrawalsQuery,
  useGetWithdrawalQuery,
  useCreateWithdrawalMutation,
} = walletApi;
