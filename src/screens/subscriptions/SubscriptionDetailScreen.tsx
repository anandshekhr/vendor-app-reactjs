import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchSubscriptionById,
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
  skipDelivery,
} from '../../store/slices/subscriptionSlice';
import { Button, Card, StatusBadge, Loader } from '../../components';
import { colors, fonts, spacing, borderRadius } from '../../utils/theme';
import { formatCurrency, formatDate, capitalize } from '../../utils/helpers';

const SubscriptionDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const { selectedSubscription: sub, isLoading } = useAppSelector((state) => state.subscriptions);
  const { subscriptionId } = route.params;

  useEffect(() => {
    dispatch(fetchSubscriptionById(subscriptionId));
  }, [dispatch, subscriptionId]);

  const handlePause = () => {
    Alert.alert('Pause Subscription', 'Pause this subscription?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Pause', onPress: () => dispatch(pauseSubscription(subscriptionId)) },
    ]);
  };

  const handleResume = () => {
    dispatch(resumeSubscription(subscriptionId));
  };

  const handleCancel = () => {
    Alert.alert('Cancel Subscription', 'This action cannot be undone.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel Subscription',
        style: 'destructive',
        onPress: () => {
          dispatch(cancelSubscription(subscriptionId));
          navigation.goBack();
        },
      },
    ]);
  };

  const handleSkipNext = () => {
    if (sub?.nextDeliveryDate) {
      Alert.alert('Skip Delivery', `Skip delivery on ${sub.nextDeliveryDate}?`, [
        { text: 'No', style: 'cancel' },
        { text: 'Skip', onPress: () => dispatch(skipDelivery({ subscriptionId, date: sub.nextDeliveryDate! })) },
      ]);
    }
  };

  if (isLoading || !sub) return <Loader />;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <StatusBadge status={sub.status} size="md" />
        </View>

        {/* Customer & Product */}
        <Card title="Subscription Details">
          <View style={styles.infoRow}>
            <Text style={styles.label}>Customer</Text>
            <Text style={styles.value}>{sub.customerName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Product</Text>
            <Text style={styles.value}>{sub.productName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Quantity</Text>
            <Text style={styles.value}>{sub.quantity} {sub.unit}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Frequency</Text>
            <Text style={styles.value}>{capitalize(sub.frequency)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Price/Delivery</Text>
            <Text style={styles.value}>{formatCurrency(sub.pricePerDelivery)}</Text>
          </View>
          {sub.deliveryAddress && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Address</Text>
              <Text style={[styles.value, styles.address]}>{sub.deliveryAddress}</Text>
            </View>
          )}
        </Card>

        {/* Schedule */}
        <Card title="Schedule">
          <View style={styles.infoRow}>
            <Text style={styles.label}>Start Date</Text>
            <Text style={styles.value}>{formatDate(sub.startDate)}</Text>
          </View>
          {sub.endDate && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>End Date</Text>
              <Text style={styles.value}>{formatDate(sub.endDate)}</Text>
            </View>
          )}
          {sub.nextDeliveryDate && (
            <View style={styles.nextDeliveryBox}>
              <Text style={styles.nextLabel}>Next Delivery</Text>
              <Text style={styles.nextDate}>{sub.nextDeliveryDate}</Text>
            </View>
          )}
          {sub.selectedDays && sub.selectedDays.length > 0 && (
            <View style={styles.daysRow}>
              <Text style={styles.label}>Delivery Days</Text>
              <View style={styles.daysChips}>
                {sub.selectedDays.map((day) => (
                  <View key={day} style={styles.dayChip}>
                    <Text style={styles.dayChipText}>{day.substring(0, 3)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </Card>

        {/* Delivery History Summary */}
        <Card title="Delivery Summary">
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{sub.totalDeliveries || 0}</Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.success }]}>{sub.completedDeliveries || 0}</Text>
              <Text style={styles.summaryLabel}>Completed</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.warning }]}>{sub.skippedDeliveries || 0}</Text>
              <Text style={styles.summaryLabel}>Skipped</Text>
            </View>
          </View>
        </Card>

        {/* Actions */}
        <View style={styles.actions}>
          {sub.status === 'active' && (
            <>
              <Button title="Skip Next Delivery" variant="outline" onPress={handleSkipNext} />
              <Button title="Pause Subscription" variant="outline" onPress={handlePause} />
              <Button title="Cancel Subscription" variant="danger" onPress={handleCancel} />
            </>
          )}
          {sub.status === 'paused' && (
            <>
              <Button title="Resume Subscription" onPress={handleResume} />
              <Button title="Cancel Subscription" variant="danger" onPress={handleCancel} />
            </>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: spacing.md },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  label: { fontSize: fonts.sizes.md, color: colors.textSecondary },
  value: { fontSize: fonts.sizes.md, fontWeight: '600', color: colors.text, maxWidth: '50%', textAlign: 'right' },
  address: { fontSize: fonts.sizes.sm },
  nextDeliveryBox: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    alignItems: 'center',
  },
  nextLabel: { fontSize: fonts.sizes.sm, color: colors.primary },
  nextDate: { fontSize: fonts.sizes.xl, fontWeight: '700', color: colors.primary, marginTop: 4 },
  daysRow: { marginTop: spacing.md },
  daysChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  dayChip: { paddingVertical: 4, paddingHorizontal: spacing.sm, backgroundColor: colors.background, borderRadius: 12 },
  dayChipText: { fontSize: fonts.sizes.xs, color: colors.text, fontWeight: '500' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: spacing.md },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: fonts.sizes.xxl, fontWeight: '700', color: colors.text },
  summaryLabel: { fontSize: fonts.sizes.sm, color: colors.textSecondary, marginTop: 4 },
  actions: { marginTop: spacing.lg, gap: spacing.md },
  bottomPadding: { height: 30 },
});

export default SubscriptionDetailScreen;
