import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function History() {
  const [list, setList] = useState([]);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem('@history');
      setList(raw ? JSON.parse(raw) : []);
    })();
  }, []);

  const clearAll = async () => {
    await AsyncStorage.removeItem('@history');
    setList([]);
    Alert.alert('Cleared', 'History cleared');
  };

  return (
    <View style={{ flex: 1, padding: 12 }}>
      <View style={{ marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontWeight: '700' }}>Billing History</Text>
        <Button title="Clear all" color="#d00" onPress={clearAll} />
      </View>

      <FlatList
        data={list}
        keyExtractor={i => i.id}
        ListEmptyComponent={<Text>No history yet</Text>}
        renderItem={({ item }) => (
          <View style={{ padding: 8, borderBottomWidth: 1 }}>
            <Text style={{ fontWeight: '600' }}>{new Date(item.date).toLocaleString()}</Text>
            <Text>Items: {item.items?.length || 0}</Text>
            <Text>Subtotal: ₹{(item.subtotal || 0).toFixed(2)}</Text>
            <Text>Total: ₹{(item.total || 0).toFixed(2)}</Text>
          </View>
        )}
      />
    </View>
  );
}