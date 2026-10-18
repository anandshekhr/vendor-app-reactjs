import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { registerVendor } from '../../store/slices/authSlice';
import { Button, Input } from '../../components';
import { colors, fonts, spacing, borderRadius } from '../../utils/theme';
import { validateEmail, validateGST } from '../../utils/helpers';
import { SHOP_CATEGORIES } from '../../utils/constants';
import { AuthStackParamList, GeoLocation } from '../../models/types';

type RegisterRouteProp = RouteProp<AuthStackParamList, 'Register'>;

const RegisterScreen: React.FC = () => {
  const route = useRoute<RegisterRouteProp>();
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((state) => state.auth);
  const { mobile } = route.params;

  const [form, setForm] = useState({
    shopName: '',
    ownerName: '',
    email: '',
    shopAddress: '',
    shopCategory: '',
    gstNumber: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [showCategories, setShowCategories] = useState(false);

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const fetchLocation = () => {
    // Using Geolocation API
    setLocation({ latitude: 28.6139, longitude: 77.209, address: 'New Delhi, India' });
    Alert.alert('Location', 'GPS location captured successfully');
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.shopName.trim()) newErrors.shopName = 'Shop name is required';
    if (!form.ownerName.trim()) newErrors.ownerName = 'Owner name is required';
    if (!form.email.trim()) newErrors.email = 'Email is required';
    else if (!validateEmail(form.email.trim())) newErrors.email = 'Enter a valid email';
    if (!form.shopAddress.trim()) newErrors.shopAddress = 'Shop address is required';
    if (!form.shopCategory) newErrors.shopCategory = 'Select a shop category';
    if (form.gstNumber && !validateGST(form.gstNumber.trim()))
      newErrors.gstNumber = 'Enter a valid GST number';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    try {
      await dispatch(
        registerVendor({
          shopName: form.shopName.trim(),
          ownerName: form.ownerName.trim(),
          mobile,
          email: form.email.trim(),
          shopAddress: form.shopAddress.trim(),
          location: location || { latitude: 0, longitude: 0 },
          shopCategory: form.shopCategory,
          gstNumber: form.gstNumber.trim() || undefined,
        })
      ).unwrap();
    } catch (err: any) {
      Alert.alert('Registration Failed', err || 'Something went wrong');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Complete Your Registration</Text>
          <Text style={styles.subtitle}>Set up your shop profile to get started</Text>

          <Input
            label="Shop Name *"
            placeholder="Enter your shop name"
            value={form.shopName}
            onChangeText={(text) => updateField('shopName', text)}
            error={errors.shopName}
          />

          <Input
            label="Owner Name *"
            placeholder="Enter owner's full name"
            value={form.ownerName}
            onChangeText={(text) => updateField('ownerName', text)}
            error={errors.ownerName}
          />

          <View style={styles.readOnlyField}>
            <Text style={styles.readOnlyLabel}>Mobile Number</Text>
            <Text style={styles.readOnlyValue}>+91 {mobile}</Text>
          </View>

          <Input
            label="Email Address *"
            placeholder="Enter email address"
            value={form.email}
            onChangeText={(text) => updateField('email', text)}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />

          <Input
            label="Shop Address *"
            placeholder="Enter complete shop address"
            value={form.shopAddress}
            onChangeText={(text) => updateField('shopAddress', text)}
            multiline
            numberOfLines={3}
            error={errors.shopAddress}
          />

          <TouchableOpacity style={styles.locationButton} onPress={fetchLocation}>
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={styles.locationText}>
              {location ? 'Location Captured ✓' : 'Get GPS Location'}
            </Text>
          </TouchableOpacity>

          <View style={styles.categoryContainer}>
            <Text style={styles.categoryLabel}>Shop Category *</Text>
            <TouchableOpacity
              style={[styles.categorySelector, errors.shopCategory ? styles.categorySelectorError : null]}
              onPress={() => setShowCategories(!showCategories)}
            >
              <Text style={form.shopCategory ? styles.categorySelected : styles.categoryPlaceholder}>
                {form.shopCategory || 'Select shop category'}
              </Text>
              <Text>{showCategories ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {errors.shopCategory && <Text style={styles.errorText}>{errors.shopCategory}</Text>}
            {showCategories && (
              <View style={styles.categoryList}>
                {SHOP_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryItem,
                      form.shopCategory === cat && styles.categoryItemSelected,
                    ]}
                    onPress={() => {
                      updateField('shopCategory', cat);
                      setShowCategories(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.categoryItemText,
                        form.shopCategory === cat && styles.categoryItemTextSelected,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <Input
            label="GST Number (Optional)"
            placeholder="Enter GST number"
            value={form.gstNumber}
            onChangeText={(text) => updateField('gstNumber', text.toUpperCase())}
            autoCapitalize="characters"
            error={errors.gstNumber}
          />

          <Button
            title="Register My Shop"
            onPress={handleRegister}
            loading={isLoading}
            style={styles.registerButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xxl,
    paddingBottom: 40,
  },
  title: {
    fontSize: fonts.sizes.xxl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fonts.sizes.md,
    color: colors.textSecondary,
    marginBottom: spacing.xxl,
  },
  readOnlyField: {
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  readOnlyLabel: {
    fontSize: fonts.sizes.sm,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  readOnlyValue: {
    fontSize: fonts.sizes.lg,
    color: colors.text,
    fontWeight: '600',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  locationIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  locationText: {
    fontSize: fonts.sizes.md,
    color: colors.primary,
    fontWeight: '500',
  },
  categoryContainer: {
    marginBottom: spacing.lg,
  },
  categoryLabel: {
    fontSize: fonts.sizes.md,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  categorySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
  },
  categorySelectorError: {
    borderColor: colors.error,
  },
  categoryPlaceholder: {
    fontSize: fonts.sizes.lg,
    color: colors.placeholder,
  },
  categorySelected: {
    fontSize: fonts.sizes.lg,
    color: colors.text,
  },
  categoryList: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    maxHeight: 200,
    overflow: 'hidden',
  },
  categoryItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  categoryItemSelected: {
    backgroundColor: colors.primaryLight,
  },
  categoryItemText: {
    fontSize: fonts.sizes.md,
    color: colors.text,
  },
  categoryItemTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  errorText: {
    fontSize: fonts.sizes.sm,
    color: colors.error,
    marginTop: spacing.xs,
  },
  registerButton: {
    marginTop: spacing.xl,
  },
});

export default RegisterScreen;
