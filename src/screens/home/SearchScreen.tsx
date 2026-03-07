import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, fonts, spacing, borderRadius } from '../../utils/theme';
import { debounce } from '../../utils/helpers';

type SearchCategory = 'products' | 'orders' | 'transactions';

const SearchScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('products');
  const [results, setResults] = useState<any[]>([]);

  const categories: { key: SearchCategory; label: string; icon: string }[] = [
    { key: 'products', label: 'Products', icon: '🏷️' },
    { key: 'orders', label: 'Orders', icon: '📦' },
    { key: 'transactions', label: 'Transactions', icon: '💳' },
  ];

  const performSearch = useCallback(
    debounce((searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }
      // API search would go here. For now, show placeholder.
      setResults([]);
    }, 300),
    [activeCategory]
  );

  const handleQueryChange = (text: string) => {
    setQuery(text);
    performSearch(text);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${activeCategory}...`}
          value={query}
          onChangeText={handleQueryChange}
          autoFocus
          placeholderTextColor={colors.placeholder}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setResults([]); }}>
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.categoriesRow}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[
              styles.categoryChip,
              activeCategory === cat.key && styles.categoryChipActive,
            ]}
            onPress={() => {
              setActiveCategory(cat.key);
              setResults([]);
              if (query) performSearch(query);
            }}
          >
            <Text style={styles.categoryIcon}>{cat.icon}</Text>
            <Text
              style={[
                styles.categoryText,
                activeCategory === cat.key && styles.categoryTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {!query ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyText}>Search for {activeCategory}</Text>
          <Text style={styles.emptySubtext}>
            Type to start searching across your {activeCategory}
          </Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>No results found</Text>
          <Text style={styles.emptySubtext}>Try a different search term</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.resultItem}>
              <Text style={styles.resultText}>{item.name || item.id}</Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item, index) => String(index)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
  searchIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: fonts.sizes.lg,
    color: colors.text,
  },
  clearIcon: {
    fontSize: 16,
    color: colors.textLight,
    padding: 4,
  },
  categoriesRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.round,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  categoryIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  categoryText: {
    fontSize: fonts.sizes.sm,
    color: colors.textSecondary,
  },
  categoryTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: fonts.sizes.lg,
    fontWeight: '600',
    color: colors.text,
  },
  emptySubtext: {
    fontSize: fonts.sizes.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  resultItem: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
  },
  resultText: {
    fontSize: fonts.sizes.md,
    color: colors.text,
  },
});

export default SearchScreen;
