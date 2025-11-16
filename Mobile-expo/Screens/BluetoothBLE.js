import React, { useState, useEffect } from 'react';
import { View, Text, Button, FlatList, TouchableOpacity, Alert } from 'react-native';
import { BleManager } from 'react-native-ble-plx';

export default function BluetoothBLE(){
  const [manager] = useState(new BleManager());
  const [devices, setDevices] = useState([]);
  const [scanning, setScanning] = useState(false);

  useEffect(()=> {
    return ()=> manager.destroy();
  }, [manager]);

  const startScan = async () => {
    setDevices([]); setScanning(true);
    try {
      manager.startDeviceScan(null, null, (error, device) => {
        if(error){ Alert.alert('Scan error', error.message); setScanning(false); return; }
        if(device && device.id){
          setDevices(prev => prev.find(d => d.id === device.id) ? prev : [...prev, device]);
        }
      });
      setTimeout(()=> { manager.stopDeviceScan(); setScanning(false); }, 8000);
    } catch(e){
      Alert.alert('BLE error', e.message); setScanning(false);
    }
  };

  const connectToDevice = async (device) => {
    try {
      const connected = await manager.connectToDevice(device.id);
      await connected.discoverAllServicesAndCharacteristics();
      Alert.alert('Connected', `Connected to ${device.name || device.id}`);
    } catch(e){
      Alert.alert('Connection error', e.message);
    }
  };

  return (
    <View style={{ padding:20, marginTop:30 }}>
      <Text style={{ fontSize:18, marginBottom:10 }}>Bluetooth (BLE) Devices</Text>
      <Button title={scanning ? 'Scanning...' : 'Scan for Devices'} onPress={startScan} disabled={scanning} />
      <View style={{ height:12 }} />
      <FlatList data={devices} keyExtractor={item => item.id} renderItem={({ item }) => (
        <TouchableOpacity onPress={() => connectToDevice(item)} style={{ padding:12, borderBottomWidth:1 }}>
          <Text>{item.name || 'Unknown'} - {item.id}</Text>
          <Text>RSSI: {item.rssi}</Text>
        </TouchableOpacity>
      )} ListEmptyComponent={<Text>No devices found yet.</Text>} />
      <View style={{ marginTop:20 }}>
        <Text style={{ fontWeight:'bold' }}>Note:</Text>
        <Text>react-native-ble-plx requires native modules. Use Expo prebuild / dev client or eject to bare workflow to use BLE.</Text>
      </View>
    </View>
  );
}
