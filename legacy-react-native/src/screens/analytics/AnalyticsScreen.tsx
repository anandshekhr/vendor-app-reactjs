import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { Card, StatCard } from '../../components';
import { colors, fonts, spacing, borderRadius, shadows } from '../../utils/theme';
import { formatCurrency } from '../../utils/helpers';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Period = 'daily' | 'weekly' | 'monthly';

const AnalyticsScreen: React.FC = () => {
  const { analytics, isLoading } = useAppSelector((state) => state.dashboard);
  const dispatch = useAppDispatch();
  const [period, setPeriod] = useState<Period>('weekly');

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Period Selector */}
      <View style={styles.periodRow}>
        {(['daily', 'weekly', 'monthly'] as Period[]).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodChip, period === p && styles.periodChipActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Revenue Stats */}
      <View style={styles.statsRow}>
        <StatCard
          title="Total Revenue"
          value={formatCurrency(analytics?.totalRevenue || 0)}
          icon="💰"
          color={colors.success}
          style={styles.statCard}
        />
        <StatCard
          title="Total Orders"
          value={String(analytics?.totalOrders || 0)}
          icon="📦"
          color={colors.primary}
          style={styles.statCard}
        />
      </View>
      <View style={styles.statsRow}>
        <StatCard
          title="Avg. Order Value"
          value={formatCurrency(analytics?.averageOrderValue || 0)}
          icon="📊"
          color={colors.info}
          style={styles.statCard}
        />
        <StatCard
          title="Active Subs"
          value={String(analytics?.activeSubscriptions || 0)}
          icon="🔄"
          color={colors.secondary}
          style={styles.statCard}
        />
      </View>

      {/* Revenue Chart Placeholder */}
      <Card title="Revenue Trend">
        <View style={styles.chartPlaceholder}>
          <Text style={styles.chartIcon}>📈</Text>
          <Text style={styles.chartText}>Revenue chart will appear here</Text>
          <Text style={styles.chartHint}>Integrate react-native-chart-kit for visual data</Text>
        </View>
      </Card>

      {/* Top Products */}
      <Card title="Top Selling Products">
        {(analytics?.topProducts || []).length === 0 ? (
          <Text style={styles.noData}>No product data available yet</Text>
        ) : (
          analytics?.topProducts?.map((product: any, idx: number) => (
            <View key={idx} style={styles.topProductRow}>
              <View style={styles.rank}>
                <Text style={styles.rankText}>#{idx + 1}</Text>
              </View>
              <View style={styles.topProductInfo}>
                <Text style={styles.topProductName}>{product.name}</Text>
                <Text style={styles.topProductSales}>{product.totalSold} sold</Text>
              </View>
              <Text style={styles.topProductRevenue}>{formatCurrency(product.revenue)}</Text>
            </View>
          ))
        )}
      </Card>

      {/* Order Stats */}
      <Card title="Order Statistics">
        <View style={styles.orderStats}>
          <View style={styles.orderStatItem}>
            <Text style={styles.orderStatValue}>{analytics?.completionRate || 0}%</Text>
            <Text style={styles.orderStatLabel}>Completion Rate</Text>
          </View>
          <View style={styles.orderStatItem}>
            <Text style={styles.orderStatValue}>{analytics?.cancellationRate || 0}%</Text>
            <Text style={styles.orderStatLabel}>Cancellation Rate</Text>
          </View>
          <View style={styles.orderStatItem}>
            <Text style={styles.orderStatValue}>{analytics?.avgDeliveryTime || 0}m</Text>
            <Text style={styles.orderStatLabel}>Avg. Delivery</Text>
          </View>
        </View>
      </Card>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  periodRow: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  periodChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    backgroundColor: colors.white,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  periodText: { fontSize: fonts.sizes.md, color: colors.textSecondary, fontWeight: '500' },
  periodTextActive: { color: colors.white },
  statsRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.md, marginBottom: spacing.md },
  statCard: { flex: 1 },
  chartPlaceholder: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
  },
  chartIcon: { fontSize: 48, marginBottom: spacing.sm },
  chartText: { fontSize: fonts.sizes.md, color: colors.textSecondary, fontWeight: '500' },
  chartHint: { fontSize: fonts.sizes.sm, color: colors.textLight, marginTop: 4 },
  noData: { fontSize: fonts.sizes.md, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.xl },
  topProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  rank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { fontSize: fonts.sizes.sm, fontWeight: '700', color: colors.primary },
  topProductInfo: { flex: 1, marginLeft: spacing.md },
  topProductName: { fontSize: fonts.sizes.md, fontWeight: '500', color: colors.text },
  topProductSales: { fontSize: fonts.sizes.xs, color: colors.textSecondary },
  topProductRevenue: { fontSize: fonts.sizes.md, fontWeight: '600', color: colors.success },
  orderStats: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: spacing.md },
  orderStatItem: { alignItems: 'center' },
  orderStatValue: { fontSize: fonts.sizes.xl, fontWeight: '700', color: colors.text },
  orderStatLabel: { fontSize: fonts.sizes.xs, color: colors.textSecondary, marginTop: 4 },
  bottomPadding: { height: 30 },
});

export default AnalyticsScreen;
