import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { v4 as uuidv4 } from 'uuid';

export default function Home({ navigation }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [discount, setDiscount] = useState('0');
  const [cart, setCart] = useState([]);
  const isFocused = useIsFocused();

  useEffect(() => {
    (async () => {
      const h = await AsyncStorage.getItem('@history');
      if (!h) await AsyncStorage.setItem('@history', JSON.stringify([]));
    })();
  }, [isFocused]);

  const addProduct = () => {
    if (!name || !price) return Alert.alert('Enter product name and price');
    const p = { id: uuidv4(), name, price: parseFloat(price), qty: 1 };
    setCart(prev => [...prev, p]);
    setName('');
    setPrice('');
  };

  const remove = (id) => setCart(prev => prev.filter(i => i.id !== id));
  const changeQty = (id, qty) =>
    setCart(prev => prev.map(i => (i.id === id ? { ...i, qty } : i)));

  const subtotal = cart.reduce((s, p) => s + p.price * p.qty, 0);
  const disc = parseFloat(discount) || 0;
  const total = subtotal * (1 - disc / 100);

  const checkout = async () => {
    const record = {
      id: uuidv4(),
      date: new Date().toISOString(),
      items: cart,
      subtotal,
      discount: disc,
      total,
    };
    const h = JSON.parse(await AsyncStorage.getItem('@history') || '[]');
    h.unshift(record);
    await AsyncStorage.setItem('@history', JSON.stringify(h));
    setCart([]);
    Alert.alert('Success', 'Bill saved to history');
  };

  const ProductRow = ({ item }) => (
    <View style={{ flexDirection: 'row', padding: 8, borderBottomWidth: 1 }}>
      <View style={{ flex: 1 }}>
        <Text>{item.name}</Text>
        <Text>₹{item.price} × {item.qty}</Text>
      </View>
      <TouchableOpacity
        onPress={() => changeQty(item.id, item.qty + 1)}
        style={{ marginRight: 10 }}>
        <Text>+</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => changeQty(item.id, Math.max(1, item.qty - 1))}
        style={{ marginRight: 10 }}>
        <Text>-</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => remove(item.id)}>
        <Text>Remove</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1, padding: 12 }}>
      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
        <TextInput
          placeholder="Product name"
          value={name}
          onChangeText={setName}
          style={{ flex: 2, borderWidth: 1, marginRight: 8, padding: 8 }}
        />
        <TextInput
          placeholder="Price"
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
          style={{ flex: 1, borderWidth: 1, padding: 8 }}
        />
      </View>

      <Button title="Add product" onPress={addProduct} />

      <Text style={{ marginTop: 20, fontSize: 16 }}>Cart Items</Text>
      <FlatList data={cart} renderItem={({ item }) => <ProductRow item={item} />} />

      <View style={{ marginTop: 20 }}>
        <Text>Discount %</Text>
        <TextInput
          value={String(discount)}
          onChangeText={setDiscount}
          keyboardType="numeric"
          style={{ borderWidth: 1, padding: 8 }}
        />

        <Text>Subtotal: ₹{subtotal.toFixed(2)}</Text>
        <Text>Total: ₹{total.toFixed(2)}</Text>

        <Button title="Save Bill" onPress={checkout} />
      </View>

      <View style={{ marginTop: 20 }}>
        <Button title="Scan Barcode" onPress={() => navigation.navigate('Scanner')} />
        <Button title="Customers" onPress={() => navigation.navigate('Customers')} />
        <Button title="Inventory" onPress={() => navigation.navigate('Inventory')} />
        <Button title="Billing History" onPress={() => navigation.navigate('History')} />
      </View>
    </View>
  );
}