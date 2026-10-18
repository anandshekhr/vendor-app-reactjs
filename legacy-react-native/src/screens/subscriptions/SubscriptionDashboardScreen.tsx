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
import {
  fetchSubscriptionStats,
  fetchTodayDeliveries,
} from '../../store/slices/subscriptionSlice';
import { Card, StatCard } from '../../components';
import { colors, fonts, spacing, borderRadius, shadows } from '../../utils/theme';
import { formatCurrency } from '../../utils/helpers';

const SubscriptionDashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { stats, todayDeliveries, isLoading } = useAppSelector((state) => state.subscriptions);

  const loadData = useCallback(() => {
    dispatch(fetchSubscriptionStats());
    dispatch(fetchTodayDeliveries());
  }, [dispatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const todayPending = todayDeliveries.filter((d) => d.status === 'pending').length;
  const todayCompleted = todayDeliveries.filter((d) => d.status === 'delivered').length;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadData} colors={[colors.primary]} />}
    >
      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <StatCard
          title="Active"
          value={String(stats?.activeSubscriptions || 0)}
          icon="🔄"
          color={colors.success}
          style={styles.statCard}
        />
        <StatCard
          title="Paused"
          value={String(stats?.pausedSubscriptions || 0)}
          icon="⏸️"
          color={colors.warning}
          style={styles.statCard}
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(stats?.monthlyRevenue || 0)}
          icon="💰"
          color={colors.primary}
          style={styles.statCard}
        />
        <StatCard
          title="New This Week"
          value={String(stats?.newThisWeek || 0)}
          icon="📈"
          color={colors.info}
          style={styles.statCard}
        />
      </View>

      {/* Today's Deliveries Overview */}
      <Card
        title="Today's Deliveries"
        headerRight={
          <TouchableOpacity onPress={() => navigation.navigate('TodayDeliveries')}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        }
      >
        <View style={styles.todayStats}>
          <View style={styles.todayStat}>
            <Text style={styles.todayStatValue}>{todayDeliveries.length}</Text>
            <Text style={styles.todayStatLabel}>Total</Text>
          </View>
          <View style={styles.todayDivider} />
          <View style={styles.todayStat}>
            <Text style={[styles.todayStatValue, { color: colors.warning }]}>{todayPending}</Text>
            <Text style={styles.todayStatLabel}>Pending</Text>
          </View>
          <View style={styles.todayDivider} />
          <View style={styles.todayStat}>
            <Text style={[styles.todayStatValue, { color: colors.success }]}>{todayCompleted}</Text>
            <Text style={styles.todayStatLabel}>Completed</Text>
          </View>
        </View>
      </Card>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('SubscriptionList')}
        >
          <Text style={styles.actionIcon}>📋</Text>
          <Text style={styles.actionText}>All Subscriptions</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('TodayDeliveries')}
        >
          <Text style={styles.actionIcon}>🚚</Text>
          <Text style={styles.actionText}>Today's Deliveries</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('SubscriptionSettings')}
        >
          <Text style={styles.actionIcon}>⚙️</Text>
          <Text style={styles.actionText}>Settings</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.lg,
    gap: spacing.md,
  },
  statCard: { width: '47%' },
  viewAll: { fontSize: fonts.sizes.sm, color: colors.primary, fontWeight: '600' },
  todayStats: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: spacing.md },
  todayStat: { alignItems: 'center' },
  todayStatValue: { fontSize: fonts.sizes.xxl, fontWeight: '700', color: colors.text },
  todayStatLabel: { fontSize: fonts.sizes.sm, color: colors.textSecondary, marginTop: 4 },
  todayDivider: { width: 1, backgroundColor: colors.borderLight },
  quickActions: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.md },
  actionCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  actionIcon: { fontSize: 28, marginBottom: spacing.sm },
  actionText: { fontSize: fonts.sizes.sm, color: colors.text, fontWeight: '500', textAlign: 'center' },
  bottomPadding: { height: 30 },
});

export default SubscriptionDashboardScreen;
