import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput } from 'react-native';
import { readLocalJson } from '../services/storage';

export default function History(){
  const [history, setHistory] = useState([]);
  const [q, setQ] = useState('');
  useEffect(()=> {
    (async ()=> {
      const data = await readLocalJson('billing_history') || [];
      setHistory(data);
    })();
  }, []);
  const filtered = history.filter(h => {
    if(!q) return true;
    return (h.customer?.name || '').toLowerCase().includes(q.toLowerCase()) ||
           (h.customer?.phone || '').includes(q) ||
           h.id.includes(q);
  });
  return (
    <View style={{ flex:1, padding:12 }}>
      <TextInput placeholder="Search by name / phone / id" value={q} onChangeText={setQ} style={{borderWidth:1,padding:8,marginBottom:8}}/>
      <FlatList data={filtered} keyExtractor={it => it.id} renderItem={({item}) => (
        <View style={{ padding:8, borderBottomWidth:1 }}>
          <Text style={{ fontWeight:'700' }}>{item.id}</Text>
          <Text>{item.date}</Text>
          <Text>Customer: {item.customer?.name} — {item.customer?.phone}</Text>
          <Text>Total: {item.totals?.total?.toFixed(2)}</Text>
        </View>
      )} />
    </View>
  );
}