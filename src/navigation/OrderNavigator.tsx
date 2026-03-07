import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../utils/theme';
import OrderListScreen from '../screens/orders/OrderListScreen';
import OrderDetailScreen from '../screens/orders/OrderDetailScreen';
import AssignDeliveryScreen from '../screens/orders/AssignDeliveryScreen';

const Stack = createNativeStackNavigator();

const OrderNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.white },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="OrderList"
        component={OrderListScreen}
        options={{ title: 'Orders' }}
      />
      <Stack.Screen
        name="OrderDetail"
        component={OrderDetailScreen}
        options={{ title: 'Order Details' }}
      />
      <Stack.Screen
        name="AssignDeliveryPartner"
        component={AssignDeliveryScreen}
        options={{ title: 'Assign Delivery Partner' }}
      />
    </Stack.Navigator>
  );
};

export default OrderNavigator;
