import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch } from '../../store/hooks';
import { getMasterProductByBarcode } from '../../store/slices/productSlice';
import { Button } from '../../components';
import { colors, fonts, spacing } from '../../utils/theme';

const BarcodeScannerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const [scanned, setScanned] = useState(false);

  const handleBarCodeScanned = async (data: string) => {
    if (scanned) return;
    setScanned(true);

    try {
      const result = await dispatch(getMasterProductByBarcode(data)).unwrap();
      if (result) {
        Alert.alert('Product Found', `${result.name}\n\nWould you like to add this product?`, [
          { text: 'Cancel', onPress: () => setScanned(false) },
          {
            text: 'Add Product',
            onPress: () => {
              navigation.navigate('AddProduct', {
                masterProduct: result,
                barcode: data,
              });
            },
          },
        ]);
      } else {
        Alert.alert('Not Found', 'No product found for this barcode. Add manually?', [
          { text: 'Cancel', onPress: () => setScanned(false) },
          {
            text: 'Add Manually',
            onPress: () => navigation.navigate('AddProduct', { barcode: data }),
          },
        ]);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to look up barcode');
      setScanned(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.cameraContainer}>
        {/* Camera view placeholder - actual implementation uses react-native-vision-camera */}
        <View style={styles.cameraPlaceholder}>
          <Text style={styles.cameraIcon}>📷</Text>
          <Text style={styles.cameraText}>Camera Preview</Text>
          <Text style={styles.cameraHint}>
            Point camera at product barcode{'\n'}Supports EAN/UPC codes
          </Text>
        </View>

        <View style={styles.overlay}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
        </View>
      </View>

      <View style={styles.bottomPanel}>
        <Text style={styles.instruction}>
          Align the barcode within the frame to scan
        </Text>

        {/* Manual entry for testing */}
        <Button
          title="Enter Barcode Manually"
          variant="outline"
          onPress={() => {
            Alert.prompt?.(
              'Enter Barcode',
              'Type the barcode number',
              (text) => {
                if (text) handleBarCodeScanned(text);
              }
            );
          }}
          style={styles.manualButton}
        />

        {scanned && (
          <Button
            title="Scan Again"
            onPress={() => setScanned(false)}
            style={styles.rescanButton}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  cameraContainer: { flex: 1, position: 'relative' },
  cameraPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
  },
  cameraIcon: { fontSize: 64, marginBottom: spacing.md },
  cameraText: { fontSize: fonts.sizes.xl, color: colors.white, fontWeight: '600' },
  cameraHint: {
    fontSize: fonts.sizes.md,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 250,
    height: 150,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: colors.primary,
  },
  topLeft: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  topRight: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  bottomPanel: {
    padding: spacing.xxl,
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  instruction: {
    fontSize: fonts.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  manualButton: { marginTop: spacing.sm },
  rescanButton: { marginTop: spacing.md },
});

export default BarcodeScannerScreen;
