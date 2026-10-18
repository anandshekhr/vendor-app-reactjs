import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchProductById, updateProduct } from '../../store/slices/productSlice';
import { Button, Input, Card, Loader } from '../../components';
import { colors, fonts, spacing } from '../../utils/theme';
import { PRODUCT_UNITS } from '../../utils/constants';

const EditProductScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const { selectedProduct, isLoading } = useAppSelector((state) => state.products);
  const { productId } = route.params;

  const [form, setForm] = useState({
    name: '',
    category: '',
    subcategory: '',
    price: '',
    discountPrice: '',
    description: '',
    stockQuantity: '',
    sku: '',
    barcode: '',
    isSubscriptionEnabled: false,
    lowStockThreshold: '5',
  });

  useEffect(() => {
    dispatch(fetchProductById(productId));
  }, [dispatch, productId]);

  useEffect(() => {
    if (selectedProduct) {
      setForm({
        name: selectedProduct.name,
        category: selectedProduct.category,
        subcategory: selectedProduct.subcategory,
        price: String(selectedProduct.price),
        discountPrice: selectedProduct.discountPrice ? String(selectedProduct.discountPrice) : '',
        description: selectedProduct.description,
        stockQuantity: String(selectedProduct.stockQuantity),
        sku: selectedProduct.sku || '',
        barcode: selectedProduct.barcode || '',
        isSubscriptionEnabled: selectedProduct.isSubscriptionEnabled,
        lowStockThreshold: String(selectedProduct.lowStockThreshold),
      });
    }
  }, [selectedProduct]);

  const updateField = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdate = async () => {
    if (!form.name.trim() || !form.price.trim()) {
      Alert.alert('Error', 'Name and price are required');
      return;
    }

    try {
      await dispatch(updateProduct({ id: productId, data: form })).unwrap();
      Alert.alert('Success', 'Product updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err || 'Failed to update product');
    }
  };

  if (!selectedProduct && isLoading) return <Loader />;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <Card title="Basic Information">
          <Input label="Product Name *" value={form.name} onChangeText={(t) => updateField('name', t)} />
          <Input label="Category *" value={form.category} onChangeText={(t) => updateField('category', t)} />
          <Input label="Subcategory" value={form.subcategory} onChangeText={(t) => updateField('subcategory', t)} />
          <Input label="Description" value={form.description} onChangeText={(t) => updateField('description', t)} multiline />
        </Card>

        <Card title="Pricing">
          <Input label="Price (₹) *" value={form.price} onChangeText={(t) => updateField('price', t.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" />
          <Input label="Discount Price (₹)" value={form.discountPrice} onChangeText={(t) => updateField('discountPrice', t.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" />
        </Card>

        <Card title="Stock">
          <Input label="Stock Quantity *" value={form.stockQuantity} onChangeText={(t) => updateField('stockQuantity', t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" />
          <Input label="Low Stock Threshold" value={form.lowStockThreshold} onChangeText={(t) => updateField('lowStockThreshold', t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" />
          <Input label="SKU" value={form.sku} onChangeText={(t) => updateField('sku', t)} />
          <Input label="Barcode" value={form.barcode} onChangeText={(t) => updateField('barcode', t)} />
        </Card>

        <Card title="Subscription">
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Allow Subscription</Text>
            <Switch
              value={form.isSubscriptionEnabled}
              onValueChange={(val) => updateField('isSubscriptionEnabled', val)}
              trackColor={{ false: colors.disabled, true: colors.primaryLight }}
              thumbColor={form.isSubscriptionEnabled ? colors.primary : colors.textLight}
            />
          </View>
        </Card>

        <Button title="Update Product" onPress={handleUpdate} loading={isLoading} style={styles.updateButton} />
        <View style={styles.bottomPadding} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchLabel: { fontSize: fonts.sizes.md, fontWeight: '500', color: colors.text },
  updateButton: { marginTop: spacing.lg },
  bottomPadding: { height: 30 },
});

export default EditProductScreen;
