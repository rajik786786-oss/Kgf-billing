import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Home from '../screens/Home';
import Scanner from '../screens/Scanner';
import Customers from '../screens/Customers';
import Inventory from '../screens/Inventory';
import History from '../screens/History';

const Stack = createNativeStackNavigator();

export default function AppNavigator(){
  return (
    <Stack.Navigator initialRouteName="Home">
      <Stack.Screen name="Home" component={Home} options={{ title: "KGF Billing" }} />
      <Stack.Screen name="Scanner" component={Scanner} options={{ title: "Scan Barcode" }} />
      <Stack.Screen name="Customers" component={Customers} options={{ title: "Customers" }} />
      <Stack.Screen name="Inventory" component={Inventory} options={{ title: "Inventory" }} />
      <Stack.Screen name="History" component={History} options={{ title: "Billing History" }} />
    </Stack.Navigator>
  );
}