import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

export default function Customers() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [list, setList] = useState([]);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem('@customers');
      setList(raw ? JSON.parse(raw) : []);
    })();
  }, []);

  const persist = async (newList) => {
    setList(newList);
    await AsyncStorage.setItem('@customers', JSON.stringify(newList));
  };

  const add = async () => {
    if (!name.trim() || !phone.trim()) return Alert.alert('Validation', 'Please enter name and phone');
    const item = { id: uuidv4(), name: name.trim(), phone: phone.trim() };
    await persist([item, ...list]);
    setName(''); setPhone('');
    Alert.alert('Saved', 'Customer added');
  };

  const remove = async (id) => {
    const next = list.filter(i => i.id !== id);
    await persist(next);
  };

  return (
    <View style={{ flex: 1, padding: 12 }}>
      <Text style={{ fontWeight: '700', marginBottom: 8 }}>Add Customer</Text>
      <TextInput placeholder="Name" value={name} onChangeText={setName} style={{ borderWidth: 1, padding: 8, marginBottom: 8 }} />
      <TextInput placeholder="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={{ borderWidth: 1, padding: 8, marginBottom: 8 }} />
      <Button title="Add Customer" onPress={add} />

      <Text style={{ fontWeight: '700', marginTop: 16, marginBottom: 8 }}>Saved Customers</Text>
      <FlatList
        data={list}
        keyExtractor={i => i.id}
        ListEmptyComponent={<Text>No customers yet</Text>}
        renderItem={({ item }) => (
          <View style={{ padding: 8, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontWeight: '600' }}>{item.name}</Text>
              <Text>{item.phone}</Text>
            </View>
            <Button title="Delete" color="#d00" onPress={() => remove(item.id)} />
          </View>
        )}
      />
    </View>
  );
}