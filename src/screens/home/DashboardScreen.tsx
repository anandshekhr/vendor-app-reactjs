import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchDashboardStats } from '../../store/slices/dashboardSlice';
import { Card, StatCard, SectionHeader, QuickActionButton } from '../../components';
import { colors, fonts, spacing, shadows } from '../../utils/theme';
import { formatCurrency } from '../../utils/helpers';

const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { stats, isLoading } = useAppSelector((state) => state.dashboard);
  const { vendor } = useAppSelector((state) => state.auth);

  const loadData = useCallback(() => {
    dispatch(fetchDashboardStats());
  }, [dispatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {vendor?.ownerName || 'Vendor'} 👋</Text>
          <Text style={styles.shopName}>{vendor?.shopName || 'My Shop'}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate('Search')}
          >
            <Text style={styles.iconEmoji}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Text style={styles.iconEmoji}>🔔</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadData} colors={[colors.primary]} />
        }
      >
        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <StatCard
            title="Today's Orders"
            value={stats?.todayOrders ?? 0}
            color={colors.primary}
            icon={<Text style={styles.statIcon}>📦</Text>}
          />
          <View style={styles.statsGap} />
          <StatCard
            title="Pending Orders"
            value={stats?.pendingOrders ?? 0}
            color={colors.warning}
            icon={<Text style={styles.statIcon}>⏳</Text>}
          />
        </View>

        <View style={styles.statsRow}>
          <StatCard
            title="Completed"
            value={stats?.completedOrders ?? 0}
            color={colors.success}
            icon={<Text style={styles.statIcon}>✅</Text>}
          />
          <View style={styles.statsGap} />
          <StatCard
            title="Total Products"
            value={stats?.totalProducts ?? 0}
            color={colors.info}
            icon={<Text style={styles.statIcon}>🏷️</Text>}
          />
        </View>

        <View style={styles.statsRow}>
          <StatCard
            title="Low Stock"
            value={stats?.lowStockProducts ?? 0}
            color={colors.error}
            icon={<Text style={styles.statIcon}>⚠️</Text>}
          />
          <View style={styles.statsGap} />
          <StatCard
            title="Wallet Balance"
            value={formatCurrency(stats?.walletBalance ?? 0)}
            color={colors.success}
            icon={<Text style={styles.statIcon}>💰</Text>}
          />
        </View>

        {/* Subscription Stats */}
        <Card title="Subscription Overview" style={styles.subscriptionCard}>
          <View style={styles.subscriptionStats}>
            <View style={styles.subStatItem}>
              <Text style={styles.subStatValue}>{stats?.totalActiveSubscriptions ?? 0}</Text>
              <Text style={styles.subStatLabel}>Active</Text>
            </View>
            <View style={styles.subStatDivider} />
            <View style={styles.subStatItem}>
              <Text style={styles.subStatValue}>{stats?.todaySubscriptionDeliveries ?? 0}</Text>
              <Text style={styles.subStatLabel}>Today's Deliveries</Text>
            </View>
            <View style={styles.subStatDivider} />
            <View style={styles.subStatItem}>
              <Text style={[styles.subStatValue, { color: colors.primary }]}>
                {stats?.subscriptionStatus ?? 'Free'}
              </Text>
              <Text style={styles.subStatLabel}>Plan</Text>
            </View>
          </View>
        </Card>

        {/* Quick Actions */}
        <SectionHeader title="Quick Actions" />
        <View style={styles.quickActions}>
          <QuickActionButton
            icon={<Text style={styles.actionIcon}>➕</Text>}
            label="Add Product"
            onPress={() => navigation.navigate('Products', { screen: 'AddProduct' })}
            color={colors.primary}
          />
          <QuickActionButton
            icon={<Text style={styles.actionIcon}>📋</Text>}
            label="Manage Orders"
            onPress={() => navigation.navigate('Orders')}
            color={colors.secondary}
          />
          <QuickActionButton
            icon={<Text style={styles.actionIcon}>📊</Text>}
            label="Inventory"
            onPress={() => navigation.navigate('Products', { screen: 'Inventory' })}
            color={colors.success}
          />
          <QuickActionButton
            icon={<Text style={styles.actionIcon}>💸</Text>}
            label="Withdraw"
            onPress={() => navigation.navigate('More', { screen: 'WithdrawMoney' })}
            color={colors.warning}
          />
        </View>

        <View style={styles.quickActions}>
          <QuickActionButton
            icon={<Text style={styles.actionIcon}>💳</Text>}
            label="Transactions"
            onPress={() => navigation.navigate('More', { screen: 'TransactionHistory' })}
            color={colors.info}
          />
          <QuickActionButton
            icon={<Text style={styles.actionIcon}>🔄</Text>}
            label="Subscriptions"
            onPress={() => navigation.navigate('Subscriptions')}
            color="#9C27B0"
          />
          <QuickActionButton
            icon={<Text style={styles.actionIcon}>📈</Text>}
            label="Analytics"
            onPress={() => navigation.navigate('More', { screen: 'Analytics' })}
            color="#FF5722"
          />
          <QuickActionButton
            icon={<Text style={styles.actionIcon}>📷</Text>}
            label="Scan Barcode"
            onPress={() => navigation.navigate('Products', { screen: 'BarcodeScanner' })}
            color="#607D8B"
          />
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    ...shadows.sm,
  },
  greeting: {
    fontSize: fonts.sizes.md,
    color: colors.textSecondary,
  },
  shopName: {
    fontSize: fonts.sizes.xl,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 18,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  statsGap: {
    width: spacing.md,
  },
  statIcon: {
    fontSize: 18,
  },
  subscriptionCard: {
    marginTop: spacing.sm,
  },
  subscriptionStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  subStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  subStatValue: {
    fontSize: fonts.sizes.xl,
    fontWeight: '700',
    color: colors.text,
  },
  subStatLabel: {
    fontSize: fonts.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  subStatDivider: {
    width: 1,
    backgroundColor: colors.divider,
    marginHorizontal: spacing.sm,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: spacing.md,
  },
  actionIcon: {
    fontSize: 22,
  },
  bottomPadding: {
    height: 20,
  },
});

export default DashboardScreen;
