import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchInventory,
  updateStock,
  toggleLowStockFilter,
} from '../../store/slices/inventorySlice';
import { Card, EmptyState, Loader } from '../../components';
import { colors, fonts, spacing, borderRadius, shadows } from '../../utils/theme';
import { InventoryItem } from '../../models/types';

const InventoryScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const { inventory, isLoading, showLowStockOnly } = useAppSelector((state) => state.inventory);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempQty, setTempQty] = useState('');

  const loadInventory = useCallback(() => {
    dispatch(fetchInventory());
  }, [dispatch]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const displayItems = showLowStockOnly
    ? inventory.filter((item) => item.stockQuantity <= item.lowStockThreshold)
    : inventory;

  const startEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setTempQty(String(item.stockQuantity));
  };

  const saveStock = (item: InventoryItem) => {
    const newQty = parseInt(tempQty, 10);
    if (isNaN(newQty) || newQty < 0) {
      Alert.alert('Invalid', 'Enter a valid stock quantity');
      return;
    }
    dispatch(updateStock({ productId: item.productId, quantity: newQty }));
    setEditingId(null);
  };

  const quickAdjust = (item: InventoryItem, delta: number) => {
    const newQty = Math.max(0, item.stockQuantity + delta);
    dispatch(updateStock({ productId: item.productId, quantity: newQty }));
  };

  const renderItem = ({ item }: { item: InventoryItem }) => {
    const isLow = item.stockQuantity <= item.lowStockThreshold;
    const isEditing = editingId === item.id;

    return (
      <View style={[styles.inventoryCard, isLow && styles.lowStockCard]}>
        <View style={styles.itemHeader}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName} numberOfLines={1}>{item.productName}</Text>
            <Text style={styles.itemUnit}>{item.unit}</Text>
          </View>
          {isLow && (
            <View style={styles.lowBadge}>
              <Text style={styles.lowBadgeText}>Low Stock</Text>
            </View>
          )}
        </View>

        <View style={styles.stockControl}>
          <TouchableOpacity
            style={styles.adjustBtn}
            onPress={() => quickAdjust(item, -1)}
          >
            <Text style={styles.adjustBtnText}>−</Text>
          </TouchableOpacity>

          {isEditing ? (
            <TextInput
              style={styles.stockInput}
              value={tempQty}
              onChangeText={(t) => setTempQty(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              autoFocus
              onBlur={() => saveStock(item)}
              onSubmitEditing={() => saveStock(item)}
            />
          ) : (
            <TouchableOpacity
              style={styles.stockDisplay}
              onPress={() => startEdit(item)}
            >
              <Text style={[styles.stockValue, isLow && styles.stockValueLow]}>
                {item.stockQuantity}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.adjustBtn}
            onPress={() => quickAdjust(item, 1)}
          >
            <Text style={styles.adjustBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.thresholdRow}>
          <Text style={styles.thresholdText}>
            Alert at: {item.lowStockThreshold} {item.unit}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterChip, !showLowStockOnly && styles.filterChipActive]}
          onPress={() => showLowStockOnly && dispatch(toggleLowStockFilter())}
        >
          <Text style={[styles.filterText, !showLowStockOnly && styles.filterTextActive]}>
            All ({inventory.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, showLowStockOnly && styles.filterChipActive]}
          onPress={() => !showLowStockOnly && dispatch(toggleLowStockFilter())}
        >
          <Text style={[styles.filterText, showLowStockOnly && styles.filterTextActive]}>
            ⚠️ Low Stock ({inventory.filter((i) => i.stockQuantity <= i.lowStockThreshold).length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={displayItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadInventory} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              title={showLowStockOnly ? 'No Low Stock Items' : 'No Inventory'}
              message={showLowStockOnly ? 'All products are well stocked!' : 'Add products to manage inventory'}
              icon={<Text style={{ fontSize: 48 }}>📦</Text>}
            />
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  filterBar: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.white,
    gap: spacing.sm,
  },
  filterChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.round,
    backgroundColor: colors.background,
  },
  filterChipActive: { backgroundColor: colors.primary },
  filterText: { fontSize: fonts.sizes.sm, color: colors.textSecondary, fontWeight: '500' },
  filterTextActive: { color: colors.white },
  listContent: { padding: spacing.lg, flexGrow: 1 },
  inventoryCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  lowStockCard: { borderLeftWidth: 4, borderLeftColor: colors.error },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  itemInfo: { flex: 1 },
  itemName: { fontSize: fonts.sizes.md, fontWeight: '600', color: colors.text },
  itemUnit: { fontSize: fonts.sizes.xs, color: colors.textSecondary, marginTop: 2 },
  lowBadge: { backgroundColor: colors.errorLight, paddingVertical: 2, paddingHorizontal: spacing.sm, borderRadius: 10 },
  lowBadgeText: { fontSize: fonts.sizes.xs, color: colors.error, fontWeight: '600' },
  stockControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  adjustBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  adjustBtnText: { fontSize: 22, color: colors.primary, fontWeight: '600' },
  stockDisplay: {
    minWidth: 60,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
  },
  stockValue: { fontSize: fonts.sizes.xxl, fontWeight: '700', color: colors.text },
  stockValueLow: { color: colors.error },
  stockInput: {
    minWidth: 60,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    textAlign: 'center',
    fontSize: fonts.sizes.xxl,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  thresholdRow: { marginTop: spacing.sm, alignItems: 'center' },
  thresholdText: { fontSize: fonts.sizes.xs, color: colors.textLight },
});

export default InventoryScreen;
