import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { Card, Button, StatusBadge } from '../../components';
import { colors, fonts, spacing, borderRadius, shadows } from '../../utils/theme';
import { formatCurrency } from '../../utils/helpers';
import { RazorpayService } from '../../services/RazorpayService';
import { VendorPlan } from '../../models/types';

const PLANS: VendorPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    duration: 'monthly',
    features: ['Up to 50 products', 'Basic dashboard', 'Email support', 'Standard visibility'],
    maxProducts: 50,
    commissionRate: 5,
    isPopular: false,
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 499,
    duration: 'monthly',
    features: ['Up to 200 products', 'Full analytics', 'Priority support', 'Enhanced visibility', 'Subscription management'],
    maxProducts: 200,
    commissionRate: 3,
    isPopular: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 999,
    duration: 'monthly',
    features: ['Unlimited products', 'Advanced analytics', '24/7 support', 'Top visibility', 'Subscription management', 'Custom branding', '0% commission'],
    maxProducts: -1,
    commissionRate: 0,
    isPopular: false,
  },
];

const VendorPlansScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const { currentPlan, isLoading } = useAppSelector((state) => state.plans);

  const handlePurchase = async (plan: VendorPlan) => {
    if (plan.price === 0) {
      Alert.alert('Free Plan', 'You are already on the free plan');
      return;
    }

    try {
      const result = await RazorpayService.processSubscriptionPayment(
        plan.price,
        plan.id,
        `${plan.name} Plan - ${plan.duration}`
      );
      Alert.alert('Payment Successful', `You are now on the ${plan.name} plan!`);
    } catch (err: any) {
      if (err.code !== 'CANCELLED') {
        Alert.alert('Payment Failed', err.message || 'Please try again');
      }
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Choose Your Plan</Text>
        <Text style={styles.subtitle}>
          Grow your business with the right plan
        </Text>
      </View>

      {PLANS.map((plan) => (
        <View
          key={plan.id}
          style={[styles.planCard, plan.isPopular && styles.popularCard]}
        >
          {plan.isPopular && (
            <View style={styles.popularBadge}>
              <Text style={styles.popularText}>⭐ Most Popular</Text>
            </View>
          )}
          <Text style={styles.planName}>{plan.name}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.planPrice}>{plan.price === 0 ? 'Free' : formatCurrency(plan.price)}</Text>
            {plan.price > 0 && <Text style={styles.planDuration}>/{plan.duration}</Text>}
          </View>
          <Text style={styles.commission}>
            {plan.commissionRate > 0 ? `${plan.commissionRate}% commission` : 'Zero commission'}
          </Text>

          <View style={styles.featureList}>
            {plan.features.map((feature, idx) => (
              <View key={idx} style={styles.featureRow}>
                <Text style={styles.featureCheck}>✓</Text>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>

          <Button
            title={currentPlan?.id === plan.id ? 'Current Plan' : plan.price === 0 ? 'Free Forever' : 'Subscribe'}
            onPress={() => handlePurchase(plan)}
            disabled={currentPlan?.id === plan.id}
            variant={plan.isPopular ? 'primary' : 'outline'}
            style={styles.planButton}
          />
        </View>
      ))}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.xl, alignItems: 'center' },
  title: { fontSize: fonts.sizes.xxl, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: fonts.sizes.md, color: colors.textSecondary, marginTop: 4 },
  planCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadows.md,
  },
  popularCard: { borderColor: colors.primary },
  popularBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    paddingVertical: 4,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.round,
    marginBottom: spacing.md,
  },
  popularText: { fontSize: fonts.sizes.sm, color: colors.primary, fontWeight: '600' },
  planName: { fontSize: fonts.sizes.xl, fontWeight: '700', color: colors.text },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.xs },
  planPrice: { fontSize: 32, fontWeight: '700', color: colors.primary },
  planDuration: { fontSize: fonts.sizes.md, color: colors.textSecondary, marginLeft: 4 },
  commission: { fontSize: fonts.sizes.sm, color: colors.success, marginTop: 4 },
  featureList: { marginTop: spacing.lg },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  featureCheck: { fontSize: 16, color: colors.success, marginRight: spacing.sm, fontWeight: '700' },
  featureText: { fontSize: fonts.sizes.md, color: colors.text },
  planButton: { marginTop: spacing.lg },
  bottomPadding: { height: 30 },
});

export default VendorPlansScreen;
