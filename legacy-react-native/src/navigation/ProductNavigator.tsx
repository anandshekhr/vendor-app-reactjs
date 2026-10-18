import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../utils/theme';
import ProductListScreen from '../screens/products/ProductListScreen';
import AddProductScreen from '../screens/products/AddProductScreen';
import EditProductScreen from '../screens/products/EditProductScreen';
import ProductDetailScreen from '../screens/products/ProductDetailScreen';
import BarcodeScannerScreen from '../screens/products/BarcodeScannerScreen';
import MasterProductSearchScreen from '../screens/products/MasterProductSearchScreen';
import InventoryScreen from '../screens/inventory/InventoryScreen';

const Stack = createNativeStackNavigator();

const ProductNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.white },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="ProductList"
        component={ProductListScreen}
        options={{ title: 'Products' }}
      />
      <Stack.Screen
        name="AddProduct"
        component={AddProductScreen}
        options={{ title: 'Add Product' }}
      />
      <Stack.Screen
        name="EditProduct"
        component={EditProductScreen}
        options={{ title: 'Edit Product' }}
      />
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ title: 'Product Details' }}
      />
      <Stack.Screen
        name="BarcodeScanner"
        component={BarcodeScannerScreen}
        options={{ title: 'Scan Barcode' }}
      />
      <Stack.Screen
        name="MasterProductSearch"
        component={MasterProductSearchScreen}
        options={{ title: 'Search Product Master' }}
      />
      <Stack.Screen
        name="Inventory"
        component={InventoryScreen}
        options={{ title: 'Inventory Management' }}
      />
    </Stack.Navigator>
  );
};

export default ProductNavigator;
