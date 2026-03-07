import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { requestWithdrawal, fetchBankAccounts, fetchWallet } from '../../store/slices/walletSlice';
import { Button, Input, Card } from '../../components';
import { colors, fonts, spacing, borderRadius, shadows } from '../../utils/theme';
import { formatCurrency } from '../../utils/helpers';
import { BankAccount } from '../../models/types';

const WithdrawScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { wallet, bankAccounts, isLoading } = useAppSelector((state) => state.wallet);
  const [amount, setAmount] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchWallet());
    dispatch(fetchBankAccounts());
  }, [dispatch]);

  useEffect(() => {
    const primary = bankAccounts.find((a) => a.isPrimary);
    if (primary) setSelectedAccount(primary.id);
  }, [bankAccounts]);

  const handleWithdraw = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      Alert.alert('Invalid', 'Enter a valid withdrawal amount');
      return;
    }
    if (numAmount > (wallet?.balance || 0)) {
      Alert.alert('Insufficient Balance', 'Withdrawal amount exceeds available balance');
      return;
    }
    if (!selectedAccount) {
      Alert.alert('Select Account', 'Please select a bank account');
      return;
    }

    try {
      await dispatch(requestWithdrawal({ amount: numAmount, bankAccountId: selectedAccount })).unwrap();
      Alert.alert('Success', 'Withdrawal request submitted. Funds will be transferred within 24-48 hours.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err || 'Failed to process withdrawal');
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <View style={styles.balanceHeader}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>{formatCurrency(wallet?.balance || 0)}</Text>
        </View>

        <Card title="Withdrawal Amount">
          <View style={styles.amountInputContainer}>
            <Text style={styles.rupeeSymbol}>₹</Text>
            <Input
              placeholder="0"
              value={amount}
              onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
              style={styles.amountInput}
            />
          </View>
          <View style={styles.quickAmounts}>
            {[500, 1000, 2000, 5000].map((qa) => (
              <TouchableOpacity
                key={qa}
                style={styles.quickBtn}
                onPress={() => setAmount(String(qa))}
              >
                <Text style={styles.quickBtnText}>{formatCurrency(qa)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <Card title="Withdraw To">
          {bankAccounts.length === 0 ? (
            <View style={styles.noAccount}>
              <Text style={styles.noAccountText}>No bank accounts added</Text>
              <Button
                title="Add Bank Account"
                variant="outline"
                onPress={() => navigation.navigate('AddBankAccount')}
              />
            </View>
          ) : (
            bankAccounts.map((account: BankAccount) => (
              <TouchableOpacity
                key={account.id}
                style={[
                  styles.accountCard,
                  selectedAccount === account.id && styles.accountCardSelected,
                ]}
                onPress={() => setSelectedAccount(account.id)}
              >
                <View style={styles.bankIcon}>
                  <Text style={styles.bankEmoji}>🏦</Text>
                </View>
                <View style={styles.accountInfo}>
                  <Text style={styles.bankName}>{account.bankName}</Text>
                  <Text style={styles.accountNumber}>
                    ●●●● {account.accountNumber.slice(-4)}
                  </Text>
                  <Text style={styles.holderName}>{account.accountHolderName}</Text>
                </View>
                <View style={[styles.radio, selectedAccount === account.id && styles.radioSelected]}>
                  {selectedAccount === account.id && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            ))
          )}
        </Card>

        <Button
          title="Request Withdrawal"
          onPress={handleWithdraw}
          loading={isLoading}
          disabled={!amount || !selectedAccount}
          style={styles.withdrawButton}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  balanceHeader: { alignItems: 'center', paddingVertical: spacing.xl, marginBottom: spacing.md },
  balanceLabel: { fontSize: fonts.sizes.md, color: colors.textSecondary },
  balanceAmount: { fontSize: 32, fontWeight: '700', color: colors.success, marginTop: 4 },
  amountInputContainer: { flexDirection: 'row', alignItems: 'center' },
  rupeeSymbol: { fontSize: 28, fontWeight: '700', color: colors.text, marginRight: spacing.sm },
  amountInput: { flex: 1, fontSize: 28, fontWeight: '700' },
  quickAmounts: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  quickBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickBtnText: { fontSize: fonts.sizes.sm, color: colors.primary, fontWeight: '500' },
  noAccount: { alignItems: 'center', paddingVertical: spacing.lg },
  noAccountText: { fontSize: fonts.sizes.md, color: colors.textSecondary, marginBottom: spacing.md },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  accountCardSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  bankIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  bankEmoji: { fontSize: 20 },
  accountInfo: { flex: 1, marginLeft: spacing.md },
  bankName: { fontSize: fonts.sizes.md, fontWeight: '600', color: colors.text },
  accountNumber: { fontSize: fonts.sizes.sm, color: colors.textSecondary, marginTop: 2 },
  holderName: { fontSize: fonts.sizes.xs, color: colors.textLight, marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: colors.primary },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
  withdrawButton: { marginTop: spacing.xl },
});

export default WithdrawScreen;
