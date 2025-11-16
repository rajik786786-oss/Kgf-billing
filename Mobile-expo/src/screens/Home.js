import React, { useState, useEffect } from 'react';
import { View, Text, Button, FlatList, Alert, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import ProductRow from '../components/ProductRow';
import InvoicePreview from '../components/InvoicePreview';
import { createAndSaveInvoicePdf } from '../services/pdf';
import { saveLocalJson, readLocalJson } from '../services/storage';

const defaultRow = () => ({ id: Date.now().toString(), name: '', price: 0, qty: 1, discount: 0, barcode: '' });

export default function Home({ navigation }) {
  const [rows, setRows] = useState([ defaultRow() ]);
  const [customer, setCustomer] = useState({ name: '', phone: '' });
  const [history, setHistory] = useState([]);

  useEffect(()=> {
    // load saved history
    (async()=> {
      const h = await readLocalJson('billing_history') || [];
      setHistory(h);
    })();
  }, []);

  function updateRow(id, patch){
    setRows(prev => prev.map(r => r.id === id ? {...r, ...patch} : r));
  }
  function addRow(){
    setRows(prev => [...prev, defaultRow()]);
  }
  function removeRow(id){
    setRows(prev => prev.filter(r => r.id !== id));
  }

  function calculateTotals(){
    let subtotal = 0;
    rows.forEach(r => {
      const p = Number(r.price) || 0;
      const q = Number(r.qty) || 0;
      const d = Number(r.discount) || 0;
      const line = p * q * (1 - d/100);
      subtotal += line;
    });
    const tax = Math.round(subtotal * 0.0); // customize
    const total = subtotal + tax;
    return { subtotal, tax, total };
  }

  async function handleSaveInvoice(){
    const totals = calculateTotals();
    const invoice = {
      id: 'inv-' + Date.now(),
      date: new Date().toISOString(),
      customer,
      rows,
      totals
    };
    // save to local history
    const newHistory = [invoice, ...history].slice(0, 200);
    setHistory(newHistory);
    await saveLocalJson('billing_history', newHistory);
    // generate PDF
    const html = InvoicePreview.renderHtml(invoice);
    try {
      const path = await createAndSaveInvoicePdf(html, `${invoice.id}.pdf`);
      Alert.alert('Invoice saved', `Saved at: ${path}`);
    } catch(e){
      Alert.alert('Error', e.message || String(e));
    }
  }

  const { subtotal, tax, total } = calculateTotals();

  return (
    <View style={{ flex:1, padding:12 }}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.navigate('Customers')} style={styles.menuBtn}>
          <Text>Customers</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Inventory')} style={styles.menuBtn}>
          <Text>Inventory</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('History')} style={styles.menuBtn}>
          <Text>History</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Scanner', { addToRow: (barcode) => {
          // find first empty row and fill
          const firstEmpty = rows.find(r => !r.barcode || r.barcode === '');
          if(firstEmpty) updateRow(firstEmpty.id, { barcode, name: barcode });
          else {
            const nr = defaultRow();
            nr.barcode = barcode; nr.name = barcode;
            setRows(prev => [...prev, nr]);
          }
        }})} style={styles.menuBtn}>
          <Text>Scan</Text>
        </TouchableOpacity>
      </View>

      <View style={{ marginVertical:8 }}>
        <Text style={{ fontWeight:'600' }}>Customer</Text>
        <TextInput placeholder="Name" value={customer.name} onChangeText={(t)=> setCustomer(s=>({...s, name:t}))} style={styles.input}/>
        <TextInput placeholder="Phone" value={customer.phone} onChangeText={(t)=> setCustomer(s=>({...s, phone:t}))} style={styles.input} keyboardType="phone-pad"/>
      </View>

      <FlatList
        data={rows}
        keyExtractor={item => item.id}
        renderItem={({item}) => (
          <ProductRow item={item} onChange={(patch)=> updateRow(item.id, patch)} onRemove={()=> removeRow(item.id)} />
        )}
        ListFooterComponent={
          <>
            <Button title="Add product row" onPress={addRow} />
            <View style={{ height:12 }} />
            <Text>Subtotal: {subtotal.toFixed(2)}</Text>
            <Text>Tax: {tax.toFixed(2)}</Text>
            <Text style={{ fontWeight:'700' }}>Total: {total.toFixed(2)}</Text>
            <View style={{ height:8 }} />
            <Button title="Save & Create Invoice PDF" onPress={handleSaveInvoice} />
            <View style={{ height:8 }} />
          </>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow:{ flexDirection:'row', justifyContent:'space-between', marginBottom:8 },
  menuBtn:{ padding:8, borderWidth:1, borderRadius:6 },
  input:{ borderWidth:1, padding:8, borderRadius:6, marginTop:6 }
});