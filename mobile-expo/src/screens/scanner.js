import React, { useState, useEffect } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Scanner({ navigation }) {
  const [hasPermission, setHasPermission] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = async ({ data }) => {
    // Lookup in inventory by barcode
    try {
      const invJson = await AsyncStorage.getItem('@inventory');
      const inv = invJson ? JSON.parse(invJson) : [];
      const found = inv.find(i => i.barcode && String(i.barcode) === String(data));
      if (found) {
        Alert.alert('Product found', `${found.name} — ₹${found.price}`);
      } else {
        Alert.alert('Not found', `No product with barcode: ${data}`);
      }
    } catch (e) {
      console.warn(e);
      Alert.alert('Error', 'Failed to read inventory');
    }
  };

  if (hasPermission === null) return <Text style={{ padding: 16 }}>Requesting camera permission...</Text>;
  if (hasPermission === false) return <Text style={{ padding: 16 }}>No camera permission. Enable camera in settings.</Text>;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <BarCodeScanner onBarCodeScanned={handleBarCodeScanned} style={{ flex: 1 }} />
      </View>
      <View style={{ padding: 12 }}>
        <Button title="Back" onPress={() => navigation.goBack()} />
      </View>
    </View>
  );
}