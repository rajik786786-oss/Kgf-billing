// src/screens/Home.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  Alert,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import { v4 as uuidv4 } from 'uuid';
import PrintButton from '../components/PrintButton'; // <- ensure this path matches your project

/* ---------------------------
  Data keys used in AsyncStorage
----------------------------*/
const INVENTORY_KEY = '@inventory';
const HISTORY_KEY = '@history';

/* ---------------------------
  Utility: simple HTML invoice generator
  Customize this to your printable design.
----------------------------*/
function invoiceHtml({ invoiceId, shop = {}, customer = {}, cart = [], total, date }) {
  const itemsHtml = cart
    .map(
      (it) => `
    <tr>
      <td style="padding:6px;border:1px solid #ddd">${it.name}</td>
      <td style="padding:6px;border:1px solid #ddd;text-align:right">${it.qty}</td>
      <td style="padding:6px;border:1px solid #ddd;text-align:right">${it.price.toFixed(
        2
      )}</td>
      <td style="padding:6px;border:1px solid #ddd;text-align:right">${(it.qty * it.price).toFixed(2)}</td>
    </tr>`
    )
    .join('');

  return `
  <html>
  <head>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
  </head>
  <body style="font-family:Arial, Helvetica, sans-serif; padding:20px;">
    <h2>${shop.name || 'My Shop'}</h2>
    <div>Invoice: <strong>${invoiceId}</strong></div>
    <div>Date: ${date}</div>
    <div>Customer: ${customer.name || 'Walk-in'}</div>
    <hr/>
    <table style="width:100%; border-collapse: collapse;">
      <thead>
        <tr>
          <th style="padding:6px;border:1px solid #ddd;text-align:left">Item</th>
          <th style="padding:6px;border:1px solid #ddd;text-align:right">Qty</th>
          <th style="padding:6px;border:1px solid #ddd;text-align:right">Price</th>
          <th style="padding:6px;border:1px solid #ddd;text-align:right">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>
    <h3 style="text-align:right">Total: ${total.toFixed(2)}</h3>
    <hr/>
    <div style="font-size:12px;color:#555">Thank you for your business.</div>
  </body>
  </html>
  `;
}

/* ---------------------------
  createInvoicePdfAndSave:
  - Creates HTML invoice
  - uses Print.printToFileAsync to make PDF
  - moves saved PDF to app documentDirectory with deterministic name
  - returns saved fileUri
----------------------------*/
export async function createInvoicePdfAndSave({ shop, customer, cart }) {
  if (!cart || cart.length === 0) throw new Error('Cart is empty');

  const invoiceId = `INV-${new Date().getTime()}`;
  const date = new Date().toLocaleString();
  const total = cart.reduce((s, it) => s + (it.price || 0) * (it.qty || 0), 0);

  const html = invoiceHtml({ invoiceId, shop, customer, cart, total, date });

  // create PDF in cache / tmp location
  const { uri } = await Print.printToFileAsync({ html });

  // ensure folder exists
  const dir = `${FileSystem.documentDirectory}invoices/`;
  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }

  const filename = `${invoiceId}.pdf`;
  const dest = `${dir}${filename}`;

  // move the temporary PDF to our documents folder
  await FileSystem.moveAsync({
    from: uri,
    to: dest,
  });

  return dest; // file URI
}

/* ---------------------------
  decrementInventory:
  - Loads inventory (array of { id, name, qty, ... })
  - For each cart item reduces qty by cart.qty
  - Never goes negative
  - Saves back to AsyncStorage
  - Returns updated inventory
----------------------------*/
async function decrementInventory(cart) {
  const raw = await AsyncStorage.getItem(INVENTORY_KEY);
  const inventory = raw ? JSON.parse(raw) : [];

  // create a map for faster lookup
  const byId = new Map(inventory.map((it) => [it.id || it.name, { ...it }]));

  for (const c of cart) {
    // prefer id lookup, fallback to name
    const key = c.id || c.name;
    const invItem = byId.get(key);

    if (invItem) {
      const want = Number(c.qty) || 0;
      invItem.qty = Math.max(0, Number(invItem.qty || 0) - want);
      byId.set(key, invItem);
    } else {
      // not found: skip (or you could push a new negative entry)
      console.warn(`Inventory item not found for "${key}" — skipping decrement`);
    }
  }

  const updated = Array.from(byId.values());
  await AsyncStorage.setItem(INVENTORY_KEY, JSON.stringify(updated));
  return updated;
}

/* ---------------------------
  saveHistoryRecord:
  - Append a simple record to @history
----------------------------*/
async function saveHistoryRecord(record) {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  const history = raw ? JSON.parse(raw) : [];
  history.unshift(record); // newest first
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  return history;
}

