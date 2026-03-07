import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../utils/theme';
import DashboardScreen from '../screens/home/DashboardScreen';
import NotificationsScreen from '../screens/home/NotificationsScreen';
import SearchScreen from '../screens/home/SearchScreen';

const Stack = createNativeStackNavigator();

const HomeNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.white },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Notifications' }}
      />
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{ title: 'Search' }}
      />
    </Stack.Navigator>
  );
};

export default HomeNavigator;
