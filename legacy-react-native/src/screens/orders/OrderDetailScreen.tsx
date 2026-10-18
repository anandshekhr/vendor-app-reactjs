import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchOrderById,
  acceptOrder,
  rejectOrder,
  markOrderReady,
} from '../../store/slices/orderSlice';
import { Button, Card, StatusBadge, Loader } from '../../components';
import { colors, fonts, spacing, borderRadius, shadows } from '../../utils/theme';
import { formatCurrency, formatDateTime } from '../../utils/helpers';

const OrderDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const { selectedOrder: order, isLoading } = useAppSelector((state) => state.orders);
  const { orderId } = route.params;

  useEffect(() => {
    dispatch(fetchOrderById(orderId));
  }, [dispatch, orderId]);

  const handleAccept = () => {
    Alert.alert('Accept Order', 'Confirm accepting this order?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Accept', onPress: () => dispatch(acceptOrder(orderId)) },
    ]);
  };

  const handleReject = () => {
    Alert.alert('Reject Order', 'Are you sure you want to reject this order?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: () => dispatch(rejectOrder({ orderId, reason: 'Items not available' })),
      },
    ]);
  };

  const handleMarkReady = () => {
    dispatch(markOrderReady(orderId));
  };

  const handleCallCustomer = () => {
    if (order?.customerPhone) {
      Linking.openURL(`tel:${order.customerPhone}`);
    }
  };

  if (isLoading || !order) return <Loader />;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Order Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.orderId}>Order #{order.orderNumber}</Text>
            <Text style={styles.orderDate}>{formatDateTime(order.createdAt)}</Text>
          </View>
          <StatusBadge status={order.status} size="md" />
        </View>

        {order.isSubscriptionOrder && (
          <View style={styles.subBanner}>
            <Text style={styles.subBannerText}>🔄 Subscription Order</Text>
          </View>
        )}

        {/* Customer Info */}
        <Card title="Customer">
          <View style={styles.customerRow}>
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{order.customerName}</Text>
              {order.customerPhone && (
                <Text style={styles.customerPhone}>{order.customerPhone}</Text>
              )}
            </View>
            <TouchableOpacity style={styles.callButton} onPress={handleCallCustomer}>
              <Text style={styles.callIcon}>📞</Text>
            </TouchableOpacity>
          </View>
          {order.deliveryAddress && (
            <View style={styles.addressBox}>
              <Text style={styles.addressLabel}>Delivery Address</Text>
              <Text style={styles.addressText}>{order.deliveryAddress}</Text>
            </View>
          )}
        </Card>

        {/* Order Items */}
        <Card title="Items">
          {order.items.map((item, idx) => (
            <View key={idx} style={styles.itemRow}>
              <View style={styles.itemQty}>
                <Text style={styles.qtyText}>{item.quantity}x</Text>
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.productName}</Text>
                <Text style={styles.itemUnit}>{item.unit}</Text>
              </View>
              <Text style={styles.itemPrice}>{formatCurrency(item.totalPrice)}</Text>
            </View>
          ))}
        </Card>

        {/* Payment Summary */}
        <Card title="Payment">
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Subtotal</Text>
            <Text style={styles.paymentValue}>{formatCurrency(order.subtotal)}</Text>
          </View>
          {order.deliveryCharge > 0 && (
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Delivery Charge</Text>
              <Text style={styles.paymentValue}>{formatCurrency(order.deliveryCharge)}</Text>
            </View>
          )}
          {order.discount > 0 && (
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Discount</Text>
              <Text style={[styles.paymentValue, styles.discountText]}>
                -{formatCurrency(order.discount)}
              </Text>
            </View>
          )}
          <View style={[styles.paymentRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(order.totalAmount)}</Text>
          </View>
          <View style={styles.paymentMethod}>
            <Text style={styles.pmLabel}>Payment Method</Text>
            <Text style={styles.pmValue}>
              {order.paymentMethod === 'cod' ? '💵 Cash on Delivery' : '💳 Online Payment'}
            </Text>
          </View>
        </Card>

        {/* Delivery Info */}
        {order.deliveryPartner && (
          <Card title="Delivery Partner">
            <Text style={styles.dpName}>{order.deliveryPartner.name}</Text>
            <Text style={styles.dpPhone}>{order.deliveryPartner.phone}</Text>
          </Card>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          {order.status === 'placed' && (
            <>
              <Button title="Accept Order" onPress={handleAccept} style={styles.acceptBtn} />
              <Button title="Reject Order" onPress={handleReject} variant="danger" style={styles.rejectBtn} />
            </>
          )}
          {(order.status === 'confirmed' || order.status === 'preparing') && (
            <Button title="Mark Ready for Pickup" onPress={handleMarkReady} />
          )}
          {order.status === 'ready' && !order.deliveryPartner && (
            <Button
              title="Assign Delivery Partner"
              onPress={() => navigation.navigate('AssignDeliveryPartner', { orderId: order.id })}
            />
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  orderId: { fontSize: fonts.sizes.xl, fontWeight: '700', color: colors.text },
  orderDate: { fontSize: fonts.sizes.sm, color: colors.textSecondary, marginTop: 2 },
  subBanner: {
    backgroundColor: colors.infoLight,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  subBannerText: { fontSize: fonts.sizes.md, color: colors.info, fontWeight: '600' },
  customerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  customerInfo: { flex: 1 },
  customerName: { fontSize: fonts.sizes.lg, fontWeight: '600', color: colors.text },
  customerPhone: { fontSize: fonts.sizes.md, color: colors.textSecondary, marginTop: 2 },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callIcon: { fontSize: 20 },
  addressBox: { marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.background, borderRadius: borderRadius.md },
  addressLabel: { fontSize: fonts.sizes.sm, color: colors.textSecondary, marginBottom: 4 },
  addressText: { fontSize: fonts.sizes.md, color: colors.text, lineHeight: 20 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  itemQty: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: { fontSize: fonts.sizes.sm, fontWeight: '700', color: colors.primary },
  itemInfo: { flex: 1, marginLeft: spacing.md },
  itemName: { fontSize: fonts.sizes.md, fontWeight: '500', color: colors.text },
  itemUnit: { fontSize: fonts.sizes.xs, color: colors.textSecondary },
  itemPrice: { fontSize: fonts.sizes.md, fontWeight: '600', color: colors.text },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  paymentLabel: { fontSize: fonts.sizes.md, color: colors.textSecondary },
  paymentValue: { fontSize: fonts.sizes.md, color: colors.text },
  discountText: { color: colors.success },
  totalRow: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.sm, paddingTop: spacing.md },
  totalLabel: { fontSize: fonts.sizes.lg, fontWeight: '700', color: colors.text },
  totalValue: { fontSize: fonts.sizes.lg, fontWeight: '700', color: colors.success },
  paymentMethod: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight },
  pmLabel: { fontSize: fonts.sizes.sm, color: colors.textSecondary },
  pmValue: { fontSize: fonts.sizes.sm, fontWeight: '500', color: colors.text },
  dpName: { fontSize: fonts.sizes.md, fontWeight: '600', color: colors.text },
  dpPhone: { fontSize: fonts.sizes.md, color: colors.textSecondary, marginTop: 4 },
  actions: { marginTop: spacing.lg, gap: spacing.md },
  acceptBtn: {},
  rejectBtn: {},
  bottomPadding: { height: 30 },
});

export default OrderDetailScreen;