/* ---------------------------
  Home component
----------------------------*/
export default function Home() {
  const [inventory, setInventory] = useState([]);
  const [cart, setCart] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [customerName, setCustomerName] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualQty, setManualQty] = useState('1');

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(INVENTORY_KEY);
        if (!raw) {
          // initialize with an example inventory if none exists
          const example = [
            { id: 'p1', name: 'Item A', price: 50.0, qty: 20 },
            { id: 'p2', name: 'Item B', price: 30.0, qty: 15 },
          ];
          await AsyncStorage.setItem(INVENTORY_KEY, JSON.stringify(example));
          setInventory(example);
        } else {
          setInventory(JSON.parse(raw));
        }
      } catch (e) {
        console.error('Failed loading inventory', e);
      } finally {
        setLoadingInventory(false);
      }
    })();
  }, []);

  /* Add an inventory item to cart */
  function addToCartFromInventory(item, qty = 1) {
    const q = Number(qty) || 1;
    setCart((prev) => {
      // merge same-item by id or name
      const existingIdx = prev.findIndex((p) => (p.id || p.name) === (item.id || item.name));
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          qty: Number(next[existingIdx].qty || 0) + q,
        };
        return next;
      }
      return [...prev, { ...item, qty: q }];
    });
  }

  /* Add manual item (ad-hoc) */
  function addManualItem() {
    if (!manualName) return Alert.alert('Enter item name');
    const price = parseFloat(manualPrice) || 0;
    const qty = parseInt(manualQty, 10) || 1;
    setCart((p) => [...p, { id: uuidv4(), name: manualName, price, qty }]);
    setManualName('');
    setManualPrice('');
    setManualQty('1');
  }

  /* Calculate totals */
  const total = cart.reduce((s, it) => s + (Number(it.price || 0) * Number(it.qty || 0)), 0);

  /* Finalize bill:
     - decrement inventory
     - create PDF and save
     - record history entry
  */
  async function finalizeBill() {
    if (!cart || cart.length === 0) return Alert.alert('Cart is empty');
    try {
      // 1) decrement inventory
      const updatedInventory = await decrementInventory(cart);
      setInventory(updatedInventory);

      // 2) create PDF
      const shop = { name: 'My Shop' }; // adjust as needed
      const customer = { name: customerName || 'Walk-in' };
      const pdfUri = await createInvoicePdfAndSave({ shop, customer, cart });

      // 3) save history record
      const record = {
        id: uuidv4(),
        date: new Date().toISOString(),
        customer: customer.name,
        cart,
        total,
        pdfUri,
      };
      await saveHistoryRecord(record);

      // 4) clear cart & feedback
      setCart([]);
      Alert.alert('Success', `Invoice saved: ${pdfUri}`);
    } catch (e) {
      console.error('Failed finalizeBill', e);
      Alert.alert('Error', e.message || String(e));
    }
  }

  /* Print (create PDF then optionally share in PrintButton) */
  async function handleGeneratePdfAndMaybeShare() {
    if (!cart || cart.length === 0) return Alert.alert('Cart is empty');
    try {
      const shop = { name: 'My Shop' };
      const customer = { name: customerName || 'Walk-in' };
      const fileUri = await createInvoicePdfAndSave({ shop, customer, cart });
      Alert.alert('PDF created', fileUri);
      // You could add expo-sharing or a share modal here if you like.
    } catch (e) {
      console.error('PDF generation failed', e);
      Alert.alert('Failed to generate PDF', e.message || String(e));
    }
  }

  /* UI */
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>POS / Billing</Text>

      <View style={styles.section}>
        <Text style={styles.label}>Customer name</Text>
        <TextInput
          value={customerName}
          onChangeText={setCustomerName}
          placeholder="Customer name"
          style={styles.input}
        />
      </View>

      {/* Manual item add */}
      <View style={styles.section}>
        <Text style={styles.sub}>Add manual item</Text>
        <TextInput
          placeholder="Item name"
          value={manualName}
          onChangeText={setManualName}
          style={styles.input}
        />
        <View style={styles.row}>
          <TextInput
            placeholder="Price"
            value={manualPrice}
            onChangeText={setManualPrice}
            keyboardType="numeric"
            style={[styles.input, { flex: 1, marginRight: 8 }]}
          />
          <TextInput
            placeholder="Qty"
            value={manualQty}
            onChangeText={setManualQty}
            keyboardType="numeric"
            style={[styles.input, { width: 80 }]}
          />
        </View>
        <Button title="Add item" onPress={addManualItem} />
      </View>

      {/* Inventory list */}
      <View style={styles.section}>
        <Text style={styles.sub}>Inventory</Text>
        {loadingInventory ? (
          <Text>Loading inventory...</Text>
        ) : inventory.length === 0 ? (
          <Text style={{ color: '#666' }}>No inventory</Text>
        ) : (
          <FlatList
            data={inventory}
            keyExtractor={(i) => i.id || i.name}
            renderItem={({ item }) => (
              <View style={styles.invRow}>
                <View style={{ flex: 1 }}>
                  <Text>{item.name}</Text>
                  <Text style={{ color: '#666' }}>Qty: {item.qty}</Text>
                </View>
                <Button
                  title="Add"
                  onPress={() => addToCartFromInventory(item, 1)}
                />
              </View>
            )}
          />
        )}
      </View>

      {/* Cart */}
      <View style={styles.section}>
        <Text style={styles.sub}>Cart</Text>
        {cart.length === 0 ? (
          <Text style={{ color: '#666' }}>Cart empty</Text>
        ) : (
          <FlatList
            data={cart}
            keyExtractor={(i) => i.id || `${i.name}-${Math.random()}`}
            renderItem={({ item }) => (
              <View style={styles.cartRow}>
                <Text>{item.name} x {item.qty}</Text>
                <Text>{(item.price * item.qty).toFixed(2)}</Text>
              </View>
            )}
          />
        )}

        <View style={[styles.row, { justifyContent: 'space-between', marginTop: 8 }]}>
          <Text style={{ fontWeight: 'bold' }}>Total: {total.toFixed(2)}</Text>
          <Button title="Clear cart" onPress={() => setCart([])} />
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <PrintButton label="Generate PDF" onPress={handleGeneratePdfAndMaybeShare} />
        <PrintButton label="Finalize Bill (Save + Decrement Stock)" onPress={finalizeBill} />
      </View>
    </SafeAreaView>
  );
}

/* ---------------------------
  Styles
----------------------------*/
const styles = StyleSheet.create({
  container: { flex: 1, padding: 14, backgroundColor: '#fff' },
  heading: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  section: { marginBottom: 14 },
  label: { marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  invRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f3f3',
  },
  sub: { fontWeight: '600', marginBottom: 6 },
  cartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f7f7f7',
  },
  actions: { marginTop: 10 },
});
