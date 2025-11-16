import React, { useState, useEffect } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';

export default function Scanner({ navigation, route }) {
  const [hasPerm, setHasPerm] = useState(null);
  const [scanned, setScanned] = useState(false);
  useEffect(()=> {
    (async ()=> {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPerm(status === 'granted');
    })();
  }, []);
  if(hasPerm === null) return <Text>Requesting camera permission...</Text>;
  if(!hasPerm) return <Text>No camera permission</Text>;

  const onBarCodeScanned = ({ data }) => {
    setScanned(true);
    if(route?.params?.addToRow) {
      route.params.addToRow(data);
      Alert.alert('Scanned', data, [{ text:'OK', onPress: ()=> navigation.goBack() }]);
    } else {
      Alert.alert('Scanned', data);
    }
  };

  return (
    <View style={{ flex:1 }}>
      <View style={{ flex:1 }}>
        <BarCodeScanner onBarCodeScanned={scanned ? undefined : onBarCodeScanned} style={{ flex:1 }} />
      </View>
      <View style={{ padding:8 }}>
        {scanned && <Button title="Scan again" onPress={()=> setScanned(false)} />}
        <Button title="Close" onPress={()=> navigation.goBack()} />
      </View>
    </View>
  );
}