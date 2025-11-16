import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export default function ProductRow({ item, onRemove, onChangeQty }) {
  return (
    <View style={{ flexDirection: 'row', padding: 10, borderBottomWidth: 1 }}>
      <View style={{ flex: 1 }}>
        <Text>{item.name}</Text>
        <Text>₹{item.price} × {item.qty}</Text>
      </View>

      <TouchableOpacity onPress={() => onChangeQty(item.id, item.qty + 1)}>
        <Text style={{ marginRight: 10 }}>+</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => onChangeQty(item.id, Math.max(1, item.qty - 1))}>
        <Text style={{ marginRight: 10 }}>-</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => onRemove(item.id)}>
        <Text>Remove</Text>
      </TouchableOpacity>
    </View>
  );
}