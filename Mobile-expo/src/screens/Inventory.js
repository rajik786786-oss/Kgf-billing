import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Button, TextInput } from 'react-native';
import { saveLocalJson, readLocalJson } from '../services/storage';

export default function Inventory(){
  const [items, setItems] = useState([]);
  const [name, setName] = useState(''); const [qty, setQty] = useState('1');

  useEffect(()=> {
    (async ()=> {
      const data = await readLocalJson('inventory') || [];
      setItems(data);
    })();
  }, []);

  async function add(){
    const it = { id: Date.now().toString(), name, qty: Number(qty) || 0 };
    const next = [it, ...items];
    setItems(next);
    await saveLocalJson('inventory', next);
    setName(''); setQty('1');
  }

  return (
    <View style={{ flex:1, padding:12 }}>
      <TextInput placeholder="Product name" value={name} onChangeText={setName} style={{borderWidth:1,padding:8,marginBottom:8}}/>
      <TextInput placeholder="Qty" value={qty} onChangeText={setQty} style={{borderWidth:1,padding:8,marginBottom:8}} keyboardType="numeric"/>
      <Button title="Add product" onPress={add} />
      <FlatList data={items} keyExtractor={i=>i.id} renderItem={({item}) => <View style={{padding:8,borderBottomWidth:1}}><Text>{item.name} — {item.qty}</Text></View>} />
    </View>
  );
}