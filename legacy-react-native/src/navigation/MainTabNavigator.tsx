import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { MainTabParamList } from '../models/types';
import { colors, fonts } from '../utils/theme';
import HomeNavigator from './HomeNavigator';
import OrderNavigator from './OrderNavigator';
import ProductNavigator from './ProductNavigator';
import SubscriptionNavigator from './SubscriptionNavigator';
import MoreNavigator from './MoreNavigator';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TabIcon: React.FC<{ label: string; emoji: string; focused: boolean }> = ({
  label,
  emoji,
  focused,
}) => (
  <View style={styles.tabIcon}>
    <Text style={[styles.emoji, focused && styles.emojiFocused]}>{emoji}</Text>
    <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>{label}</Text>
  </View>
);

const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Home" emoji="🏠" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrderNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Orders" emoji="📦" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Products"
        component={ProductNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Products" emoji="🏷️" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Subscriptions"
        component={SubscriptionNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Subscriptions" emoji="🔄" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="More" emoji="☰" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    height: 65,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 5,
    paddingBottom: 8,
  },
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 20,
    opacity: 0.5,
  },
  emojiFocused: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: fonts.sizes.xs,
    color: colors.textLight,
    marginTop: 2,
  },
  tabLabelFocused: {
    color: colors.primary,
    fontWeight: '600',
  },
});

export default MainTabNavigator;
