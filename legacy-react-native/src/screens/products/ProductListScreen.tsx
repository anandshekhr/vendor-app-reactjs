import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Switch,
  RefreshControl,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchProducts, toggleProductStatus } from '../../store/slices/productSlice';
import { Card, StatusBadge, EmptyState, Loader } from '../../components';
import { colors, fonts, spacing, borderRadius, shadows } from '../../utils/theme';
import { formatCurrency, truncateText } from '../../utils/helpers';
import { Product } from '../../models/types';

const ProductListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { products, isLoading } = useAppSelector((state) => state.products);

  const loadProducts = useCallback(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleToggleActive = (product: Product) => {
    dispatch(toggleProductStatus({ id: product.id, isActive: !product.isActive }));
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.productImage}>
        {item.images.length > 0 ? (
          <Image source={{ uri: item.images[0] }} style={styles.image} />
        ) : (
          <Text style={styles.imagePlaceholder}>🏷️</Text>
        )}
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.productCategory}>{item.category}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatCurrency(item.discountPrice || item.price)}</Text>
          {item.discountPrice && (
            <Text style={styles.originalPrice}>{formatCurrency(item.price)}</Text>
          )}
          <Text style={styles.unit}>/ {item.unit}</Text>
        </View>
        <View style={styles.stockRow}>
          <Text
            style={[
              styles.stockText,
              item.stockQuantity <= item.lowStockThreshold && styles.lowStock,
            ]}
          >
            Stock: {item.stockQuantity}
          </Text>
          {item.isSubscriptionEnabled && (
            <StatusBadge status="active" label="Subscription" />
          )}
        </View>
      </View>
      <View style={styles.productActions}>
        <Switch
          value={item.isActive}
          onValueChange={() => handleToggleActive(item)}
          trackColor={{ false: colors.disabled, true: colors.primaryLight }}
          thumbColor={item.isActive ? colors.primary : colors.textLight}
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('MasterProductSearch')}
        >
          <Text style={styles.actionButtonText}>🔍 Master Search</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('BarcodeScanner')}
        >
          <Text style={styles.actionButtonText}>📷 Scan</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Inventory')}
        >
          <Text style={styles.actionButtonText}>📊 Stock</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadProducts} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              title="No Products Yet"
              message="Add your first product to start selling"
              actionLabel="Add Product"
              onAction={() => navigation.navigate('AddProduct')}
              icon={<Text style={styles.emptyIcon}>🏷️</Text>}
            />
          ) : null
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddProduct')}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+ Add Product</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.white,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: fonts.sizes.sm,
    color: colors.primary,
    fontWeight: '500',
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: 80,
    flexGrow: 1,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    fontSize: 28,
  },
  productInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  productName: {
    fontSize: fonts.sizes.md,
    fontWeight: '600',
    color: colors.text,
  },
  productCategory: {
    fontSize: fonts.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  price: {
    fontSize: fonts.sizes.md,
    fontWeight: '700',
    color: colors.success,
  },
  originalPrice: {
    fontSize: fonts.sizes.sm,
    color: colors.textLight,
    textDecorationLine: 'line-through',
  },
  unit: {
    fontSize: fonts.sizes.xs,
    color: colors.textSecondary,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: spacing.sm,
  },
  stockText: {
    fontSize: fonts.sizes.xs,
    color: colors.textSecondary,
  },
  lowStock: {
    color: colors.error,
    fontWeight: '600',
  },
  productActions: {
    justifyContent: 'center',
    paddingLeft: spacing.sm,
  },
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    left: 16,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    ...shadows.lg,
  },
  fabText: {
    color: colors.white,
    fontSize: fonts.sizes.lg,
    fontWeight: '600',
  },
  emptyIcon: {
    fontSize: 48,
  },
});

export default ProductListScreen;
