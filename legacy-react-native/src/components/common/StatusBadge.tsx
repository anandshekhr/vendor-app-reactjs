import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { colors, fonts, borderRadius, spacing } from '../../utils/theme';

interface StatusBadgeProps {
  status: string;
  label?: string;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  active: { bg: colors.successLight, text: colors.success },
  paused: { bg: colors.warningLight, text: colors.warning },
  cancelled: { bg: colors.errorLight, text: colors.error },
  completed: { bg: colors.infoLight, text: colors.info },
  pending: { bg: colors.warningLight, text: colors.warning },
  paid: { bg: colors.successLight, text: colors.success },
  failed: { bg: colors.errorLight, text: colors.error },
  new: { bg: colors.warningLight, text: colors.warning },
  accepted: { bg: colors.infoLight, text: colors.info },
  preparing: { bg: '#F3E5F5', text: '#9C27B0' },
  ready_for_pickup: { bg: '#E0F7FA', text: '#00BCD4' },
  out_for_delivery: { bg: '#E8EAF6', text: '#3F51B5' },
  delivered: { bg: colors.successLight, text: colors.success },
  skipped: { bg: '#F5F5F5', text: '#9E9E9E' },
  rescheduled: { bg: colors.warningLight, text: colors.warning },
  success: { bg: colors.successLight, text: colors.success },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, size = 'sm', style }) => {
  const colorSet = statusColors[status] || { bg: '#F5F5F5', text: '#9E9E9E' };
  const displayLabel = label || status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colorSet.bg },
        size === 'md' && styles.badgeMd,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: colorSet.text },
          size === 'md' && styles.textMd,
        ]}
      >
        {displayLabel}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.round,
    alignSelf: 'flex-start',
  },
  badgeMd: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  text: {
    fontSize: fonts.sizes.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  textMd: {
    fontSize: fonts.sizes.sm,
  },
});

export default StatusBadge;
