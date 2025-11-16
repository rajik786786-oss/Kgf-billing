import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Home from './screens/Home';
import BarcodeScanner from './screens/BarcodeScanner';
import BluetoothBLE from './screens/BluetoothBLE';

const Stack = createNativeStackNavigator();

export default function App(){
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={Home} options={{ title: "KGF MEN'S WEAR" }} />
        <Stack.Screen name="BarcodeScanner" component={BarcodeScanner} options={{ title: "Scan Barcode" }} />
        <Stack.Screen name="Bluetooth" component={BluetoothBLE} options={{ title: "Bluetooth Pairing" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
