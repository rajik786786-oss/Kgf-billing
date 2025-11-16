import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, Button, Alert } from 'react-native';
import { saveLocalJson, readLocalJson } from '../services/storage';

export default function Customers(){
  const [list, setList] = useState([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  useEffect(()=> {
    (async ()=> {
      const data = await readLocalJson('customers') || [];
      setList(data);
    })();
  }, []);
  async function add(){
    if(!name.trim()) return Alert.alert('Name required');
    const next = [{ id: Date.now().toString(), name, phone }, ...list];
    setList(next);
    await saveLocalJson('customers', next);
    setName(''); setPhone('');
  }
  return (
    <View style={{ flex:1, padding:12 }}>
      <TextInput placeholder="Name" value={name} onChangeText={setName} style={{ borderWidth:1, padding:8, marginBottom:8 }}/>
      <TextInput placeholder="Phone" value={phone} onChangeText={setPhone} style={{ borderWidth:1, padding:8, marginBottom:8 }} keyboardType="phone-pad"/>
      <Button title="Add customer" onPress={add} />
      <FlatList data={list} keyExtractor={it => it.id} renderItem={({item})=> <View style={{padding:8,borderBottomWidth:1}}><Text>{item.name} - {item.phone}</Text></View>} />
    </View>
  );
}