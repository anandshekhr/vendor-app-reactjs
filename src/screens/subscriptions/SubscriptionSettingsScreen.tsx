import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { Button, Input, Card } from '../../components';
import { colors, fonts, spacing } from '../../utils/theme';

const SubscriptionSettingsScreen: React.FC = () => {
  const [settings, setSettings] = useState({
    autoAcceptSubscriptions: true,
    defaultDeliverySlot: '7:00 AM - 9:00 AM',
    minOrderValueForSubscription: '50',
    maxActiveSubscriptions: '100',
    allowSubscriptionPause: true,
    maxPauseDays: '30',
    sendDeliveryReminders: true,
    reminderTimeBefore: '1',
  });

  const updateSetting = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    Alert.alert('Settings Saved', 'Subscription settings have been updated');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <Card title="General">
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>Auto-accept Subscriptions</Text>
              <Text style={styles.switchHint}>Automatically accept new subscription orders</Text>
            </View>
            <Switch
              value={settings.autoAcceptSubscriptions}
              onValueChange={(v) => updateSetting('autoAcceptSubscriptions', v)}
              trackColor={{ false: colors.disabled, true: colors.primaryLight }}
              thumbColor={settings.autoAcceptSubscriptions ? colors.primary : colors.textLight}
            />
          </View>
          <Input
            label="Default Delivery Slot"
            value={settings.defaultDeliverySlot}
            onChangeText={(t) => updateSetting('defaultDeliverySlot', t)}
          />
          <Input
            label="Min. Order Value for Subscription (₹)"
            value={settings.minOrderValueForSubscription}
            onChangeText={(t) => updateSetting('minOrderValueForSubscription', t.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
          />
          <Input
            label="Max Active Subscriptions"
            value={settings.maxActiveSubscriptions}
            onChangeText={(t) => updateSetting('maxActiveSubscriptions', t.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
          />
        </Card>

        <Card title="Pause Settings">
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>Allow Pause</Text>
              <Text style={styles.switchHint}>Let customers pause subscriptions</Text>
            </View>
            <Switch
              value={settings.allowSubscriptionPause}
              onValueChange={(v) => updateSetting('allowSubscriptionPause', v)}
              trackColor={{ false: colors.disabled, true: colors.primaryLight }}
              thumbColor={settings.allowSubscriptionPause ? colors.primary : colors.textLight}
            />
          </View>
          {settings.allowSubscriptionPause && (
            <Input
              label="Max Pause Duration (days)"
              value={settings.maxPauseDays}
              onChangeText={(t) => updateSetting('maxPauseDays', t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
            />
          )}
        </Card>

        <Card title="Notifications">
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>Delivery Reminders</Text>
              <Text style={styles.switchHint}>Send reminders before upcoming deliveries</Text>
            </View>
            <Switch
              value={settings.sendDeliveryReminders}
              onValueChange={(v) => updateSetting('sendDeliveryReminders', v)}
              trackColor={{ false: colors.disabled, true: colors.primaryLight }}
              thumbColor={settings.sendDeliveryReminders ? colors.primary : colors.textLight}
            />
          </View>
          {settings.sendDeliveryReminders && (
            <Input
              label="Remind Before (hours)"
              value={settings.reminderTimeBefore}
              onChangeText={(t) => updateSetting('reminderTimeBefore', t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
            />
          )}
        </Card>

        <Button title="Save Settings" onPress={handleSave} style={styles.saveBtn} />
        <View style={styles.bottomPadding} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  switchInfo: { flex: 1, marginRight: spacing.md },
  switchLabel: { fontSize: fonts.sizes.md, fontWeight: '500', color: colors.text },
  switchHint: { fontSize: fonts.sizes.sm, color: colors.textSecondary, marginTop: 2 },
  saveBtn: { marginTop: spacing.lg },
  bottomPadding: { height: 30 },
});

export default SubscriptionSettingsScreen;
