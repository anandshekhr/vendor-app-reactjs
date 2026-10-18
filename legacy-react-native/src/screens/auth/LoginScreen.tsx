import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { sendOTP, clearError } from '../../store/slices/authSlice';
import { FirebaseAuthService } from '../../services';
import { Button, Input } from '../../components';
import { colors, fonts, spacing } from '../../utils/theme';
import { validateMobileNumber } from '../../utils/helpers';
import { AuthStackParamList } from '../../models/types';

type LoginNavProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<LoginNavProp>();
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.auth);
  const [mobile, setMobile] = useState('');
  const [mobileError, setMobileError] = useState('');

  const handleSendOTP = async () => {
    setMobileError('');
    dispatch(clearError());

    if (!mobile.trim()) {
      setMobileError('Mobile number is required');
      return;
    }
    if (!validateMobileNumber(mobile.trim())) {
      setMobileError('Enter a valid 10-digit mobile number');
      return;
    }

    try {
      await FirebaseAuthService.sendOTP(mobile.trim());
      await dispatch(sendOTP({ mobile: mobile.trim() })).unwrap();
      navigation.navigate('OTPVerification', { mobile: mobile.trim() });
    } catch (err: any) {
      setMobileError(err.message || 'Failed to send OTP');
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
        >
          <View style={styles.logoContainer}>
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoText}>🏪</Text>
            </View>
            <Text style={styles.appName}>TheNearbyShop</Text>
            <Text style={styles.appSubtitle}>Vendor Partner</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.welcomeText}>Welcome!</Text>
            <Text style={styles.descriptionText}>
              Login with your mobile number to manage your shop
            </Text>

            <View style={styles.phoneInputContainer}>
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
              </View>
              <View style={styles.phoneInput}>
                <Input
                  placeholder="Enter mobile number"
                  value={mobile}
                  onChangeText={(text) => {
                    setMobile(text.replace(/[^0-9]/g, ''));
                    setMobileError('');
                  }}
                  keyboardType="phone-pad"
                  maxLength={10}
                  error={mobileError}
                  containerStyle={styles.inputContainer}
                />
              </View>
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <Button
              title="Send OTP"
              onPress={handleSendOTP}
              loading={isLoading}
              style={styles.button}
            />

            <Text style={styles.termsText}>
              By continuing, you agree to our{' '}
              <Text style={styles.linkText}>Terms of Service</Text> and{' '}
              <Text style={styles.linkText}>Privacy Policy</Text>
            </Text>
          </View>
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
    flexGrow: 1,
    paddingHorizontal: spacing.xxl,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoText: {
    fontSize: 40,
  },
  appName: {
    fontSize: fonts.sizes.heading,
    fontWeight: '700',
    color: colors.primary,
  },
  appSubtitle: {
    fontSize: fonts.sizes.lg,
    color: colors.textSecondary,
    marginTop: 4,
  },
  formContainer: {
    flex: 1,
  },
  welcomeText: {
    fontSize: fonts.sizes.xxl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  descriptionText: {
    fontSize: fonts.sizes.md,
    color: colors.textSecondary,
    marginBottom: spacing.xxl,
    lineHeight: 20,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  countryCode: {
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.background,
    marginTop: 0,
  },
  countryCodeText: {
    fontSize: fonts.sizes.lg,
    color: colors.text,
  },
  phoneInput: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 0,
  },
  errorText: {
    color: colors.error,
    fontSize: fonts.sizes.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  button: {
    marginTop: spacing.xxl,
  },
  termsText: {
    fontSize: fonts.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xxl,
    lineHeight: 18,
  },
  linkText: {
    color: colors.primary,
    fontWeight: '500',
  },
});

export default LoginScreen;
