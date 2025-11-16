import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Home from './src/screens/Home';
import Scanner from './src/screens/Scanner';
import Customers from './src/screens/Customers';
import Inventory from './src/screens/Inventory';
import History from './src/screens/History';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={Home} options={{ title: 'Billing' }} />
        <Stack.Screen name="Scanner" component={Scanner} options={{ title: 'Scan Barcode' }} />
        <Stack.Screen name="Customers" component={Customers} />
        <Stack.Screen name="Inventory" component={Inventory} />
        <Stack.Screen name="History" component={History} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}