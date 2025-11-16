// Mobile-expo/Screens/BarcodeScanner.js
import React, { useState, useEffect } from 'react';
import { View, Text, Button, Alert, ActivityIndicator } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';

export default function BarcodeScannerScreen({ navigation, route }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [requesting, setRequesting] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setRequesting(true);
        const requestFn =
          BarCodeScanner.requestCameraPermissionsAsync?.bind(BarCodeScanner) ||
          BarCodeScanner.requestPermissionsAsync?.bind(BarCodeScanner);

        if (!requestFn) {
          if (mounted) setHasPermission(false);
          return;
        }
        const result = await requestFn();
        const status = result.status ?? (result.granted ? 'granted' : 'denied');
        if (mounted) setHasPermission(status === 'granted');
      } catch (err) {
        console.error('Permission request failed', err);
        if (mounted) setHasPermission(false);
      } finally {
        if (mounted) setRequesting(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleBarCodeScanned = ({ data }) => {
    setScanned(true);
    setScannedData(String(data));
    const addToCart = route?.params?.addToCart;
    if (typeof addToCart === 'function') {
      try {
        addToCart(data);
        Alert.alert('Added', `Barcode ${data} added to cart`);
      } catch {
        Alert.alert('Scanned', `Barcode: ${data}`);
      }
    } else {
      Alert.alert('Scanned', `Barcode: ${data}`);
    }
  };

  if (requesting) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12 }}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ textAlign: 'center', marginBottom: 12 }}>
          Camera permission not granted. Please enable camera permissions in your device settings.
        </Text>
        <Button title="Try again" onPress={() => {
          // trigger a simple refresh by toggling requesting
          setRequesting(true);
          setHasPermission(null);
          setTimeout(() => setRequesting(false), 300);
        }} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
          style={{ flex: 1 }}
        />
      </View>

      <View style={{ padding: 12 }}>
        {scanned ? (
          <>
            <Text style={{ marginBottom: 8 }}>Scanned: {scannedData}</Text>
            <Button title="Tap to scan again" onPress={() => { setScanned(false); setScannedData(null); }} />
          </>
        ) : (
          <Text>Ready to scan. Point camera at barcode.</Text>
        )}
      </View>
    </View>
  );
}