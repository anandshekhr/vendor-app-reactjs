import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, fonts, borderRadius, spacing, shadows } from '../../utils/theme';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: string;
  bgColor?: string;
  trend?: 'up' | 'down';
  trendValue?: string;
  style?: ViewStyle;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color = colors.primary,
  bgColor,
  trend,
  trendValue,
  style,
}) => {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: bgColor || `${color}20` }]}>
            {icon}
          </View>
        )}
      </View>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
      {trend && trendValue && (
        <Text style={[styles.trend, { color: trend === 'up' ? colors.success : colors.error }]}>
          {trend === 'up' ? '↑' : '↓'} {trendValue}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flex: 1,
    minWidth: 140,
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: fonts.sizes.xxl,
    fontWeight: '700',
    marginBottom: 2,
  },
  title: {
    fontSize: fonts.sizes.sm,
    color: colors.textSecondary,
  },
  trend: {
    fontSize: fonts.sizes.xs,
    fontWeight: '500',
    marginTop: 4,
  },
});

export default StatCard;
