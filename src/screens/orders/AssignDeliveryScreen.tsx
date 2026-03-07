import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchDeliveryPartners,
  assignDeliveryPartner,
  autoAssignDelivery,
} from '../../store/slices/orderSlice';
import { Button, Card, Loader } from '../../components';
import { colors, fonts, spacing, borderRadius, shadows } from '../../utils/theme';
import { DeliveryPartner } from '../../models/types';

const AssignDeliveryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const { deliveryPartners, isLoading } = useAppSelector((state) => state.orders);
  const { orderId } = route.params;
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchDeliveryPartners(orderId));
  }, [dispatch, orderId]);

  const handleAssign = async () => {
    if (!selectedPartner) {
      Alert.alert('Select Partner', 'Please select a delivery partner');
      return;
    }
    try {
      await dispatch(assignDeliveryPartner({ orderId, partnerId: selectedPartner })).unwrap();
      Alert.alert('Success', 'Delivery partner assigned!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err || 'Failed to assign');
    }
  };

  const handleAutoAssign = async () => {
    try {
      await dispatch(autoAssignDelivery(orderId)).unwrap();
      Alert.alert('Success', 'Delivery partner auto-assigned!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err || 'No available partner nearby');
    }
  };

  const renderPartner = ({ item }: { item: DeliveryPartner }) => (
    <TouchableOpacity
      style={[
        styles.partnerCard,
        selectedPartner === item.id && styles.partnerCardSelected,
      ]}
      onPress={() => setSelectedPartner(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.partnerAvatar}>
        <Text style={styles.avatarText}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.partnerInfo}>
        <Text style={styles.partnerName}>{item.name}</Text>
        <Text style={styles.partnerPhone}>{item.phone}</Text>
        <View style={styles.partnerMeta}>
          {item.distance && (
            <Text style={styles.metaText}>📍 {item.distance.toFixed(1)} km away</Text>
          )}
          {item.rating && (
            <Text style={styles.metaText}>⭐ {item.rating.toFixed(1)}</Text>
          )}
        </View>
      </View>
      <View style={[styles.radioOuter, selectedPartner === item.id && styles.radioOuterSelected]}>
        {selectedPartner === item.id && <View style={styles.radioInner} />}
      </View>
    </TouchableOpacity>
  );

  if (isLoading && !deliveryPartners.length) return <Loader />;

  return (
    <View style={styles.container}>
      <Button
        title="🤖 Auto-Assign Nearest Partner"
        onPress={handleAutoAssign}
        variant="outline"
        style={styles.autoAssignBtn}
      />

      <Text style={styles.sectionTitle}>Available Delivery Partners</Text>

      <FlatList
        data={deliveryPartners}
        renderItem={renderPartner}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🚗</Text>
            <Text style={styles.emptyText}>No delivery partners available nearby</Text>
          </View>
        }
      />

      {selectedPartner && (
        <View style={styles.bottomAction}>
          <Button title="Assign Selected Partner" onPress={handleAssign} loading={isLoading} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  autoAssignBtn: { margin: spacing.lg },
  sectionTitle: {
    fontSize: fonts.sizes.lg,
    fontWeight: '600',
    color: colors.text,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  listContent: { padding: spacing.lg, paddingTop: 0, flexGrow: 1 },
  partnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadows.sm,
  },
  partnerCardSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  partnerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: fonts.sizes.lg, fontWeight: '700', color: colors.white },
  partnerInfo: { flex: 1, marginLeft: spacing.md },
  partnerName: { fontSize: fonts.sizes.md, fontWeight: '600', color: colors.text },
  partnerPhone: { fontSize: fonts.sizes.sm, color: colors.textSecondary, marginTop: 2 },
  partnerMeta: { flexDirection: 'row', gap: spacing.md, marginTop: 4 },
  metaText: { fontSize: fonts.sizes.xs, color: colors.textLight },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: { borderColor: colors.primary },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
  bottomAction: { padding: spacing.lg, backgroundColor: colors.white, ...shadows.lg },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyText: { fontSize: fonts.sizes.md, color: colors.textSecondary },
});

export default AssignDeliveryScreen;
