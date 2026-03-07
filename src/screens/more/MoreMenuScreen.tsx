import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../../store/hooks';
import { colors, fonts, spacing, borderRadius, shadows } from '../../utils/theme';

interface MenuItem {
  icon: string;
  label: string;
  screen: string;
  description?: string;
}

const MENU_SECTIONS: { title: string; items: MenuItem[] }[] = [
  {
    title: 'Business',
    items: [
      { icon: '👤', label: 'My Profile', screen: 'Profile', description: 'Shop & owner details' },
      { icon: '💰', label: 'Wallet', screen: 'WalletHome', description: 'Balance & transactions' },
      { icon: '📊', label: 'Analytics', screen: 'Analytics', description: 'Sales & performance' },
      { icon: '⭐', label: 'Vendor Plans', screen: 'VendorPlans', description: 'Subscription plans' },
    ],
  },
  {
    title: 'Management',
    items: [
      { icon: '💸', label: 'Withdraw Money', screen: 'WithdrawMoney', description: 'Bank transfers' },
      { icon: '🏦', label: 'Bank Accounts', screen: 'AddBankAccount', description: 'Manage accounts' },
      { icon: '📜', label: 'Transaction History', screen: 'TransactionHistory', description: 'All transactions' },
    ],
  },
  {
    title: 'Settings',
    items: [
      { icon: '⚙️', label: 'Settings', screen: 'Settings', description: 'App preferences' },
    ],
  },
];

const MoreMenuScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { vendor } = useAppSelector((state) => state.auth);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Vendor Card */}
      <TouchableOpacity
        style={styles.vendorCard}
        onPress={() => navigation.navigate('Profile')}
        activeOpacity={0.7}
      >
        <View style={styles.vendorAvatar}>
          <Text style={styles.avatarText}>
            {vendor?.shopName?.charAt(0)?.toUpperCase() || 'V'}
          </Text>
        </View>
        <View style={styles.vendorInfo}>
          <Text style={styles.shopName}>{vendor?.shopName || 'My Shop'}</Text>
          <Text style={styles.ownerName}>{vendor?.ownerName || 'Vendor'}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      {/* Menu Sections */}
      {MENU_SECTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionCard}>
            {section.items.map((item, idx) => (
              <TouchableOpacity
                key={item.screen}
                style={[
                  styles.menuItem,
                  idx < section.items.length - 1 && styles.menuItemBorder,
                ]}
                onPress={() => navigation.navigate(item.screen)}
                activeOpacity={0.6}
              >
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <View style={styles.menuText}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  {item.description && (
                    <Text style={styles.menuDesc}>{item.description}</Text>
                  )}
                </View>
                <Text style={styles.menuChevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <Text style={styles.version}>TheNearbyShop Vendor v1.0.0</Text>
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  vendorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    ...shadows.md,
  },
  vendorAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 24, fontWeight: '700', color: colors.white },
  vendorInfo: { flex: 1, marginLeft: spacing.md },
  shopName: { fontSize: fonts.sizes.lg, fontWeight: '700', color: colors.white },
  ownerName: { fontSize: fonts.sizes.md, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  chevron: { fontSize: 24, color: 'rgba(255,255,255,0.6)' },
  section: { marginBottom: spacing.md },
  sectionTitle: {
    fontSize: fonts.sizes.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  menuIcon: { fontSize: 22, width: 36 },
  menuText: { flex: 1 },
  menuLabel: { fontSize: fonts.sizes.md, fontWeight: '500', color: colors.text },
  menuDesc: { fontSize: fonts.sizes.sm, color: colors.textSecondary, marginTop: 2 },
  menuChevron: { fontSize: 20, color: colors.textLight },
  version: {
    fontSize: fonts.sizes.sm,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  bottomPadding: { height: 30 },
});

export default MoreMenuScreen;
