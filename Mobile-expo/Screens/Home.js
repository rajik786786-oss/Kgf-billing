import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Button, TextInput, Alert } from 'react-native';

export default function Home({ navigation }) {
  const [hidBuffer, setHidBuffer] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(()=> { if (inputRef.current && inputRef.current.focus) inputRef.current.focus(); }, 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={{ padding:20, marginTop:30 }}>
      <Text style={{ fontSize:20, marginBottom:12 }}>KGF MEN'S WEAR - Mobile</Text>

      <Button title="Open Barcode Scanner" onPress={() => navigation.navigate('BarcodeScanner')} />
      <View style={{ height:12 }} />

      <Button title="Bluetooth Pairing (BLE) - Stub" onPress={() => navigation.navigate('Bluetooth')} />
      <View style={{ height:12 }} />

      <Text style={{ marginTop: 8 }}>HID Scanner mode (hidden input). Pair an HID scanner and scan to send barcode.</Text>
      <TextInput
        ref={inputRef}
        value={hidBuffer}
        onChangeText={(t) => {
          if (t.includes('\n')) {
            const cleaned = t.replace(/\n/g, '');
            setHidBuffer('');
            Alert.alert('HID scanner input', `Scanned: ${cleaned}`);
          } else setHidBuffer(t);
        }}
        onSubmitEditing={() => {
          if (hidBuffer.trim()) { Alert.alert('HID submit', hidBuffer.trim()); setHidBuffer(''); }
        }}
        style={{ height: 0, width: 0, opacity: 0 }}
        autoFocus={true}
      />
    </View>
  );
}