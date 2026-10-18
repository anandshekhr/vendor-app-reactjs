import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../utils/theme';
import MoreMenuScreen from '../screens/more/MoreMenuScreen';
import ProfileScreen from '../screens/more/ProfileScreen';
import EditProfileScreen from '../screens/more/EditProfileScreen';
import WalletScreen from '../screens/wallet/WalletScreen';
import WithdrawScreen from '../screens/wallet/WithdrawScreen';
import AddBankAccountScreen from '../screens/wallet/AddBankAccountScreen';
import TransactionHistoryScreen from '../screens/wallet/TransactionHistoryScreen';
import VendorPlansScreen from '../screens/plans/VendorPlansScreen';
import AnalyticsScreen from '../screens/analytics/AnalyticsScreen';
import SettingsScreen from '../screens/more/SettingsScreen';

const Stack = createNativeStackNavigator();

const MoreNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.white },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="MoreMenu"
        component={MoreMenuScreen}
        options={{ title: 'More' }}
      />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'My Profile' }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit Profile' }} />
      <Stack.Screen name="WalletHome" component={WalletScreen} options={{ title: 'Wallet' }} />
      <Stack.Screen name="WithdrawMoney" component={WithdrawScreen} options={{ title: 'Withdraw Money' }} />
      <Stack.Screen name="AddBankAccount" component={AddBankAccountScreen} options={{ title: 'Add Bank Account' }} />
      <Stack.Screen name="TransactionHistory" component={TransactionHistoryScreen} options={{ title: 'Transactions' }} />
      <Stack.Screen name="VendorPlans" component={VendorPlansScreen} options={{ title: 'Subscription Plans' }} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} options={{ title: 'Analytics' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Stack.Navigator>
  );
};

export default MoreNavigator;
