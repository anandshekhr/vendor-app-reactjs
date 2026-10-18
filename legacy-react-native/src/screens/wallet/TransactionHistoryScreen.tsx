import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchTransactions } from '../../store/slices/walletSlice';
import { EmptyState } from '../../components';
import { colors, fonts, spacing, borderRadius, shadows } from '../../utils/theme';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { Transaction } from '../../models/types';

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'credit', label: 'Credits' },
  { key: 'debit', label: 'Debits' },
];

const TransactionHistoryScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const { transactions, isLoading } = useAppSelector((state) => state.wallet);
  const [filter, setFilter] = useState('all');

  const loadTransactions = useCallback(() => {
    dispatch(fetchTransactions({}));
  }, [dispatch]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const filtered = filter === 'all'
    ? transactions
    : transactions.filter((t) => t.type === filter);

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.txnCard}>
      <View style={[styles.txnIcon, item.type === 'credit' ? styles.creditIcon : styles.debitIcon]}>
        <Text style={styles.txnEmoji}>{item.type === 'credit' ? '⬇️' : '⬆️'}</Text>
      </View>
      <View style={styles.txnInfo}>
        <Text style={styles.txnDesc}>{item.description}</Text>
        <Text style={styles.txnDate}>{formatDate(item.createdAt)}</Text>
        {item.referenceId && (
          <Text style={styles.txnRef}>Ref: {item.referenceId}</Text>
        )}
      </View>
      <View style={styles.txnAmountContainer}>
        <Text style={[styles.txnAmount, item.type === 'credit' ? styles.credit : styles.debit]}>
          {item.type === 'credit' ? '+' : '-'}{formatCurrency(item.amount)}
        </Text>
        <Text style={styles.txnStatus}>{item.status}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        {FILTER_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.filterChip, filter === tab.key && styles.filterChipActive]}
            onPress={() => setFilter(tab.key)}
          >
            <Text style={[styles.filterText, filter === tab.key && styles.filterTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadTransactions} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              title="No Transactions"
              message="Your transaction history will appear here"
              icon={<Text style={{ fontSize: 48 }}>💳</Text>}
            />
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  filterRow: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.white,
    gap: spacing.sm,
  },
  filterChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  filterChipActive: { backgroundColor: colors.primary },
  filterText: { fontSize: fonts.sizes.sm, color: colors.textSecondary, fontWeight: '500' },
  filterTextActive: { color: colors.white },
  listContent: { padding: spacing.lg, flexGrow: 1 },
  txnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  txnIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  creditIcon: { backgroundColor: '#e8f5e9' },
  debitIcon: { backgroundColor: '#fbe9e7' },
  txnEmoji: { fontSize: 18 },
  txnInfo: { flex: 1, marginLeft: spacing.md },
  txnDesc: { fontSize: fonts.sizes.md, fontWeight: '500', color: colors.text },
  txnDate: { fontSize: fonts.sizes.xs, color: colors.textLight, marginTop: 2 },
  txnRef: { fontSize: fonts.sizes.xs, color: colors.textLight, marginTop: 2 },
  txnAmountContainer: { alignItems: 'flex-end' },
  txnAmount: { fontSize: fonts.sizes.md, fontWeight: '700' },
  credit: { color: colors.success },
  debit: { color: colors.error },
  txnStatus: { fontSize: fonts.sizes.xs, color: colors.textLight, marginTop: 2 },
});

export default TransactionHistoryScreen;
