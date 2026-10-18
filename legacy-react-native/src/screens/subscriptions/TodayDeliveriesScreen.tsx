import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchTodayDeliveries,
  markSubscriptionDelivered,
} from '../../store/slices/subscriptionSlice';
import { StatusBadge, EmptyState, Button } from '../../components';
import { colors, fonts, spacing, borderRadius, shadows } from '../../utils/theme';
import { formatCurrency } from '../../utils/helpers';
import { SubscriptionDelivery } from '../../models/types';

const TodayDeliveriesScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const { todayDeliveries, isLoading } = useAppSelector((state) => state.subscriptions);

  const loadDeliveries = useCallback(() => {
    dispatch(fetchTodayDeliveries());
  }, [dispatch]);

  useEffect(() => {
    loadDeliveries();
  }, [loadDeliveries]);

  const pendingCount = todayDeliveries.filter((d) => d.status === 'pending').length;
  const deliveredCount = todayDeliveries.filter((d) => d.status === 'delivered').length;

  const handleMarkDelivered = (delivery: SubscriptionDelivery) => {
    Alert.alert('Mark Delivered', `Mark delivery for ${delivery.customerName} as completed?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delivered',
        onPress: () =>
          dispatch(markSubscriptionDelivered({
            subscriptionId: delivery.subscriptionId,
            deliveryId: delivery.id,
          })),
      },
    ]);
  };

  const renderDelivery = ({ item }: { item: SubscriptionDelivery }) => (
    <View style={[styles.deliveryCard, item.status === 'delivered' && styles.deliveredCard]}>
      <View style={styles.deliveryHeader}>
        <View>
          <Text style={styles.customerName}>{item.customerName}</Text>
          <Text style={styles.productName}>{item.productName}</Text>
        </View>
        <StatusBadge status={item.status} />
      </View>

      <View style={styles.deliveryDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Qty</Text>
          <Text style={styles.detailValue}>{item.quantity} {item.unit}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Amount</Text>
          <Text style={styles.detailValue}>{formatCurrency(item.amount)}</Text>
        </View>
        {item.timeSlot && (
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Slot</Text>
            <Text style={styles.detailValue}>{item.timeSlot}</Text>
          </View>
        )}
      </View>

      {item.deliveryAddress && (
        <Text style={styles.address} numberOfLines={2}>📍 {item.deliveryAddress}</Text>
      )}

      {item.status === 'pending' && (
        <TouchableOpacity
          style={styles.markBtn}
          onPress={() => handleMarkDelivered(item)}
        >
          <Text style={styles.markBtnText}>✅ Mark as Delivered</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Summary Bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{todayDeliveries.length}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.warning }]}>{pendingCount}</Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.success }]}>{deliveredCount}</Text>
          <Text style={styles.summaryLabel}>Delivered</Text>
        </View>
      </View>

      <FlatList
        data={todayDeliveries}
        renderItem={renderDelivery}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadDeliveries} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              title="No Deliveries Today"
              message="No subscription deliveries scheduled for today"
              icon={<Text style={{ fontSize: 48 }}>📦</Text>}
            />
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.white,
    paddingVertical: spacing.lg,
    ...shadows.sm,
  },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: fonts.sizes.xxl, fontWeight: '700', color: colors.text },
  summaryLabel: { fontSize: fonts.sizes.sm, color: colors.textSecondary, marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: colors.borderLight },
  listContent: { padding: spacing.lg, flexGrow: 1 },
  deliveryCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  deliveredCard: { opacity: 0.7, borderLeftWidth: 4, borderLeftColor: colors.success },
  deliveryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  customerName: { fontSize: fonts.sizes.md, fontWeight: '600', color: colors.text },
  productName: { fontSize: fonts.sizes.sm, color: colors.textSecondary, marginTop: 2 },
  deliveryDetails: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  detailItem: { alignItems: 'center' },
  detailLabel: { fontSize: fonts.sizes.xs, color: colors.textLight },
  detailValue: { fontSize: fonts.sizes.md, fontWeight: '600', color: colors.text, marginTop: 2 },
  address: { fontSize: fonts.sizes.sm, color: colors.textSecondary, marginBottom: spacing.sm },
  markBtn: {
    backgroundColor: colors.successLight,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  markBtnText: { fontSize: fonts.sizes.md, color: colors.success, fontWeight: '600' },
});

export default TodayDeliveriesScreen;
