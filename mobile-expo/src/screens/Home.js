// Mobile-expo/src/screens/Home.js
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, TouchableOpacity, Alert, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { createInvoicePdfAndSave } from '../services/pdf';
import PrintButton from '../components/PrintButton';

export default function Home({ navigation }) {
  // form fields for manual add
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [qtyInput, setQtyInput] = useState('1');
  const [discount, setDiscount] = useState('0');

  // cart and selected customer
  const [cart, setCart] = useState([]); // each: { id, name, price, qty, discount, barcode? }
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // simple UI helper
  useEffect(() => {
    // ensure history exists
    (async () => {
      const h = await AsyncStorage.getItem('@history');
      if (!h) await AsyncStorage.setItem('@history', JSON.stringify([]));
    })();
  }, []);

  const addProduct = () => {
    if (!name.trim() || !price) {
      Alert.alert('Validation', 'Enter product name and price');
      return;
    }
    const p = {
      id: uuidv4(),
      name: name.trim(),
      price: Number(price),
      qty: Math.max(1, parseInt(qtyInput || '1', 10)),
      discount: Number(discount || 0),
      barcode: null,
    };
    setCart(prev => [...prev, p]);
    setName(''); setPrice(''); setQtyInput('1'); setDiscount('0');
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id));
  const changeQty = (id, qty) => setCart(prev => prev.map(i => i.id === id ? { ...i, qty } : i));
  const changeDiscount = (id, d) => setCart(prev => prev.map(i => i.id === id ? { ...i, discount: d } : i));

  const subtotal = cart.reduce((s, p) => s + (Number(p.price || 0) * Number(p.qty || 1)), 0);
  const globalDiscountPercent = 0; // keep if you want apply global disc; right now per-line discount is used
  const total = cart.reduce((s, p) => {
    const before = Number(p.price || 0) * Number(p.qty || 1);
    const after = before - (before * (Number(p.discount || 0) / 100));
    return s + after;
  }, 0);

  // -------------------------
  // Inventory decrement logic
  // -------------------------
  // inventory items in AsyncStorage under '@inventory'
  // inventory item shape expected: { id, name, price, barcode, qty }
  async function decrementInventoryForCart(cartItems) {
    try {
      const raw = await AsyncStorage.getItem('@inventory');
      const inv = raw ? JSON.parse(raw) : [];

      // map by id for quick update
      const invMap = inv.reduce((m, it) => { m[it.id] = { ...it }; return m; }, {});

      // helper: find match by barcode or exact name (case-insensitive)
      const findMatch = (sold) => {
        if (sold.barcode) {
          return inv.find(i => i.barcode && String(i.barcode) === String(sold.barcode));
        }
        // match by name (exact case-insensitive)
        const nameLower = (sold.name || '').toLowerCase();
        return inv.find(i => (i.name || '').toLowerCase() === nameLower);
      };

      for (const sold of cartItems) {
        const matched = findMatch(sold);
        if (matched) {
          const id = matched.id;
          const prevQty = Number(invMap[id].qty || 0);
          const newQty = Math.max(0, prevQty - Number(sold.qty || 1));
          invMap[id].qty = newQty;
        }
      }

      const newInv = Object.values(invMap);
      await AsyncStorage.setItem('@inventory', JSON.stringify(newInv));
      return newInv;
    } catch (e) {
      console.warn('decrementInventoryForCart error', e);
      return null;
    }
  }

  // -------------------------
  // Checkout: save history, create PDF, decrement inventory
  // -------------------------
  const checkout = async ({ shareAfter = false } = {}) => {
    if (!cart || cart.length === 0) {
      Alert.alert('Empty', 'Add products before checkout');
      return;
    }

    // prepare invoice items with subtotal lines
    const invoiceItems = cart.map(item => {
      const priceN = Number(item.price || 0);
      const qtyN = Number(item.qty || 1);
      const discN = Number(item.discount || 0);
      const before = priceN * qtyN;
      const after = before - (before * (discN / 100));
      return {
        id: item.id,
        name: item.name,
        price: priceN,
        qty: qtyN,
        discount: discN,
        subtotal: Number(after.toFixed(2)),
        barcode: item.barcode || null,
      };
    });

    // decrement inventory
    await decrementInventoryForCart(invoiceItems);

    // invoice meta
    const invoiceMeta = { invoiceNo: `INV-${Date.now()}`, date: new Date().toLocaleString() };

    // create pdf and save
    let pdfPath = null;
    try {
      pdfPath = await createInvoicePdfAndSave({
        shop: { name: "KGF MEN'S WEAR", address: '' },
        customer: selectedCustomer || {},
        items: invoiceItems,
        invoiceMeta,
      });
    } catch (e) {
      console.warn('createInvoicePdfAndSave failed', e);
      Alert.alert('Warning', 'Invoice PDF generation failed, but sale will still be saved.');
    }

    // persist history
    try {
      const histRaw = await AsyncStorage.getItem('@history');
      const hist = histRaw ? JSON.parse(histRaw) : [];
      const totalN = invoiceItems.reduce((s, it) => s + (Number(it.subtotal) || 0), 0);
      const record = {
        id: String(Date.now()),
        date: new Date().toISOString(),
        items: invoiceItems,
        subtotal: subtotal,
        discountApplied: globalDiscountPercent,
        total: totalN,
        invoiceNo: invoiceMeta.invoiceNo,
        invoicePdf: pdfPath,
        customer: selectedCustomer || null,
      };
      hist.unshift(record);
      await AsyncStorage.setItem('@history', JSON.stringify(hist));
    } catch (e) {
      console.warn('saving history failed', e);
    }

    // clear cart
    setCart([]);
    Alert.alert('Success', 'Invoice saved and inventory updated');

    // optionally open share dialog if pdf exists
    if (shareAfter && pdfPath) {
      // Let PrintButton or expo-sharing handle sharing; here we just show path
      Alert.alert('Saved', `Invoice saved to ${pdfPath}`);
    }
  };

  // -------------------------
  // UI rendering
  // -------------------------
  const renderCartItem = ({ item }) => (
    <View style={{ flexDirection: 'row', padding: 8, borderBottomWidth: 1, alignItems: 'center' }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '600' }}>{item.name}</Text>
        <Text>₹{Number(item.price).toFixed(2)} × {item.qty}</Text>
        <Text>Disc: {item.discount || 0}%</Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => changeQty(item.id, item.qty + 1)} style={{ padding: 8 }}>
          <Text>+</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => changeQty(item.id, Math.max(1, item.qty - 1))} style={{ padding: 8 }}>
          <Text>-</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => removeFromCart(item.id)} style={{ padding: 8 }}>
          <Text style={{ color: 'red' }}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, padding: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 8 }}>KGF MEN'S WEAR — Billing</Text>

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

      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
        <TextInput
          placeholder="Qty"
          value={qtyInput}
          onChangeText={setQtyInput}
          keyboardType="numeric"
          style={{ width: 80, borderWidth: 1, padding: 8, marginRight: 8 }}
        />
        <TextInput
          placeholder="Line discount %"
          value={discount}
          onChangeText={setDiscount}
          keyboardType="numeric"
          style={{ width: 120, borderWidth: 1, padding: 8 }}
        />
        <View style={{ flex: 1, justifyContent: 'center', marginLeft: 8 }}>
          <Button title="Add product" onPress={() => {
            // when adding product, attach discount and qtyInput
            if (!name.trim() || !price) return Alert.alert('Validation', 'Enter product name and price');
            const p = { id: uuidv4(), name: name.trim(), price: Number(price), qty: Math.max(1, Number(qtyInput)), discount: Number(discount || 0), barcode: null };
            setCart(prev => [...prev, p]);
            setName(''); setPrice(''); setQtyInput('1'); setDiscount('0');
          }} />
        </View>
      </View>

      <Text style={{ fontSize: 16, marginBottom: 8 }}>Cart</Text>
      <FlatList data={cart} keyExtractor={i => i.id} renderItem={renderCartItem} ListEmptyComponent={<Text>No items added.</Text>} />

      <View style={{ marginTop: 12 }}>
        <Text>Subtotal: ₹{subtotal.toFixed(2)}</Text>
        <Text>Total (after per-line discounts): ₹{total.toFixed(2)}</Text>
      </View>

      <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
        <Button title="Save & Update Stock" onPress={() => checkout({ shareAfter: false })} />
        <Button title="Save & Share Invoice" onPress={() => checkout({ shareAfter: true })} />
      </View>

      <View style={{ marginTop: 12 }}>
        <Text style={{ fontWeight: '700', marginBottom: 8 }}>Print / Share PDF</Text>
        <PrintButton
          shop={{ name: "KGF MEN'S WEAR", address: "" }}
          customer={selectedCustomer || {}}
          items={cart.map(item => ({ ...item, subtotal: Number(((item.price || 0) * (item.qty || 1) * (1 - (item.discount || 0)/100)).toFixed(2)) }))}
          invoiceMeta={{ invoiceNo: `INV-${Date.now()}`, date: new Date().toLocaleString() }}
          onDone={(path) => { console.log('PDF created:', path); }}
        />
      </View>

      <View style={{ height: 20 }} />

      <View style={{ marginBottom: 40 }}>
        <Button title="Scan Barcode" onPress={() => navigation.navigate('Scanner')} />
        <View style={{ height: 8 }} />
        <Button title="Inventory" onPress={() => navigation.navigate('Inventory')} />
        <View style={{ height: 8 }} />
        <Button title="Customers" onPress={() => navigation.navigate('Customers')} />
        <View style={{ height: 8 }} />
        <Button title="Billing History" onPress={() => navigation.navigate('History')} />
      </View>
    </ScrollView>
  );
}