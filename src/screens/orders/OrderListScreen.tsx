import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchOrders, setActiveTab } from '../../store/slices/orderSlice';
import { StatusBadge, EmptyState, Loader } from '../../components';
import { colors, fonts, spacing, borderRadius, shadows } from '../../utils/theme';
import { formatCurrency, formatDateTime, getRelativeTime } from '../../utils/helpers';
import { Order, OrderStatus } from '../../models/types';

const ORDER_TABS: { key: OrderStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'placed', label: 'New' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready', label: 'Ready' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

const OrderListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { orders, isLoading, activeTab } = useAppSelector((state) => state.orders);

  const loadOrders = useCallback(() => {
    dispatch(fetchOrders(activeTab === 'all' ? undefined : { status: activeTab }));
  }, [dispatch, activeTab]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filteredOrders = activeTab === 'all'
    ? orders
    : orders.filter((o) => o.status === activeTab);

  const renderOrderItem = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>#{item.orderNumber}</Text>
        <StatusBadge status={item.status} />
      </View>

      <View style={styles.orderBody}>
        <Text style={styles.customerName}>{item.customerName}</Text>
        <Text style={styles.itemCount}>
          {item.items.length} item{item.items.length > 1 ? 's' : ''}
        </Text>
        <View style={styles.orderMeta}>
          <Text style={styles.orderTime}>{getRelativeTime(item.createdAt)}</Text>
          {item.isSubscriptionOrder && (
            <View style={styles.subBadge}>
              <Text style={styles.subBadgeText}>🔄 Subscription</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.orderFooter}>
        <Text style={styles.orderTotal}>{formatCurrency(item.totalAmount)}</Text>
        {item.paymentMethod && (
          <Text style={styles.paymentMethod}>
            {item.paymentMethod === 'cod' ? '💵 COD' : '💳 Online'}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Order Tabs */}
      <FlatList
        horizontal
        data={ORDER_TABS}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.tab, activeTab === item.key && styles.tabActive]}
            onPress={() => dispatch(setActiveTab(item.key))}
          >
            <Text style={[styles.tabText, activeTab === item.key && styles.tabTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.tabContainer}
        showsHorizontalScrollIndicator={false}
      />

      {/* Order List */}
      <FlatList
        data={filteredOrders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadOrders} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              title="No Orders"
              message={`No ${activeTab !== 'all' ? activeTab : ''} orders found`}
              icon={<Text style={styles.emptyIcon}>📋</Text>}
            />
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabContainer: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.white },
  tab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.round,
    marginRight: spacing.sm,
    backgroundColor: colors.background,
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: fonts.sizes.sm, color: colors.textSecondary, fontWeight: '500' },
  tabTextActive: { color: colors.white },
  listContent: { padding: spacing.lg, flexGrow: 1 },
  orderCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  orderId: { fontSize: fonts.sizes.md, fontWeight: '700', color: colors.text },
  orderBody: { marginBottom: spacing.sm },
  customerName: { fontSize: fonts.sizes.md, fontWeight: '500', color: colors.text },
  itemCount: { fontSize: fonts.sizes.sm, color: colors.textSecondary, marginTop: 2 },
  orderMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: spacing.sm },
  orderTime: { fontSize: fonts.sizes.xs, color: colors.textLight },
  subBadge: { backgroundColor: colors.infoLight, paddingVertical: 2, paddingHorizontal: spacing.sm, borderRadius: 10 },
  subBadgeText: { fontSize: fonts.sizes.xs, color: colors.info },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  orderTotal: { fontSize: fonts.sizes.lg, fontWeight: '700', color: colors.success },
  paymentMethod: { fontSize: fonts.sizes.sm, color: colors.textSecondary },
  emptyIcon: { fontSize: 48 },
});

export default OrderListScreen;
