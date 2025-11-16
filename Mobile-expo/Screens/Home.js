// Mobile-expo/Screens/Home.js
import React, { useRef, useEffect, useState } from 'react';
import { View, Text, Button, TextInput, Alert } from 'react-native';

export default function Home({ navigation }) {
  const [hidBuffer, setHidBuffer] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        if (inputRef.current && inputRef.current.focus) inputRef.current.focus();
      } catch (e) {
        // ignore
      }
    }, 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={{ padding: 20, marginTop: 30 }}>
      <Text style={{ fontSize: 20, marginBottom: 12 }}>KGF MEN'S WEAR - Mobile</Text>

      <Button title="Open Barcode Scanner" onPress={() => navigation.navigate('BarcodeScanner')} />
      <View style={{ height: 12 }} />

      <Button title="Bluetooth Pairing (BLE)" onPress={() => navigation.navigate('Bluetooth')} />
      <View style={{ height: 12 }} />

      <Text>HID Scanner mode (hidden input). Pair an HID scanner and scan to send barcode.</Text>

      <TextInput
        ref={inputRef}
        value={hidBuffer}
        onChangeText={(t) => {
          // many USB HID scanners append newline; treat newline as submit
          if (t.includes('\n')) {
            const cleaned = t.replace(/\n/g, '').trim();
            setHidBuffer('');
            if (cleaned) Alert.alert('HID scanner input', `Scanned: ${cleaned}`);
          } else {
            setHidBuffer(t);
          }
        }}
        onSubmitEditing={() => {
          if (hidBuffer.trim()) {
            Alert.alert('HID submit', hidBuffer.trim());
            setHidBuffer('');
          }
        }}
        style={{ height: 0, width: 0, opacity: 0 }}
        autoFocus={true}
      />
    </View>
  );
}