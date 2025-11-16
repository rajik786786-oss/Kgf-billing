import React, { useState, useEffect } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';

export default function BarcodeScanner({ navigation, route }){
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [scannedData, setScannedData] = useState(null);

  useEffect(()=> {
    (async ()=> {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(true);
    setScannedData(data);
    // If parent provided addToCart callback, call it
    if(route?.params?.addToCart){
      route.params.addToCart(data);
      Alert.alert('Added', `Barcode ${data} added to cart`);
    } else {
      Alert.alert('Scanned', `Barcode: ${data}`);
    }
  };

  if(hasPermission === null) return <Text>Requesting camera permission...</Text>;
  if(hasPermission === false) return <Text>No camera permission</Text>;

  return (
    <View style={{ flex:1 }}>
      <View style={{ flex:1 }}>
        <BarCodeScanner onBarCodeScanned={scanned ? undefined : handleBarCodeScanned} style={{ flex:1 }} />
      </View>
      <View style={{ padding:10 }}>
        {scanned && <Button title="Tap to Scan Again" onPress={()=> { setScanned(false); setScannedData(null); }} />}
        <Text>Scanned: {scannedData || 'None'}</Text>
      </View>
    </View>
  );
                  }
