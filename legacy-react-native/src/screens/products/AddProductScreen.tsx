import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { addProduct } from '../../store/slices/productSlice';
import { Button, Input, Card } from '../../components';
import { colors, fonts, spacing, borderRadius } from '../../utils/theme';
import { PRODUCT_UNITS, SUBSCRIPTION_FREQUENCIES } from '../../utils/constants';
import { ProductUnit, SubscriptionFrequency } from '../../models/types';

const AddProductScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((state) => state.products);

  const [form, setForm] = useState({
    name: '',
    category: '',
    subcategory: '',
    price: '',
    discountPrice: '',
    unit: 'piece' as ProductUnit,
    description: '',
    images: [] as string[],
    stockQuantity: '',
    sku: '',
    barcode: '',
    isSubscriptionEnabled: false,
    subscriptionFrequencies: [] as SubscriptionFrequency[],
    minSubscriptionDuration: '',
    subscriptionDiscount: '',
    lowStockThreshold: '5',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showUnits, setShowUnits] = useState(false);

  const updateField = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const toggleFrequency = (freq: SubscriptionFrequency) => {
    setForm((prev) => ({
      ...prev,
      subscriptionFrequencies: prev.subscriptionFrequencies.includes(freq)
        ? prev.subscriptionFrequencies.filter((f) => f !== freq)
        : [...prev.subscriptionFrequencies, freq],
    }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = 'Product name is required';
    if (!form.category.trim()) newErrors.category = 'Category is required';
    if (!form.price.trim()) newErrors.price = 'Price is required';
    else if (isNaN(Number(form.price)) || Number(form.price) <= 0)
      newErrors.price = 'Enter a valid price';
    if (form.discountPrice && Number(form.discountPrice) >= Number(form.price))
      newErrors.discountPrice = 'Discount price must be less than regular price';
    if (!form.stockQuantity.trim()) newErrors.stockQuantity = 'Stock quantity is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      await dispatch(addProduct(form)).unwrap();
      Alert.alert('Success', 'Product added successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err || 'Failed to add product');
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Basic Info */}
        <Card title="Basic Information">
          <Input
            label="Product Name *"
            placeholder="Enter product name"
            value={form.name}
            onChangeText={(text) => updateField('name', text)}
            error={errors.name}
          />
          <Input
            label="Category *"
            placeholder="Enter category"
            value={form.category}
            onChangeText={(text) => updateField('category', text)}
            error={errors.category}
          />
          <Input
            label="Subcategory"
            placeholder="Enter subcategory"
            value={form.subcategory}
            onChangeText={(text) => updateField('subcategory', text)}
          />
          <Input
            label="Description"
            placeholder="Enter product description"
            value={form.description}
            onChangeText={(text) => updateField('description', text)}
            multiline
            numberOfLines={3}
          />
        </Card>

        {/* Pricing */}
        <Card title="Pricing">
          <Input
            label="Price (₹) *"
            placeholder="0.00"
            value={form.price}
            onChangeText={(text) => updateField('price', text.replace(/[^0-9.]/g, ''))}
            keyboardType="decimal-pad"
            error={errors.price}
          />
          <Input
            label="Discount Price (₹)"
            placeholder="0.00"
            value={form.discountPrice}
            onChangeText={(text) => updateField('discountPrice', text.replace(/[^0-9.]/g, ''))}
            keyboardType="decimal-pad"
            error={errors.discountPrice}
          />
          <View style={styles.unitSelector}>
            <Text style={styles.unitLabel}>Unit *</Text>
            <TouchableOpacity
              style={styles.unitButton}
              onPress={() => setShowUnits(!showUnits)}
            >
              <Text style={styles.unitValue}>
                {PRODUCT_UNITS.find((u) => u.value === form.unit)?.label || form.unit}
              </Text>
              <Text>{showUnits ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showUnits && (
              <View style={styles.unitList}>
                {PRODUCT_UNITS.map((unit) => (
                  <TouchableOpacity
                    key={unit.value}
                    style={[
                      styles.unitItem,
                      form.unit === unit.value && styles.unitItemSelected,
                    ]}
                    onPress={() => {
                      updateField('unit', unit.value);
                      setShowUnits(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.unitItemText,
                        form.unit === unit.value && styles.unitItemTextSelected,
                      ]}
                    >
                      {unit.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </Card>

        {/* Stock & Identification */}
        <Card title="Stock & Identification">
          <Input
            label="Stock Quantity *"
            placeholder="0"
            value={form.stockQuantity}
            onChangeText={(text) => updateField('stockQuantity', text.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            error={errors.stockQuantity}
          />
          <Input
            label="Low Stock Threshold"
            placeholder="5"
            value={form.lowStockThreshold}
            onChangeText={(text) => updateField('lowStockThreshold', text.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
          />
          <Input
            label="SKU"
            placeholder="Enter SKU code"
            value={form.sku}
            onChangeText={(text) => updateField('sku', text)}
          />
          <View style={styles.barcodeRow}>
            <View style={styles.barcodeInput}>
              <Input
                label="Barcode"
                placeholder="Scan or enter barcode"
                value={form.barcode}
                onChangeText={(text) => updateField('barcode', text)}
              />
            </View>
            <TouchableOpacity
              style={styles.scanButton}
              onPress={() => navigation.navigate('BarcodeScanner')}
            >
              <Text style={styles.scanIcon}>📷</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Images */}
        <Card title="Product Images">
          <TouchableOpacity style={styles.imageUpload}>
            <Text style={styles.imageUploadIcon}>📸</Text>
            <Text style={styles.imageUploadText}>Tap to add images</Text>
            <Text style={styles.imageUploadHint}>Add up to 5 images</Text>
          </TouchableOpacity>
        </Card>

        {/* Subscription Settings */}
        <Card title="Subscription Settings">
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>Allow Subscription</Text>
              <Text style={styles.switchHint}>Enable for recurring orders</Text>
            </View>
            <Switch
              value={form.isSubscriptionEnabled}
              onValueChange={(val) => updateField('isSubscriptionEnabled', val)}
              trackColor={{ false: colors.disabled, true: colors.primaryLight }}
              thumbColor={form.isSubscriptionEnabled ? colors.primary : colors.textLight}
            />
          </View>

          {form.isSubscriptionEnabled && (
            <>
              <Text style={styles.freqLabel}>Available Frequencies</Text>
              <View style={styles.freqRow}>
                {SUBSCRIPTION_FREQUENCIES.map((freq) => (
                  <TouchableOpacity
                    key={freq.value}
                    style={[
                      styles.freqChip,
                      form.subscriptionFrequencies.includes(freq.value as SubscriptionFrequency) &&
                        styles.freqChipSelected,
                    ]}
                    onPress={() => toggleFrequency(freq.value as SubscriptionFrequency)}
                  >
                    <Text
                      style={[
                        styles.freqChipText,
                        form.subscriptionFrequencies.includes(freq.value as SubscriptionFrequency) &&
                          styles.freqChipTextSelected,
                      ]}
                    >
                      {freq.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Input
                label="Min. Subscription Duration (days)"
                placeholder="7"
                value={form.minSubscriptionDuration}
                onChangeText={(text) =>
                  updateField('minSubscriptionDuration', text.replace(/[^0-9]/g, ''))
                }
                keyboardType="number-pad"
              />
              <Input
                label="Subscription Discount (%)"
                placeholder="0"
                value={form.subscriptionDiscount}
                onChangeText={(text) =>
                  updateField('subscriptionDiscount', text.replace(/[^0-9.]/g, ''))
                }
                keyboardType="decimal-pad"
              />
            </>
          )}
        </Card>

        <Button
          title="Add Product"
          onPress={handleSubmit}
          loading={isLoading}
          style={styles.submitButton}
        />

        <View style={styles.bottomPadding} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  unitSelector: {
    marginBottom: spacing.lg,
  },
  unitLabel: {
    fontSize: fonts.sizes.md,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  unitButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
  },
  unitValue: {
    fontSize: fonts.sizes.lg,
    color: colors.text,
  },
  unitList: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    maxHeight: 200,
  },
  unitItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  unitItemSelected: {
    backgroundColor: colors.primaryLight,
  },
  unitItemText: {
    fontSize: fonts.sizes.md,
    color: colors.text,
  },
  unitItemTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  barcodeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  barcodeInput: {
    flex: 1,
  },
  scanButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  scanIcon: {
    fontSize: 22,
  },
  imageUpload: {
    alignItems: 'center',
    padding: spacing.xxl,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: borderRadius.lg,
  },
  imageUploadIcon: {
    fontSize: 36,
    marginBottom: spacing.sm,
  },
  imageUploadText: {
    fontSize: fonts.sizes.md,
    color: colors.primary,
    fontWeight: '500',
  },
  imageUploadHint: {
    fontSize: fonts.sizes.sm,
    color: colors.textSecondary,
    marginTop: 4,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  switchLabel: {
    fontSize: fonts.sizes.md,
    fontWeight: '500',
    color: colors.text,
  },
  switchHint: {
    fontSize: fonts.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  freqLabel: {
    fontSize: fonts.sizes.md,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  freqRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  freqChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  freqChipSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  freqChipText: {
    fontSize: fonts.sizes.sm,
    color: colors.textSecondary,
  },
  freqChipTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  submitButton: {
    marginTop: spacing.lg,
  },
  bottomPadding: {
    height: 30,
  },
});

export default AddProductScreen;
