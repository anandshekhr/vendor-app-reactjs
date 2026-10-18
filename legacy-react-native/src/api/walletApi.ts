import { apiClient } from './client';
import {
  Wallet,
  Transaction,
  WithdrawalRequest,
  BankAccount,
} from '../models/types';

interface TransactionListResponse {
  transactions: Transaction[];
  total: number;
  page: number;
}

export const walletApi = {
  getWallet: (): Promise<Wallet> =>
    apiClient.get('/vendor/wallet'),

  getTransactions: (params?: { page?: number; limit?: number; type?: string }): Promise<TransactionListResponse> =>
    apiClient.get('/vendor/wallet/transactions', { params }),

  requestWithdrawal: (data: WithdrawalRequest): Promise<Transaction> =>
    apiClient.post('/vendor/wallet/withdraw', data),

  rechargeWallet: (data: { amount: number; paymentId: string }): Promise<Transaction> =>
    apiClient.post('/vendor/wallet/recharge', data),

  getBankAccounts: (): Promise<BankAccount[]> =>
    apiClient.get('/vendor/bank-accounts'),

  addBankAccount: (data: Omit<BankAccount, 'id' | 'isVerified' | 'isPrimary'>): Promise<BankAccount> =>
    apiClient.post('/vendor/bank-accounts', data),

  deleteBankAccount: (id: string): Promise<void> =>
    apiClient.delete(`/vendor/bank-accounts/${encodeURIComponent(id)}`),

  setPrimaryBankAccount: (id: string): Promise<BankAccount> =>
    apiClient.patch(`/vendor/bank-accounts/${encodeURIComponent(id)}/primary`),

  searchTransactions: (query: string): Promise<TransactionListResponse> =>
    apiClient.get('/vendor/wallet/transactions/search', { params: { q: query } }),
};
