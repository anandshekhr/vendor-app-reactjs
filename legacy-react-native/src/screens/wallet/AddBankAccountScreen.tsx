import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { addBankAccount } from '../../store/slices/walletSlice';
import { Button, Input, Card } from '../../components';
import { colors, fonts, spacing } from '../../utils/theme';
import { validateIFSC, validateAccountNumber } from '../../utils/helpers';

const AddBankAccountScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((state) => state.wallet);

  const [form, setForm] = useState({
    bankName: '',
    accountHolderName: '',
    accountNumber: '',
    confirmAccountNumber: '',
    ifscCode: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.bankName.trim()) newErrors.bankName = 'Bank name is required';
    if (!form.accountHolderName.trim()) newErrors.accountHolderName = 'Account holder name is required';
    if (!form.accountNumber.trim()) newErrors.accountNumber = 'Account number is required';
    else if (!validateAccountNumber(form.accountNumber)) newErrors.accountNumber = 'Invalid account number';
    if (form.accountNumber !== form.confirmAccountNumber) newErrors.confirmAccountNumber = 'Account numbers do not match';
    if (!form.ifscCode.trim()) newErrors.ifscCode = 'IFSC code is required';
    else if (!validateIFSC(form.ifscCode)) newErrors.ifscCode = 'Invalid IFSC code (e.g., SBIN0001234)';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      await dispatch(addBankAccount({
        bankName: form.bankName,
        accountHolderName: form.accountHolderName,
        accountNumber: form.accountNumber,
        ifscCode: form.ifscCode.toUpperCase(),
      })).unwrap();
      Alert.alert('Success', 'Bank account added successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err || 'Failed to add bank account');
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <Card title="Bank Account Details">
          <Input
            label="Bank Name *"
            placeholder="e.g., State Bank of India"
            value={form.bankName}
            onChangeText={(t) => updateField('bankName', t)}
            error={errors.bankName}
          />
          <Input
            label="Account Holder Name *"
            placeholder="As per bank records"
            value={form.accountHolderName}
            onChangeText={(t) => updateField('accountHolderName', t)}
            error={errors.accountHolderName}
          />
          <Input
            label="Account Number *"
            placeholder="Enter account number"
            value={form.accountNumber}
            onChangeText={(t) => updateField('accountNumber', t.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            error={errors.accountNumber}
          />
          <Input
            label="Confirm Account Number *"
            placeholder="Re-enter account number"
            value={form.confirmAccountNumber}
            onChangeText={(t) => updateField('confirmAccountNumber', t.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            error={errors.confirmAccountNumber}
          />
          <Input
            label="IFSC Code *"
            placeholder="e.g., SBIN0001234"
            value={form.ifscCode}
            onChangeText={(t) => updateField('ifscCode', t.toUpperCase())}
            autoCapitalize="characters"
            maxLength={11}
            error={errors.ifscCode}
          />
        </Card>

        <View style={styles.note}>
          <Text style={styles.noteIcon}>ℹ️</Text>
          <Text style={styles.noteText}>
            Your bank details are securely stored and used only for fund transfers.
            Withdrawals are typically processed within 24-48 hours.
          </Text>
        </View>

        <Button
          title="Add Bank Account"
          onPress={handleSubmit}
          loading={isLoading}
          style={styles.submitButton}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  note: { flexDirection: 'row', padding: spacing.md, backgroundColor: colors.infoLight, borderRadius: 8, marginTop: spacing.md },
  noteIcon: { fontSize: 16, marginRight: spacing.sm },
  noteText: { flex: 1, fontSize: fonts.sizes.sm, color: colors.info, lineHeight: 18 },
  submitButton: { marginTop: spacing.xl },
});

export default AddBankAccountScreen;
