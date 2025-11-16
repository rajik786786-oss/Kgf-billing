import React from 'react';
import { View, Text, Button, Linking } from 'react-native';

export default function BluetoothStub() {
  return (
    <View style={{ padding:20, marginTop:30 }}>
      <Text style={{ fontSize:18, marginBottom:12 }}>Bluetooth (BLE) — Not supported in Expo Managed</Text>

      <Text style={{ marginBottom:10 }}>
        BLE native modules like react-native-ble-plx do NOT work in Expo managed builds (APK).
      </Text>

      <Text style={{ marginBottom:10 }}>
        You must eject or use a custom dev client to enable BLE features.
        For now, this screen is only a placeholder so your app can build.
      </Text>

      <Text style={{ marginTop:10 }}>HID barcode scanners continue to work normally on the Home screen.</Text>

      <View style={{ height:15 }} />

      <Button
        title="Learn how to enable BLE"
        onPress={() => Linking.openURL('https://docs.expo.dev/clients/introduction/')}
      />
    </View>
  );
}