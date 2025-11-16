// Mobile-expo/Screens/BluetoothBLE.js
import React from 'react';
import { View, Text, Button } from 'react-native';

export default function BluetoothBLE({ navigation }) {
  return (
    <View style={{ flex:1, padding:20, justifyContent:'center', alignItems:'center' }}>
      <Text style={{ fontSize:16, marginBottom:12, textAlign:'center' }}>
        Bluetooth functionality (BLE) is disabled in this build.
      </Text>

      <Text style={{ marginBottom:12, textAlign:'center' }}>
        To enable real BLE you must:
        {"\n"}• Add the native library (react-native-ble-plx)
        {"\n"}• Build a custom dev client or prebuild with EAS
      </Text>

      <Button title="Back" onPress={() => navigation.goBack()} />
    </View>
  );
}