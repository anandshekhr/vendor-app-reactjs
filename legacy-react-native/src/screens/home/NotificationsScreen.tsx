import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchNotifications, markNotificationRead } from '../../store/slices/dashboardSlice';
import { Card, EmptyState, Loader } from '../../components';
import { colors, fonts, spacing } from '../../utils/theme';
import { getRelativeTime } from '../../utils/helpers';
import { AppNotification } from '../../models/types';

const notificationIcons: Record<string, string> = {
  new_order: '📦',
  low_stock: '⚠️',
  subscription_expiry: '⏰',
  payment_received: '💰',
  promotion: '📢',
  new_subscription: '🔄',
  subscription_cancelled: '❌',
  subscription_paused: '⏸️',
  upcoming_delivery: '🚚',
};

const NotificationsScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const { notifications, isLoading } = useAppSelector((state) => state.dashboard);

  useEffect(() => {
    dispatch(fetchNotifications());
  }, [dispatch]);

  const handleNotificationPress = (notification: AppNotification) => {
    if (!notification.isRead) {
      dispatch(markNotificationRead(notification.id));
    }
  };

  const renderNotification = ({ item }: { item: AppNotification }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.isRead && styles.unread]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationIcon}>
        <Text style={styles.iconText}>{notificationIcons[item.type] || '📌'}</Text>
      </View>
      <View style={styles.notificationContent}>
        <Text style={[styles.notificationTitle, !item.isRead && styles.unreadText]}>
          {item.title}
        </Text>
        <Text style={styles.notificationBody}>{item.body}</Text>
        <Text style={styles.notificationTime}>{getRelativeTime(item.createdAt)}</Text>
      </View>
      {!item.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  if (isLoading) return <Loader />;

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            title="No Notifications"
            message="You're all caught up! No new notifications."
            icon={<Text style={styles.emptyIcon}>🔔</Text>}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  unread: {
    backgroundColor: colors.primaryLight,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconText: {
    fontSize: 18,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: fonts.sizes.md,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 4,
  },
  unreadText: {
    fontWeight: '700',
  },
  notificationBody: {
    fontSize: fonts.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  notificationTime: {
    fontSize: fonts.sizes.xs,
    color: colors.textLight,
    marginTop: 6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
  emptyIcon: {
    fontSize: 48,
  },
});

export default NotificationsScreen;
