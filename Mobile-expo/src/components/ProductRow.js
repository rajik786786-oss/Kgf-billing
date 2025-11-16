import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

export default function ProductRow({ item, onChange, onRemove }) {
  return (
    <View style={styles.row}>
      <TextInput placeholder="Name" value={item.name} onChangeText={t=> onChange({ name:t })} style={styles.name} />
      <TextInput placeholder="Price" value={String(item.price)} keyboardType="numeric" onChangeText={t=> onChange({ price: Number(t) || 0 })} style={styles.small}/>
      <TextInput placeholder="Qty" value={String(item.qty)} keyboardType="numeric" onChangeText={t=> onChange({ qty: Number(t) || 1 })} style={styles.small}/>
      <TextInput placeholder="%D" value={String(item.discount)} keyboardType="numeric" onChangeText={t=> onChange({ discount: Number(t) || 0 })} style={styles.small}/>
      <TextInput placeholder="Barcode" value={item.barcode} onChangeText={t=> onChange({ barcode: t })} style={styles.barcode}/>
      <TouchableOpacity onPress={onRemove} style={styles.remove}><Text>Remove</Text></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row:{ borderWidth:1, padding:8, marginBottom:8, borderRadius:6 },
  name:{ borderWidth:1, padding:6, marginBottom:6 },
  small:{ borderWidth:1, padding:6, width:80, marginBottom:6 },
  barcode:{ borderWidth:1, padding:6, marginBottom:6 },
  remove:{ backgroundColor:'#eee', padding:6, alignItems:'center' }
});