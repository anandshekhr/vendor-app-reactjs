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
import { fetchSubscriptions, setSubscriptionTab } from '../../store/slices/subscriptionSlice';
import { StatusBadge, EmptyState } from '../../components';
import { colors, fonts, spacing, borderRadius, shadows } from '../../utils/theme';
import { formatCurrency, capitalize } from '../../utils/helpers';
import { ProductSubscription } from '../../models/types';

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'paused', label: 'Paused' },
  { key: 'cancelled', label: 'Cancelled' },
];

const SubscriptionListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { subscriptions, isLoading, activeTab } = useAppSelector((state) => state.subscriptions);

  const loadSubscriptions = useCallback(() => {
    dispatch(fetchSubscriptions(activeTab === 'all' ? undefined : { status: activeTab }));
  }, [dispatch, activeTab]);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  const filteredList = activeTab === 'all'
    ? subscriptions
    : subscriptions.filter((s) => s.status === activeTab);

  const renderSubscription = ({ item }: { item: ProductSubscription }) => (
    <TouchableOpacity
      style={styles.subCard}
      onPress={() => navigation.navigate('SubscriptionDetail', { subscriptionId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.subHeader}>
        <View style={styles.subInfo}>
          <Text style={styles.customerName}>{item.customerName}</Text>
          <Text style={styles.productName}>{item.productName}</Text>
        </View>
        <StatusBadge status={item.status} />
      </View>

      <View style={styles.subDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Frequency</Text>
          <Text style={styles.detailValue}>{capitalize(item.frequency)}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Qty</Text>
          <Text style={styles.detailValue}>{item.quantity} {item.unit}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Amount</Text>
          <Text style={styles.detailValue}>{formatCurrency(item.pricePerDelivery)}</Text>
        </View>
      </View>

      {item.nextDeliveryDate && (
        <View style={styles.nextDelivery}>
          <Text style={styles.nextLabel}>Next Delivery: </Text>
          <Text style={styles.nextDate}>{item.nextDeliveryDate}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        horizontal
        data={STATUS_TABS}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.tab, activeTab === item.key && styles.tabActive]}
            onPress={() => dispatch(setSubscriptionTab(item.key))}
          >
            <Text style={[styles.tabText, activeTab === item.key && styles.tabTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.tabContainer}
        showsHorizontalScrollIndicator={false}
      />

      <FlatList
        data={filteredList}
        renderItem={renderSubscription}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadSubscriptions} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              title="No Subscriptions"
              message={`No ${activeTab !== 'all' ? activeTab : ''} subscriptions found`}
              icon={<Text style={{ fontSize: 48 }}>🔄</Text>}
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
  subCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  subHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  subInfo: { flex: 1 },
  customerName: { fontSize: fonts.sizes.md, fontWeight: '600', color: colors.text },
  productName: { fontSize: fonts.sizes.sm, color: colors.textSecondary, marginTop: 2 },
  subDetails: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  detailItem: { alignItems: 'center' },
  detailLabel: { fontSize: fonts.sizes.xs, color: colors.textLight },
  detailValue: { fontSize: fonts.sizes.md, fontWeight: '600', color: colors.text, marginTop: 2 },
  nextDelivery: {
    flexDirection: 'row',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  nextLabel: { fontSize: fonts.sizes.sm, color: colors.textSecondary },
  nextDate: { fontSize: fonts.sizes.sm, fontWeight: '600', color: colors.primary },
});

export default SubscriptionListScreen;
