import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../utils/theme';
import SubscriptionDashboardScreen from '../screens/subscriptions/SubscriptionDashboardScreen';
import SubscriptionListScreen from '../screens/subscriptions/SubscriptionListScreen';
import SubscriptionDetailScreen from '../screens/subscriptions/SubscriptionDetailScreen';
import TodayDeliveriesScreen from '../screens/subscriptions/TodayDeliveriesScreen';
import SubscriptionSettingsScreen from '../screens/subscriptions/SubscriptionSettingsScreen';

const Stack = createNativeStackNavigator();

const SubscriptionNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.white },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="SubscriptionDashboard"
        component={SubscriptionDashboardScreen}
        options={{ title: 'Subscriptions' }}
      />
      <Stack.Screen
        name="SubscriptionList"
        component={SubscriptionListScreen}
        options={{ title: 'All Subscriptions' }}
      />
      <Stack.Screen
        name="SubscriptionDetail"
        component={SubscriptionDetailScreen}
        options={{ title: 'Subscription Details' }}
      />
      <Stack.Screen
        name="TodayDeliveries"
        component={TodayDeliveriesScreen}
        options={{ title: "Today's Deliveries" }}
      />
      <Stack.Screen
        name="SubscriptionSettings"
        component={SubscriptionSettingsScreen}
        options={{ title: 'Subscription Settings' }}
      />
    </Stack.Navigator>
  );
};

export default SubscriptionNavigator;
