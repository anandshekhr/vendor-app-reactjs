import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { updateVendorProfile } from '../../store/slices/authSlice';
import { Button, Input, Card } from '../../components';
import { colors, fonts, spacing } from '../../utils/theme';
import { SHOP_CATEGORIES } from '../../utils/constants';

const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { vendor, isLoading } = useAppSelector((state) => state.auth);

  const [form, setForm] = useState({
    shopName: '',
    ownerName: '',
    email: '',
    address: '',
    shopCategory: '',
    gstNumber: '',
  });

  useEffect(() => {
    if (vendor) {
      setForm({
        shopName: vendor.shopName || '',
        ownerName: vendor.ownerName || '',
        email: vendor.email || '',
        address: vendor.address || '',
        shopCategory: vendor.shopCategory || '',
        gstNumber: vendor.gstNumber || '',
      });
    }
  }, [vendor]);

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.shopName.trim() || !form.ownerName.trim()) {
      Alert.alert('Error', 'Shop name and owner name are required');
      return;
    }
    try {
      await dispatch(updateVendorProfile(form)).unwrap();
      Alert.alert('Success', 'Profile updated', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err || 'Failed to update profile');
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <Card title="Shop Information">
          <Input label="Shop Name *" value={form.shopName} onChangeText={(t) => updateField('shopName', t)} />
          <Input label="Shop Category" value={form.shopCategory} onChangeText={(t) => updateField('shopCategory', t)} />
          <Input label="Address" value={form.address} onChangeText={(t) => updateField('address', t)} multiline numberOfLines={3} />
          <Input label="GST Number" value={form.gstNumber} onChangeText={(t) => updateField('gstNumber', t.toUpperCase())} autoCapitalize="characters" />
        </Card>

        <Card title="Owner Information">
          <Input label="Owner Name *" value={form.ownerName} onChangeText={(t) => updateField('ownerName', t)} />
          <Input label="Email" value={form.email} onChangeText={(t) => updateField('email', t)} keyboardType="email-address" autoCapitalize="none" />
        </Card>

        <Button title="Save Changes" onPress={handleSave} loading={isLoading} style={styles.saveBtn} />
        <View style={{ height: 30 }} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  saveBtn: { marginTop: spacing.lg },
});

export default EditProfileScreen;
