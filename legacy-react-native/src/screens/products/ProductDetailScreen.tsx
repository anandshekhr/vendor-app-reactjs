import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchProductById, deleteProduct, toggleProductStatus } from '../../store/slices/productSlice';
import { Button, Card, StatusBadge, Loader } from '../../components';
import { colors, fonts, spacing, borderRadius, shadows } from '../../utils/theme';
import { formatCurrency, capitalize } from '../../utils/helpers';

const ProductDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const { selectedProduct: product, isLoading } = useAppSelector((state) => state.products);
  const { productId } = route.params;

  useEffect(() => {
    dispatch(fetchProductById(productId));
  }, [dispatch, productId]);

  const handleDelete = () => {
    Alert.alert('Delete Product', 'Are you sure you want to delete this product?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await dispatch(deleteProduct(productId));
          navigation.goBack();
        },
      },
    ]);
  };

  const handleToggle = () => {
    if (product) {
      dispatch(toggleProductStatus({ id: product.id, isActive: !product.isActive }));
    }
  };

  if (isLoading || !product) return <Loader />;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Product Images */}
      <View style={styles.imageContainer}>
        {product.images.length > 0 ? (
          <Image source={{ uri: product.images[0] }} style={styles.productImage} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>🏷️</Text>
          </View>
        )}
        <View style={styles.statusOverlay}>
          <StatusBadge status={product.isActive ? 'active' : 'cancelled'} label={product.isActive ? 'Active' : 'Inactive'} size="md" />
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.category}>{product.category} › {product.subcategory}</Text>

        {/* Price */}
        <Card>
          <View style={styles.priceContainer}>
            <View>
              <Text style={styles.priceLabel}>Selling Price</Text>
              <Text style={styles.priceValue}>
                {formatCurrency(product.discountPrice || product.price)}
              </Text>
            </View>
            {product.discountPrice && (
              <View>
                <Text style={styles.priceLabel}>MRP</Text>
                <Text style={styles.originalPrice}>{formatCurrency(product.price)}</Text>
              </View>
            )}
            <View>
              <Text style={styles.priceLabel}>Unit</Text>
              <Text style={styles.unitText}>{capitalize(product.unit)}</Text>
            </View>
          </View>
        </Card>

        {/* Stock */}
        <Card title="Stock Information">
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Current Stock</Text>
            <Text style={[styles.infoValue, product.stockQuantity <= product.lowStockThreshold && styles.lowStock]}>
              {product.stockQuantity} {product.unit}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Low Stock Alert</Text>
            <Text style={styles.infoValue}>{product.lowStockThreshold} {product.unit}</Text>
          </View>
          {product.sku && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>SKU</Text>
              <Text style={styles.infoValue}>{product.sku}</Text>
            </View>
          )}
          {product.barcode && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Barcode</Text>
              <Text style={styles.infoValue}>{product.barcode}</Text>
            </View>
          )}
        </Card>

        {/* Subscription */}
        {product.isSubscriptionEnabled && (
          <Card title="Subscription">
            <StatusBadge status="active" label="Subscription Enabled" size="md" />
            {product.subscriptionFrequencies && (
              <View style={styles.freqRow}>
                {product.subscriptionFrequencies.map((f) => (
                  <View key={f} style={styles.freqChip}>
                    <Text style={styles.freqText}>{capitalize(f)}</Text>
                  </View>
                ))}
              </View>
            )}
          </Card>
        )}

        {/* Description */}
        {product.description && (
          <Card title="Description">
            <Text style={styles.description}>{product.description}</Text>
          </Card>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="Edit Product"
            onPress={() => navigation.navigate('EditProduct', { productId: product.id })}
            style={styles.editButton}
          />
          <Button
            title={product.isActive ? 'Disable Product' : 'Enable Product'}
            onPress={handleToggle}
            variant="outline"
            style={styles.toggleButton}
          />
          <Button
            title="Delete Product"
            onPress={handleDelete}
            variant="danger"
            style={styles.deleteButton}
          />
        </View>

        <View style={styles.bottomPadding} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  imageContainer: { height: 250, backgroundColor: colors.background, position: 'relative' },
  productImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  imagePlaceholderText: { fontSize: 64 },
  statusOverlay: { position: 'absolute', top: spacing.md, right: spacing.md },
  content: { padding: spacing.lg },
  productName: { fontSize: fonts.sizes.xxl, fontWeight: '700', color: colors.text },
  category: { fontSize: fonts.sizes.md, color: colors.textSecondary, marginTop: 4, marginBottom: spacing.lg },
  priceContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  priceLabel: { fontSize: fonts.sizes.sm, color: colors.textSecondary, marginBottom: 4 },
  priceValue: { fontSize: fonts.sizes.xxl, fontWeight: '700', color: colors.success },
  originalPrice: { fontSize: fonts.sizes.lg, color: colors.textLight, textDecorationLine: 'line-through' },
  unitText: { fontSize: fonts.sizes.lg, color: colors.text, fontWeight: '500' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  infoLabel: { fontSize: fonts.sizes.md, color: colors.textSecondary },
  infoValue: { fontSize: fonts.sizes.md, fontWeight: '600', color: colors.text },
  lowStock: { color: colors.error },
  freqRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  freqChip: { paddingVertical: 4, paddingHorizontal: spacing.md, backgroundColor: colors.primaryLight, borderRadius: 20 },
  freqText: { fontSize: fonts.sizes.sm, color: colors.primary, fontWeight: '500' },
  description: { fontSize: fonts.sizes.md, color: colors.text, lineHeight: 22 },
  actions: { marginTop: spacing.lg, gap: spacing.md },
  editButton: {},
  toggleButton: {},
  deleteButton: {},
  bottomPadding: { height: 30 },
});

export default ProductDetailScreen;
