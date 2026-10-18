import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { searchMasterProducts, clearMasterProducts } from '../../store/slices/productSlice';
import { EmptyState } from '../../components';
import { colors, fonts, spacing, borderRadius, shadows } from '../../utils/theme';
import { debounce } from '../../utils/helpers';
import { MasterProduct } from '../../models/types';

const MasterProductSearchScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { masterProducts, isLoading } = useAppSelector((state) => state.products);
  const [query, setQuery] = useState('');

  const performSearch = useCallback(
    debounce((searchQuery: string) => {
      if (searchQuery.trim().length >= 2) {
        dispatch(searchMasterProducts(searchQuery.trim()));
      } else {
        dispatch(clearMasterProducts());
      }
    }, 300),
    [dispatch]
  );

  const handleQueryChange = (text: string) => {
    setQuery(text);
    performSearch(text);
  };

  const handleSelectProduct = (product: MasterProduct) => {
    navigation.navigate('AddProduct', { masterProduct: product });
  };

  const renderProduct = ({ item }: { item: MasterProduct }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => handleSelectProduct(item)}
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
        <Text style={styles.productName}>{item.name}</Text>
        {item.brand && <Text style={styles.brand}>{item.brand}</Text>}
        <Text style={styles.category}>
          {item.category} › {item.subcategory}
        </Text>
        <Text style={styles.unit}>Unit: {item.unit}</Text>
      </View>
      <Text style={styles.selectIcon}>→</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder='Search products (e.g., "Amul Milk", "Atta")'
          value={query}
          onChangeText={handleQueryChange}
          autoFocus
          placeholderTextColor={colors.placeholder}
        />
      </View>

      <Text style={styles.hint}>
        Search from master product database. Select a product to auto-fill details.
      </Text>

      <FlatList
        data={masterProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          query.length >= 2 && !isLoading ? (
            <EmptyState
              title="No Products Found"
              message="Try a different search term or add the product manually"
              actionLabel="Add Manually"
              onAction={() => navigation.navigate('AddProduct')}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTitle}>Search Product Master</Text>
              <Text style={styles.emptyText}>
                Search for products like "Milk", "Rice", "Bread" etc.{'\n'}
                The system will auto-fill product details for you.
              </Text>
            </View>
          )
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    margin: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: { fontSize: 16, marginRight: spacing.sm },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: fonts.sizes.lg, color: colors.text },
  hint: {
    fontSize: fonts.sizes.sm,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  listContent: { padding: spacing.lg, paddingTop: 0, flexGrow: 1 },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  productImage: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  imagePlaceholder: { fontSize: 24 },
  productInfo: { flex: 1, marginLeft: spacing.md },
  productName: { fontSize: fonts.sizes.md, fontWeight: '600', color: colors.text },
  brand: { fontSize: fonts.sizes.sm, color: colors.primary, marginTop: 2 },
  category: { fontSize: fonts.sizes.xs, color: colors.textSecondary, marginTop: 2 },
  unit: { fontSize: fonts.sizes.xs, color: colors.textLight, marginTop: 2 },
  selectIcon: { fontSize: 18, color: colors.primary, fontWeight: '700' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 100 },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontSize: fonts.sizes.lg, fontWeight: '600', color: colors.text },
  emptyText: { fontSize: fonts.sizes.md, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20 },
});

export default MasterProductSearchScreen;
