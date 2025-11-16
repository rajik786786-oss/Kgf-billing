import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Home from './Screens/Home';
import BarcodeScanner from './Screens/BarcodeScanner';
import BluetoothStub from './Screens/BluetoothStub';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={Home} options={{ title: "KGF MEN'S WEAR" }} />
        <Stack.Screen name="BarcodeScanner" component={BarcodeScanner} options={{ title: 'Scan Barcode' }} />
        <Stack.Screen name="Bluetooth" component={BluetoothStub} options={{ title: 'Bluetooth (stub)' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}