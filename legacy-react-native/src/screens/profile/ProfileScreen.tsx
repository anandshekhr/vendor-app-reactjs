import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../../store/hooks';
import { Button, Card } from '../../components';
import { colors, fonts, spacing, borderRadius, shadows } from '../../utils/theme';

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { vendor } = useAppSelector((state) => state.auth);

  if (!vendor) return null;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          {vendor.shopImage ? (
            <Image source={{ uri: vendor.shopImage }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>
              {vendor.shopName?.charAt(0)?.toUpperCase() || 'V'}
            </Text>
          )}
        </View>
        <Text style={styles.shopName}>{vendor.shopName}</Text>
        <Text style={styles.ownerName}>{vendor.ownerName}</Text>
        {vendor.isVerified && (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>✅ Verified</Text>
          </View>
        )}
      </View>

      {/* Contact */}
      <Card title="Contact Information">
        <View style={styles.infoRow}>
          <Text style={styles.label}>Phone</Text>
          <Text style={styles.value}>+91 {vendor.phone}</Text>
        </View>
        {vendor.email && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{vendor.email}</Text>
          </View>
        )}
      </Card>

      {/* Shop Details */}
      <Card title="Shop Details">
        <View style={styles.infoRow}>
          <Text style={styles.label}>Category</Text>
          <Text style={styles.value}>{vendor.shopCategory}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Address</Text>
          <Text style={[styles.value, styles.addressText]}>{vendor.address}</Text>
        </View>
        {vendor.gstNumber && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>GST Number</Text>
            <Text style={styles.value}>{vendor.gstNumber}</Text>
          </View>
        )}
      </Card>

      {/* Business Stats */}
      <Card title="Business">
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{vendor.totalProducts || 0}</Text>
            <Text style={styles.statLabel}>Products</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{vendor.totalOrders || 0}</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{vendor.rating?.toFixed(1) || 'N/A'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>
      </Card>

      <Button
        title="Edit Profile"
        onPress={() => navigation.navigate('EditProfile')}
        style={styles.editBtn}
      />

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    backgroundColor: colors.white,
    ...shadows.sm,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  avatarText: { fontSize: 32, fontWeight: '700', color: colors.white },
  shopName: { fontSize: fonts.sizes.xl, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  ownerName: { fontSize: fonts.sizes.md, color: colors.textSecondary, marginTop: 4 },
  verifiedBadge: { marginTop: spacing.sm, paddingVertical: 4, paddingHorizontal: spacing.md, backgroundColor: colors.successLight, borderRadius: 12 },
  verifiedText: { fontSize: fonts.sizes.sm, color: colors.success, fontWeight: '500' },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  label: { fontSize: fonts.sizes.md, color: colors.textSecondary },
  value: { fontSize: fonts.sizes.md, fontWeight: '500', color: colors.text, maxWidth: '60%', textAlign: 'right' },
  addressText: { fontSize: fonts.sizes.sm },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: spacing.md },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: fonts.sizes.xxl, fontWeight: '700', color: colors.primary },
  statLabel: { fontSize: fonts.sizes.sm, color: colors.textSecondary, marginTop: 4 },
  editBtn: { margin: spacing.lg },
  bottomPadding: { height: 30 },
});

export default ProfileScreen;
