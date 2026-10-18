import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchWallet, fetchTransactions } from '../../store/slices/walletSlice';
import { Card, StatCard } from '../../components';
import { colors, fonts, spacing, borderRadius, shadows } from '../../utils/theme';
import { formatCurrency, getRelativeTime } from '../../utils/helpers';
import { TRANSACTION_TYPE_LABELS } from '../../utils/constants';

const WalletScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { wallet, transactions, isLoading } = useAppSelector((state) => state.wallet);

  const loadData = useCallback(() => {
    dispatch(fetchWallet());
    dispatch(fetchTransactions({ limit: 5 }));
  }, [dispatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const recentTransactions = transactions.slice(0, 5);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadData} colors={[colors.primary]} />}
    >
      {/* Wallet Balance */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Available Balance</Text>
        <Text style={styles.balanceAmount}>{formatCurrency(wallet?.balance || 0)}</Text>
        <View style={styles.balanceActions}>
          <TouchableOpacity
            style={styles.balanceBtn}
            onPress={() => navigation.navigate('WithdrawMoney')}
          >
            <Text style={styles.balanceBtnIcon}>💸</Text>
            <Text style={styles.balanceBtnText}>Withdraw</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.balanceBtn}
            onPress={() => navigation.navigate('AddBankAccount')}
          >
            <Text style={styles.balanceBtnIcon}>🏦</Text>
            <Text style={styles.balanceBtnText}>Bank Accounts</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatCard
          title="Today's Earnings"
          value={formatCurrency(wallet?.todayEarnings || 0)}
          icon="💰"
          color={colors.success}
          style={styles.statCard}
        />
        <StatCard
          title="Pending"
          value={formatCurrency(wallet?.pendingAmount || 0)}
          icon="⏳"
          color={colors.warning}
          style={styles.statCard}
        />
      </View>

      {/* Recent Transactions */}
      <Card
        title="Recent Transactions"
        headerRight={
          <TouchableOpacity onPress={() => navigation.navigate('TransactionHistory')}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        }
      >
        {recentTransactions.length === 0 ? (
          <Text style={styles.noTransactions}>No transactions yet</Text>
        ) : (
          recentTransactions.map((txn) => (
            <View key={txn.id} style={styles.txnRow}>
              <View style={styles.txnIcon}>
                <Text style={styles.txnIconText}>
                  {txn.type === 'credit' ? '⬇️' : '⬆️'}
                </Text>
              </View>
              <View style={styles.txnInfo}>
                <Text style={styles.txnDesc}>{txn.description}</Text>
                <Text style={styles.txnTime}>{getRelativeTime(txn.createdAt)}</Text>
              </View>
              <Text
                style={[
                  styles.txnAmount,
                  txn.type === 'credit' ? styles.credit : styles.debit,
                ]}
              >
                {txn.type === 'credit' ? '+' : '-'}{formatCurrency(txn.amount)}
              </Text>
            </View>
          ))
        )}
      </Card>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  balanceCard: {
    backgroundColor: colors.primary,
    margin: spacing.lg,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    ...shadows.lg,
  },
  balanceLabel: { fontSize: fonts.sizes.md, color: 'rgba(255,255,255,0.8)' },
  balanceAmount: { fontSize: 36, fontWeight: '700', color: colors.white, marginTop: spacing.xs },
  balanceActions: { flexDirection: 'row', marginTop: spacing.lg, gap: spacing.xl },
  balanceBtn: { alignItems: 'center' },
  balanceBtnIcon: { fontSize: 24, marginBottom: 4 },
  balanceBtnText: { fontSize: fonts.sizes.sm, color: colors.white, fontWeight: '500' },
  statsRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.md, marginBottom: spacing.md },
  statCard: { flex: 1 },
  viewAll: { fontSize: fonts.sizes.sm, color: colors.primary, fontWeight: '600' },
  noTransactions: { fontSize: fonts.sizes.md, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.xl },
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  txnIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txnIconText: { fontSize: 18 },
  txnInfo: { flex: 1, marginLeft: spacing.md },
  txnDesc: { fontSize: fonts.sizes.md, color: colors.text, fontWeight: '500' },
  txnTime: { fontSize: fonts.sizes.xs, color: colors.textLight, marginTop: 2 },
  txnAmount: { fontSize: fonts.sizes.md, fontWeight: '700' },
  credit: { color: colors.success },
  debit: { color: colors.error },
  bottomPadding: { height: 30 },
});

export default WalletScreen;
