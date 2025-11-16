// App.js — single-page billing app for KGF MEN'S WEAR
import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TextInput, Button, FlatList, TouchableOpacity,
  Alert, Modal, ScrollView, KeyboardAvoidingView, Platform, Linking, SafeAreaView
} from 'react-native';
import * as SQLite from 'expo-sqlite';
import { BarCodeScanner } from 'expo-barcode-scanner';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const db = SQLite.openDatabase('kgf.db');

// --- DB helpers ---
function initDB() {
  return new Promise((res, rej) => {
    db.transaction(tx => {
      tx.executeSql(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY NOT NULL, sku TEXT UNIQUE, name TEXT, price REAL, qty INTEGER);`);
      tx.executeSql(`CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY NOT NULL, name TEXT, phone TEXT);`);
      tx.executeSql(`CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY NOT NULL, items TEXT, total REAL, discount REAL, customerId INTEGER, createdAt TEXT);`);
    }, (e) => rej(e), () => res());
  });
}

function runSql(sql, params = []) {
  return new Promise((res, rej) => {
    db.transaction(tx => {
      tx.executeSql(sql, params, (_, result) => res(result), (_, err) => { rej(err); return false; });
    });
  });
}

// products
async function addOrUpdateProduct({ sku, name, price, qty }) {
  const psku = sku?.toString() || '';
  return runSql(
    `INSERT OR REPLACE INTO products (id, sku, name, price, qty)
     VALUES (COALESCE((SELECT id FROM products WHERE sku = ?), NULL),?,?,?,?,?);`.replace('?,?,?,?,?','?,?,?,?'),
    [psku, psku, name, parseFloat(price||0), parseInt(qty||0)]
  ).catch(e => {
    // fallback: simpler insert/update
    return runSql(`INSERT OR REPLACE INTO products (id, sku, name, price, qty) VALUES ( (SELECT id FROM products WHERE sku = ?), ?, ?, ?, ?);`, [psku, psku, name, parseFloat(price||0), parseInt(qty||0)]);
  });
}
function getProducts() { return runSql(`SELECT * FROM products ORDER BY name;`).then(r => r.rows._array); }
function getProductBySku(sku) { return runSql(`SELECT * FROM products WHERE sku = ? LIMIT 1;`, [sku]).then(r => r.rows._array[0]); }
function updateProductQty(id, qty) { return runSql(`UPDATE products SET qty = ? WHERE id = ?;`, [qty, id]); }

// customers
function addCustomer({ name, phone }) { return runSql(`INSERT INTO customers (name, phone) VALUES (?,?);`, [name, phone]); }
function getCustomers() { return runSql(`SELECT * FROM customers ORDER BY name;`).then(r => r.rows._array); }

// sales
function addSale({ items, total, discount = 0, customerId = null }) {
  const itemsJson = JSON.stringify(items || []);
  const createdAt = new Date().toISOString();
  return runSql(`INSERT INTO sales (items, total, discount, customerId, createdAt) VALUES (?,?,?,?,?);`, [itemsJson, total, discount, customerId, createdAt]);
}
function getSales(filters = {}) {
  return new Promise((res, rej) => {
    db.transaction(tx => {
      let sql = `SELECT s.id, s.items, s.total, s.discount, s.customerId, s.createdAt, c.name as customerName, c.phone as customerPhone
                 FROM sales s LEFT JOIN customers c ON s.customerId = c.id`;
      const clauses = []; const params = [];
      if (filters.from) { clauses.push('datetime(s.createdAt) >= datetime(?)'); params.push(filters.from); }
      if (filters.to) { clauses.push('datetime(s.createdAt) <= datetime(?)'); params.push(filters.to); }
      if (filters.nameOrPhone) { clauses.push('(c.name LIKE ? OR c.phone LIKE ? OR s.items LIKE ?)'); const term = `%${filters.nameOrPhone}%`; params.push(term, term, term); }
      if (clauses.length) sql += ' WHERE ' + clauses.join(' AND ');
      sql += ' ORDER BY s.createdAt DESC LIMIT 1000';
      tx.executeSql(sql, params, (_, result) => res(result.rows._array), (_, err) => { rej(err); return false; });
    });
  });
}

// --- helper UI functions ---
function currency(n) { return `₹${Number(n||0).toFixed(2)}`; }
function clampPercent(v) { const n = parseFloat(v||0); if (Number.isNaN(n)) return 0; return Math.max(0, Math.min(100, n)); }

// --- PDF invoice generator ---
function buildInvoiceHtml({ store = "KGF MEN'S WEAR", items = [], discount = 0, total = 0, customer = 'Walk-in', invoiceNo = '' }) {
  const subtotal = items.reduce((s,i)=> s + (i.price * i.qty), 0);
  const rows = items.map(it => `<tr>
    <td style="padding:6px;border-bottom:1px solid #eee">${it.name}</td>
    <td style="padding:6px;border-bottom:1px solid #eee;text-align:center">${it.qty}</td>
    <td style="padding:6px;border-bottom:1px solid #eee;text-align:right">₹${Number(it.price).toFixed(2)}</td>
    <td style="padding:6px;border-bottom:1px solid #eee;text-align:right">₹${(it.price*it.qty).toFixed(2)}</td>
  </tr>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"/></head><body style="font-family: Arial, Helvetica, sans-serif; padding:12px">
    <h2 style="margin:0">${store}</h2>
    <div style="margin-top:6px">Invoice: ${invoiceNo || ''}</div>
    <div>Customer: ${customer}</div>
    <div style="margin-top:12px">
      <table style="width:100%; border-collapse:collapse">
        <thead><tr><th style="text-align:left">Item</th><th>Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr><td colspan="2"></td><td style="text-align:right">Subtotal</td><td style="text-align:right">₹${subtotal.toFixed(2)}</td></tr>
          <tr><td colspan="2"></td><td style="text-align:right">Discount</td><td style="text-align:right">₹${(subtotal - total).toFixed(2)}</td></tr>
          <tr><td colspan="2"></td><td style="text-align:right"><strong>Total</strong></td><td style="text-align:right"><strong>₹${total.toFixed(2)}</strong></td></tr>
        </tfoot>
      </table>
    </div>
    <div style="margin-top:12px;font-size:12px;color:#666">Thank you for your purchase.</div>
  </body></html>`;
}

// --- main app (single page with modal scanner) ---
export default function App() {
  const [activeSection, setActiveSection] = useState('billing'); // billing | inventory | customers | history | forecast
  // inventory form
  const [sku, setSku] = useState(''); const [name, setName] = useState(''); const [price, setPrice] = useState(''); const [qty, setQty] = useState('1');
  const [inventory, setInventory] = useState([]);
  // customers
  const [customers, setCustomers] = useState([]); const [custName, setCustName] = useState(''); const [custPhone, setCustPhone] = useState('');
  // cart
  const [cart, setCart] = useState([]); const [invoiceDiscount, setInvoiceDiscount] = useState('0'); const [selectedCustomer, setSelectedCustomer] = useState(null);
  // history filters
  const [histFrom, setHistFrom] = useState(''); const [histTo, setHistTo] = useState(''); const [histTerm, setHistTerm] = useState(''); const [history, setHistory] = useState([]);
  // forecast
  const [forecast, setForecast] = useState([]);
  // scanner
  const [scannerVisible, setScannerVisible] = useState(false); const [hasCameraPerm, setHasCameraPerm] = useState(null);
  // UI refresh token
  const refreshRef = useRef(0);

  // initialize DB + permissions
  useEffect(() => {
    (async () => {
      try {
        await initDB();
        await requestCameraPermission();
        await loadAll();
      } catch (e) {
        console.log('init err', e);
      }
    })();
  }, []);

  async function requestCameraPermission() {
    try {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasCameraPerm(status === 'granted');
    } catch (e) { setHasCameraPerm(false); }
  }

  async function loadAll() {
    const prods = await getProducts().catch(()=>[]);
    setInventory(prods);
    const custs = await getCustomers().catch(()=>[]);
    setCustomers(custs);
    await loadHistory();
    computeForecast();
  }

  async function saveProduct() {
    if (!sku || !name) return Alert.alert('Missing', 'SKU and name are required');
    try {
      await addOrUpdateProduct({ sku: sku.toString(), name, price: parseFloat(price || 0), qty: parseInt(qty || 0) });
      Alert.alert('Saved', `${name} saved`);
      setSku(''); setName(''); setPrice(''); setQty('1');
      loadAll();
    } catch (e) { Alert.alert('DB error', String(e)); }
  }

  function addToCart(product) {
    if (!product || !product.sku) return;
    setCart(prev => {
      const found = prev.find(p => p.sku === product.sku);
      if (found) return prev.map(p => p.sku === product.sku ? { ...p, qty: p.qty + (product.qty || 1) } : p);
      return [...prev, { id: product.id || null, sku: product.sku, name: product.name || product.sku, price: Number(product.price || 0), qty: product.qty || 1 }];
    });
  }

  async function handleScanned(skuCode) {
    setScannerVisible(false);
    try {
      const p = await getProductBySku(skuCode);
      if (p) addToCart({...p, qty:1});
      else {
        setSku(skuCode); Alert.alert('Not in inventory', 'Scanned SKU not found — it is prefilled in Add form.');
      }
    } catch (e) { Alert.alert('Scan error', String(e)); }
  }

  function changeCartQty(skuKey, delta) {
    setCart(prev => prev.map(i => i.sku === skuKey ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter(i=>i.qty>0));
  }

  async function checkout() {
    if (cart.length === 0) return Alert.alert('Cart empty');
    const subtotal = cart.reduce((s,i)=> s + i.price * i.qty, 0);
    const disc = clampPercent(invoiceDiscount);
    const discountAmount = subtotal * (disc / 100);
    const total = subtotal - discountAmount;

    try {
      // update inventory qty
      for (const it of cart) {
        if (it.id) {
          const prod = inventory.find(p => p.id === it.id);
          if (prod) {
            const newQty = Math.max(0, (prod.qty || 0) - it.qty);
            await updateProductQty(it.id, newQty);
          }
        }
      }
      // save sale
      await addSale({ items: cart, total, discount: disc, customerId: selectedCustomer ? selectedCustomer.id : null });
      // prepare invoice and print/share
      const invoiceHtml = buildInvoiceHtml({ items: cart, discount: discountAmount, total, customer: selectedCustomer?.name || 'Walk-in' });
      // print dialog
      await Print.printAsync({ html: invoiceHtml });
      // refresh
      setCart([]); setInvoiceDiscount('0'); setSelectedCustomer(null);
      await loadAll();
      Alert.alert('Success', `Sale saved: ${currency(total)}`);
    } catch (e) {
      Alert.alert('Checkout error', String(e));
    }
  }

  async function loadHistory() {
    try {
      const rows = await getSales({ from: histFrom || undefined, to: histTo || undefined, nameOrPhone: histTerm || undefined });
      setHistory(rows || []);
    } catch (e) { setHistory([]); }
  }

  function computeForecast() {
    getSales({}).then(sales => {
      const bySku = {};
      (sales||[]).forEach(s => {
        try {
          const items = JSON.parse(s.items || '[]');
          items.forEach(it => {
            if(!it.sku) it.sku = it.name;
            bySku[it.sku] = bySku[it.sku] || { name: it.name, qty: 0, revenue: 0 };
            bySku[it.sku].qty += (it.qty || 0);
            bySku[it.sku].revenue += (it.qty || 0) * (it.price || 0);
          });
        } catch(e){}
      });
      const arr = Object.keys(bySku).map(k => ({ sku: k, ...bySku[k] })).sort((a,b)=> b.qty - a.qty);
      setForecast(arr);
    }).catch(()=> setForecast([]));
  }

  async function saveCustomer() {
    if (!custName || !custPhone) return Alert.alert('Missing', 'Provide name & phone');
    try {
      await addCustomer({ name: custName, phone: custPhone });
      setCustName(''); setCustPhone('');
      loadAll();
      Alert.alert('Saved', 'Customer added');
    } catch (e) { Alert.alert('Error', String(e)); }
  }

  function sendPromoWhatsApp(phone, message) {
    // phone must be international without plus sign, e.g. 919876543210
    const p = phone.replace(/\D/g,'');
    const url = `https://wa.me/${p}?text=${encodeURIComponent(message)}`;
    Linking.canOpenURL(url).then(ok => {
      if (ok) Linking.openURL(url);
      else Alert.alert('WhatsApp not available', 'Please install WhatsApp or check number.');
    });
  }

  // computed totals
  const subtotal = cart.reduce((s,i)=> s + i.price * i.qty, 0);
  const discPercent = clampPercent(invoiceDiscount);
  const discountAmount = subtotal * (discPercent / 100);
  const total = subtotal - discountAmount;

  // UI render helpers
  function SectionHeader({ title }) { return (<View style={{ marginVertical:8 }}><Text style={{ fontSize:18, fontWeight:'bold' }}>{title}</Text></View>); }

  // --- UI ---
  return (
    <SafeAreaView style={{ flex:1 }}>
      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios'?'padding':undefined}>
        <ScrollView contentContainerStyle={{ padding:12 }}>
          {/* Top: quick nav + title + scanner */}
          <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <View style={{ flexDirection:'row' }}>
              <Button title="Billing" onPress={()=> setActiveSection('billing')} />
              <View style={{ width:8 }} />
              <Button title="Inventory" onPress={()=> setActiveSection('inventory')} />
              <View style={{ width:8 }} />
              <Button title="Customers" onPress={()=> setActiveSection('customers')} />
              <View style={{ width:8 }} />
              <Button title="History" onPress={()=> setActiveSection('history')} />
              <View style={{ width:8 }} />
              <Button title="Forecast" onPress={()=> setActiveSection('forecast')} />
            </View>
            <View style={{ alignItems:'center' }}>
              <Text style={{ fontSize:16, fontWeight:'bold' }}>KGF MEN'S WEAR</Text>
              <Text style={{ color:'#666' }}>Billing (single page)</Text>
            </View>
            <View>
              <Button title="Scan" onPress={()=> setScannerVisible(true)} />
            </View>
          </View>

          {/* --- BILLING SECTION (main) --- */}
          {activeSection === 'billing' && (
            <>
              <SectionHeader title="Quick add product (manual)" />
              <View style={{ borderWidth:1, padding:10 }}>
                <TextInput placeholder="SKU / Barcode" value={sku} onChangeText={setSku} style={{ borderWidth:1, padding:8, marginTop:8 }} />
                <TextInput placeholder="Name" value={name} onChangeText={setName} style={{ borderWidth:1, padding:8, marginTop:8 }} />
                <TextInput placeholder="Price" keyboardType="numeric" value={price} onChangeText={setPrice} style={{ borderWidth:1, padding:8, marginTop:8 }} />
                <TextInput placeholder="Qty" keyboardType="numeric" value={qty} onChangeText={setQty} style={{ borderWidth:1, padding:8, marginTop:8 }} />
                <View style={{ flexDirection:'row', marginTop:8 }}>
                  <Button title="Save to inventory" onPress={saveProduct} />
                  <View style={{ width:8 }} />
                  <Button title="Add to cart" onPress={()=> addManualAndToCart(false)} />
                  <View style={{ width:8 }} />
                  <Button title="Save & Add" onPress={()=> addManualAndToCart(true)} />
                </View>
              </View>

              <SectionHeader title="Select customer (optional)" />
              <View style={{ marginBottom:12 }}>
                <FlatList horizontal data={customers} keyExtractor={c=>String(c.id)} renderItem={({item})=>(
                  <TouchableOpacity onPress={()=> setSelectedCustomer(item)} style={{ padding:8, borderWidth:1, marginRight:8, backgroundColor: selectedCustomer?.id === item.id ? '#dfefff' : '#fff' }}>
                    <Text>{item.name}</Text>
                    <Text style={{ fontSize:12 }}>{item.phone}</Text>
                  </TouchableOpacity>
                )} ListEmptyComponent={<Text style={{ color:'#666' }}>No customers</Text>} />
              </View>

              <SectionHeader title="Cart" />
              <View style={{ borderWidth:1, padding:10, marginBottom:12 }}>
                <FlatList data={cart} keyExtractor={i => i.sku+''} renderItem={({item})=>{
                  const lineTotal = item.price * item.qty;
                  const lineAfter = lineTotal * (1 - discPercent/100);
                  return (
                    <View style={{ flexDirection:'row', justifyContent:'space-between', paddingVertical:6 }}>
                      <View style={{ flex:1 }}>
                        <Text>{item.name}</Text>
                        <Text style={{ fontSize:12, color:'#666' }}>{item.sku}</Text>
                      </View>
                      <View style={{ width:160, alignItems:'flex-end' }}>
                        <Text>Price: {currency(item.price)}</Text>
                        <View style={{ flexDirection:'row', alignItems:'center', marginTop:6 }}>
                          <Button title="-" onPress={()=> changeCartQty(item.sku, -1)} />
                          <Text style={{ marginHorizontal:8 }}>{item.qty}</Text>
                          <Button title="+" onPress={()=> changeCartQty(item.sku, +1)} />
                        </View>
                        <Text style={{ marginTop:6 }}>Line: {currency(lineTotal)}</Text>
                        <Text style={{ color:'#007' }}>After disc: {currency(lineAfter)}</Text>
                        <View style={{ height:6 }} />
                        <Button title="Remove" onPress={()=> setCart(prev => prev.filter(p=>p.sku !== item.sku))} />
                      </View>
                    </View>
                  );
                }} ListEmptyComponent={<Text>No items in cart</Text>} />
                <View style={{ height:8 }} />
                <Text>Subtotal: {currency(subtotal)}</Text>
                <TextInput placeholder="Invoice discount %" keyboardType="numeric" value={invoiceDiscount} onChangeText={setInvoiceDiscount} style={{ borderWidth:1, padding:8, marginTop:8 }} />
                <Text>Discount amount: {currency(discountAmount)}</Text>
                <Text style={{ fontWeight:'bold', marginTop:4 }}>Total: {currency(total)}</Text>
                <View style={{ height:8 }} />
                <Button title="Checkout & Print" onPress={checkout} />
              </View>

              <SectionHeader title="Quick inventory (tap to add to cart)" />
              <FlatList data={inventory} keyExtractor={p=>String(p.id)} renderItem={({item})=>(
                <TouchableOpacity onPress={()=> addToCart(item)} style={{ padding:8, borderBottomWidth:1 }}>
                  <Text>{item.name} ({item.sku})</Text>
                  <Text style={{ fontSize:12, color:'#666' }}>Price: {currency(item.price)} · Qty: {item.qty}</Text>
                </TouchableOpacity>
              )} />
            </>
          )}

          {/* --- INVENTORY SECTION --- */}
          {activeSection === 'inventory' && (
            <>
              <SectionHeader title="Inventory Management" />
              <TextInput placeholder="Search by name or SKU" onChangeText={(t)=> {
                // local filtering
                loadAll().then(()=> {
                  // reduce flicker; filtering done here
                  setInventory(prev => prev.filter(p => p.name.toLowerCase().includes(t.toLowerCase()) || (p.sku||'').toLowerCase().includes(t.toLowerCase())));
                });
              }} style={{ borderWidth:1, padding:8, marginBottom:8 }} />
              <FlatList data={inventory} keyExtractor={p=>String(p.id)} renderItem={({item})=>(
                <View style={{ padding:8, borderBottomWidth:1, flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
                  <View>
                    <Text style={{ fontWeight:'bold' }}>{item.name}</Text>
                    <Text style={{ fontSize:12 }}>{item.sku} · {currency(item.price)} · Qty: {item.qty}</Text>
                  </View>
                  <View style={{ flexDirection:'row', alignItems:'center' }}>
                    <Button title="-" onPress={()=> { if(item.qty>0) updateProductQty(item.id, item.qty-1).then(loadAll); }} />
                    <View style={{ width:8 }} />
                    <Button title="+" onPress={()=> updateProductQty(item.id, item.qty+1).then(loadAll)} />
                  </View>
                </View>
              )} ListEmptyComponent={<Text>No products</Text>} />
            </>
          )}

          {/* --- CUSTOMERS SECTION --- */}
          {activeSection === 'customers' && (
            <>
              <SectionHeader title="Customer Management" />
              <TextInput placeholder="Name" value={custName} onChangeText={setCustName} style={{ borderWidth:1, padding:8, marginTop:8 }} />
              <TextInput placeholder="Phone (e.g. 919876543210)" keyboardType="phone-pad" value={custPhone} onChangeText={setCustPhone} style={{ borderWidth:1, padding:8, marginTop:8 }} />
              <View style={{ height:8 }} />
              <Button title="Save Customer" onPress={saveCustomer} />
              <View style={{ height:12 }} />
              <FlatList data={customers} keyExtractor={c=>String(c.id)} renderItem={({item})=>(
                <View style={{ padding:8, borderBottomWidth:1 }}>
                  <Text style={{ fontWeight:'bold' }}>{item.name}</Text>
                  <Text>{item.phone}</Text>
                  <View style={{ flexDirection:'row', marginTop:8 }}>
                    <Button title="Promo via WhatsApp" onPress={()=> sendPromoWhatsApp(item.phone, `Hi ${item.name}, KGF Menswear: new offers for you!`)} />
                  </View>
                </View>
              )} ListEmptyComponent={<Text>No customers</Text>} />
            </>
          )}

          {/* --- HISTORY SECTION --- */}
          {activeSection === 'history' && (
            <>
              <SectionHeader title="Billing History & Filters" />
              <TextInput placeholder="From (YYYY-MM-DD or ISO)" value={histFrom} onChangeText={setHistFrom} style={{ borderWidth:1, padding:8, marginTop:8 }} />
              <TextInput placeholder="To (YYYY-MM-DD or ISO)" value={histTo} onChangeText={setHistTo} style={{ borderWidth:1, padding:8, marginTop:8 }} />
              <TextInput placeholder="Search name / phone / item" value={histTerm} onChangeText={setHistTerm} style={{ borderWidth:1, padding:8, marginTop:8 }} />
              <View style={{ height:8 }} />
              <Button title="Apply Filters" onPress={loadHistory} />
              <View style={{ height:12 }} />
              <FlatList data={history} keyExtractor={s=>String(s.id)} renderItem={({item})=>{
                let items = [];
                try { items = JSON.parse(item.items || '[]'); } catch(e){}
                return (
                  <View style={{ padding:8, borderBottomWidth:1 }}>
                    <Text style={{ fontWeight:'bold' }}>{item.customerName || 'Walk-in'} — {currency(item.total)}</Text>
                    <Text style={{ fontSize:12, color:'#666' }}>{item.createdAt}</Text>
                    <Text numberOfLines={2}>{items.map(it=> `${it.name} x${it.qty}`).join(', ')}</Text>
                  </View>
                );
              }} ListEmptyComponent={<Text>No sales found</Text>} />
            </>
          )}

          {/* --- FORECAST SECTION --- */}
          {activeSection === 'forecast' && (
            <>
              <SectionHeader title="Forecast / Sales Summary" />
              <Text style={{ color:'#666', marginBottom:8 }}>Top selling products by quantity (historical)</Text>
              <FlatList data={forecast} keyExtractor={i=>i.sku} renderItem={({item})=>(
                <View style={{ padding:8, borderBottomWidth:1 }}>
                  <Text>{item.name} ({item.sku})</Text>
                  <Text style={{ fontSize:12 }}>Sold: {item.qty} — Revenue: {currency(item.revenue)}</Text>
                </View>
              )} ListEmptyComponent={<Text>No sales history yet</Text>} />
              <View style={{ height:12 }} />
              <Button title="Refresh Forecast" onPress={computeForecast} />
            </>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* barcode scanner modal */}
      <Modal visible={scannerVisible} animationType="slide">
        <SafeAreaView style={{ flex:1 }}>
          <View style={{ flex:1 }}>
            {hasCameraPerm === false ? (
              <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}><Text>No camera permission</Text></View>
            ) : (
              <BarCodeScanner onBarCodeScanned={({ data }) => handleScanned(data)} style={{ flex:1 }} />
            )}
            <View style={{ padding:12 }}>
              <Button title="Close Scanner" onPress={()=> setScannerVisible(false)} />
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );

  // helper used in quick add: add manual product and optionally save
  async function addManualAndToCart(saveToInventory = false) {
    if (!sku || !name) return Alert.alert('Missing', 'Provide SKU and name');
    const p = { sku: sku.toString(), name: name.trim(), price: parseFloat(price || 0), qty: parseInt(qty || 1) };
    try {
      if (saveToInventory) await addOrUpdateProduct(p);
      addToCart(p);
      setSku(''); setName(''); setPrice(''); setQty('1');
      if (saveToInventory) loadAll();
    } catch (e) { Alert.alert('Error', String(e)); }
  }
}