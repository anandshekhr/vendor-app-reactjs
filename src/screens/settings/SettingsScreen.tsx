import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import { Card, Button } from '../../components';
import { colors, fonts, spacing, borderRadius } from '../../utils/theme';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const [settings, setSettings] = useState({
    pushNotifications: true,
    orderAlerts: true,
    subscriptionReminders: true,
    lowStockAlerts: true,
    autoAcceptOrders: false,
    darkMode: false,
  });

  const toggleSetting = (key: string) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => dispatch(logout()),
      },
    ]);
  };

  const renderSwitch = (label: string, key: string, hint?: string) => (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        {hint && <Text style={styles.settingHint}>{hint}</Text>}
      </View>
      <Switch
        value={settings[key as keyof typeof settings] as boolean}
        onValueChange={() => toggleSetting(key)}
        trackColor={{ false: colors.disabled, true: colors.primaryLight }}
        thumbColor={settings[key as keyof typeof settings] ? colors.primary : colors.textLight}
      />
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <Card title="Notifications">
          {renderSwitch('Push Notifications', 'pushNotifications', 'Receive all notifications')}
          {renderSwitch('Order Alerts', 'orderAlerts', 'New orders and status updates')}
          {renderSwitch('Subscription Reminders', 'subscriptionReminders', 'Upcoming delivery reminders')}
          {renderSwitch('Low Stock Alerts', 'lowStockAlerts', 'When stock falls below threshold')}
        </Card>

        <Card title="Orders">
          {renderSwitch('Auto-accept Orders', 'autoAcceptOrders', 'Automatically accept new orders')}
        </Card>

        <Card title="About">
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>App Version</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </View>
          <TouchableOpacity style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Terms of Service</Text>
            <Text style={styles.aboutChevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Privacy Policy</Text>
            <Text style={styles.aboutChevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Help & Support</Text>
            <Text style={styles.aboutChevron}>›</Text>
          </TouchableOpacity>
        </Card>

        <Button
          title="Logout"
          onPress={handleLogout}
          variant="danger"
          style={styles.logoutBtn}
        />

        <View style={styles.bottomPadding} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  settingInfo: { flex: 1, marginRight: spacing.md },
  settingLabel: { fontSize: fonts.sizes.md, fontWeight: '500', color: colors.text },
  settingHint: { fontSize: fonts.sizes.sm, color: colors.textSecondary, marginTop: 2 },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  aboutLabel: { fontSize: fonts.sizes.md, color: colors.text },
  aboutValue: { fontSize: fonts.sizes.md, color: colors.textSecondary },
  aboutChevron: { fontSize: 18, color: colors.textLight },
  logoutBtn: { marginTop: spacing.xxl },
  bottomPadding: { height: 30 },
});

export default SettingsScreen;
