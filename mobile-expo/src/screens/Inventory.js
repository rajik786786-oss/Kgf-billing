import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

export default function Inventory() {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [barcode, setBarcode] = useState('');
  const [list, setList] = useState([]);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem('@inventory');
      setList(raw ? JSON.parse(raw) : []);
    })();
  }, []);

  const persist = async (next) => {
    setList(next);
    await AsyncStorage.setItem('@inventory', JSON.stringify(next));
  };

  const add = async () => {
    if (!name.trim() || !price) return Alert.alert('Validation', 'Enter name and price');
    const item = { id: uuidv4(), name: name.trim(), price: parseFloat(price) || 0, barcode: barcode.trim() || null, qty: 0 };
    await persist([item, ...list]);
    setName(''); setPrice(''); setBarcode('');
    Alert.alert('Saved', 'Inventory item added');
  };

  const remove = async (id) => {
    const next = list.filter(i => i.id !== id);
    await persist(next);
  };

  return (
    <View style={{ flex: 1, padding: 12 }}>
      <Text style={{ fontWeight: '700', marginBottom: 8 }}>Add Inventory Item</Text>
      <TextInput placeholder="Product name" value={name} onChangeText={setName} style={{ borderWidth: 1, padding: 8, marginBottom: 8 }} />
      <TextInput placeholder="Price" value={price} onChangeText={setPrice} keyboardType="numeric" style={{ borderWidth: 1, padding: 8, marginBottom: 8 }} />
      <TextInput placeholder="Barcode (optional)" value={barcode} onChangeText={setBarcode} style={{ borderWidth: 1, padding: 8, marginBottom: 8 }} />
      <Button title="Add to inventory" onPress={add} />

      <Text style={{ fontWeight: '700', marginTop: 16, marginBottom: 8 }}>Inventory List</Text>
      <FlatList
        data={list}
        keyExtractor={i => i.id}
        ListEmptyComponent={<Text>No items yet</Text>}
        renderItem={({ item }) => (
          <View style={{ padding: 8, borderBottomWidth: 1 }}>
            <Text style={{ fontWeight: '600' }}>{item.name}</Text>
            <Text>₹{(item.price || 0).toFixed(2)} {item.barcode ? ` — ${item.barcode}` : ''}</Text>
            <View style={{ marginTop: 6 }}>
              <Button title="Delete" color="#d00" onPress={() => remove(item.id)} />
            </View>
          </View>
        )}
      />
    </View>
  );
}