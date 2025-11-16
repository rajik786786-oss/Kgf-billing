import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView, View, Text, TextInput, Button, TouchableOpacity, FlatList, Alert, Modal, Linking, ScrollView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import { BarCodeScanner } from 'expo-barcode-scanner';
import * as Sharing from 'expo-sharing';

// ---- Helpers ----
const STORAGE_KEYS = {
  PRODUCTS: '@kgf_products',
  CUSTOMERS: '@kgf_customers',
  HISTORY: '@kgf_history',
  INVENTORY: '@kgf_inventory'
};

function formatCurrency(n) {
  return parseFloat(n || 0).toFixed(2);
}

// ---- Main App ----
export default function App() {
  const [permission, setPermission] = useState(null);

  // Billing line inputs
  const [lines, setLines] = useState([
    { id: Date.now().toString(), name: '', price: '', qty: '1', discount: '0', barcode: '' }
  ]);

  // Inventory & customers
  const [inventory, setInventory] = useState({});
  const [customers, setCustomers] = useState([]);
  const [history, setHistory] = useState([]);

  // UI modals
  const [showScanner, setShowScanner] = useState(false);
  const [scannerTargetIndex, setScannerTargetIndex] = useState(null);

  // filters / screens
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showCustomersModal, setShowCustomersModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // customer selection for invoice sending
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Load storage
  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setPermission(status === 'granted');

      try {
        const p = await AsyncStorage.getItem(STORAGE_KEYS.PRODUCTS);
        const inv = await AsyncStorage.getItem(STORAGE_KEYS.INVENTORY);
        const c = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOMERS);
        const h = await AsyncStorage.getItem(STORAGE_KEYS.HISTORY);
        if (p) {/*not used directly*/ }
        if (inv) setInventory(JSON.parse(inv));
        if (c) setCustomers(JSON.parse(c));
        if (h) setHistory(JSON.parse(h));
      } catch (e) {
        console.log('load error', e);
      }
    })();
  }, []);

  // ----- billing operations -----
  function updateLine(id, patch) {
    setLines(ls => ls.map(l => (l.id === id ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines(ls => [...ls, { id: Date.now().toString(), name: '', price: '', qty: '1', discount: '0', barcode: '' }]);
  }
  function removeLine(id) {
    setLines(ls => ls.filter(l => l.id !== id));
  }

  function calcLineTotal(l) {
    const price = parseFloat(l.price || 0);
    const qty = parseFloat(l.qty || 0);
    const discount = parseFloat(l.discount || 0);
    const totalBefore = price * qty;
    const after = totalBefore - (totalBefore * discount / 100);
    return Math.max(0, after);
  }

  function calcInvoiceTotal() {
    return lines.reduce((s, l) => s + calcLineTotal(l), 0);
  }

  async function saveToHistory(invoice) {
    const newHistory = [invoice, ...history];
    setHistory(newHistory);
    await AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(newHistory));
  }

  // Save inventory & customers helpers
  async function saveInventory(newInv) {
    setInventory(newInv);
    await AsyncStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(newInv));
  }
  async function saveCustomers(newCustomers) {
    setCustomers(newCustomers);
    await AsyncStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(newCustomers));
  }

  // Create invoice (generate PDF, save file, optionally print/share)
  async function createInvoiceAndSave({ customer = null } = {}) {
    const now = new Date().toISOString();
    const items = lines.map(l => ({
      name: l.name || 'Item',
      price: formatCurrency(l.price || 0),
      qty: l.qty,
      discount: l.discount,
      subtotal: formatCurrency(calcLineTotal(l))
    }));
    const total = formatCurrency(calcInvoiceTotal());

    const html = `
      <html>
        <head><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>
        <body>
          <h2>KGF MEN'S WEAR - Invoice</h2>
          <div>Date: ${new Date().toLocaleString()}</div>
          <div>Customer: ${customer?.name || '-'}</div>
          <div>Phone: ${customer?.phone || '-'}</div>
          <table style="width:100%; border-collapse:collapse; margin-top:10px;">
            <thead><tr>
              <th style="border:1px solid #ccc;padding:6px">Item</th>
              <th style="border:1px solid #ccc;padding:6px">Qty</th>
              <th style="border:1px solid #ccc;padding:6px">Price</th>
              <th style="border:1px solid #ccc;padding:6px">Discount%</th>
              <th style="border:1px solid #ccc;padding:6px">Total</th>
            </tr></thead>
            <tbody>
              ${items.map(it => `
                <tr>
                  <td style="border:1px solid #eee;padding:6px">${it.name}</td>
                  <td style="border:1px solid #eee;padding:6px">${it.qty}</td>
                  <td style="border:1px solid #eee;padding:6px">${it.price}</td>
                  <td style="border:1px solid #eee;padding:6px">${it.discount}</td>
                  <td style="border:1px solid #eee;padding:6px">${it.subtotal}</td>
                </tr>`).join('')}
            </tbody>
          </table>
          <h3>Total: ${total}</h3>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      // save to device FS
      const dest = `${FileSystem.documentDirectory}invoices/invoice-${Date.now()}.pdf`;
      await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}invoices`, { intermediates: true });
      await FileSystem.copyAsync({ from: uri, to: dest });
      // Add to history
      const invoiceRecord = { id: Date.now().toString(), date: now, customer, items, total, file: dest };
      await saveToHistory(invoiceRecord);
      Alert.alert('Invoice created', `Saved to ${dest}`);
      return dest;
    } catch (e) {
      Alert.alert('Create PDF failed', e.message);
      console.log(e);
    }
  }

  // Share/print invoice
  async function shareInvoice(fileUri) {
    if (!fileUri) return Alert.alert('No file');
    if (Platform.OS === 'web') return Alert.alert('Not supported on web');
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri);
    } else {
      // fallback: open print dialog
      await Print.printAsync({ uri: fileUri });
    }
  }

  // Whatsapp message quick send
  async function sendWhatsApp(phone, message) {
    if (!phone) return Alert.alert('Customer has no phone');
    const text = encodeURIComponent(message);
    const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${text}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Cannot open WhatsApp');
    }
  }

  // ----- Barcode scanner handling -----
  const handleBarCodeScanned = ({ data }) => {
    setShowScanner(false);
    setPermission(true);
    if (scannerTargetIndex == null) return;
    // lookup inventory by barcode
    const found = Object.values(inventory).find(i => i.barcode === data);
    if (found) {
      updateLine(scannerTargetIndex, {
        name: found.name,
        price: String(found.price),
        qty: '1',
        barcode: found.barcode
      });
    } else {
      // insert as new product with scanned barcode
      updateLine(scannerTargetIndex, { barcode: data, name: `Scanned ${data}`, price: '0', qty: '1' });
      Alert.alert('Barcode scanned', 'No inventory match. You can edit name/price.');
    }
  };

  // ----- Inventory & customers UI actions -----
  async function addInventoryItem({ barcode, name, price, qty }) {
    const key = barcode || `sku-${Date.now()}`;
    const newInv = { ...inventory, [key]: { barcode, name, price: parseFloat(price || 0), qty: parseInt(qty || 0) } };
    await saveInventory(newInv);
    Alert.alert('Inventory saved');
  }

  async function addCustomer({ name, phone }) {
    const newCustomers = [{ id: Date.now().toString(), name, phone }, ...customers];
    await saveCustomers(newCustomers);
    Alert.alert('Customer saved');
  }

  // Save inventory qty after sale
  async function deductInventoryAfterSale() {
    const newInv = { ...inventory };
    for (const l of lines) {
      if (!l.barcode) continue;
      const key = l.barcode;
      const cur = newInv[key];
      if (cur) {
        cur.qty = Math.max(0, (cur.qty || 0) - parseInt(l.qty || 0));
      }
    }
    await saveInventory(newInv);
  }

  // Finalize sale: create invoice, save PDF, deduct inventory, optionally send whatsapp
  async function finalizeSale(sendWhats = false, whatsappMsg = '') {
    if (lines.length === 0) return Alert.alert('Empty bill');
    const file = await createInvoiceAndSave({ customer: selectedCustomer });
    await deductInventoryAfterSale();
    // clear lines
    setLines([{ id: Date.now().toString(), name: '', price: '', qty: '1', discount: '0', barcode: '' }]);
    if (sendWhats && selectedCustomer?.phone) {
      const msg = whatsappMsg || `Thanks ${selectedCustomer?.name || ''}, your invoice total is ${formatCurrency(calcInvoiceTotal())}`;
      sendWhatsApp(selectedCustomer.phone, msg);
    }
    if (file) {
      // open share/print dialog
      shareInvoice(file);
    }
  }

  // History filters helper (simple)
  function filterHistory({ text, year }) {
    let list = history;
    if (text) {
      const q = text.toLowerCase();
      list = list.filter(h => (h.customer?.name || '').toLowerCase().includes(q) || (h.customer?.phone || '').includes(q));
    }
    if (year) {
      list = list.filter(h => new Date(h.date).getFullYear() === parseInt(year));
    }
    return list;
  }

  // UI renderers
  function renderLine({ item }) {
    return (
      <View style={{ borderBottomWidth: 1, borderColor: '#eee', padding: 8 }}>
        <TextInput
          placeholder="Product name"
          value={item.name}
          onChangeText={t => updateLine(item.id, { name: t })}
          style={{ borderWidth: 1, padding: 6, marginBottom: 6 }}
        />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <TextInput style={{ flex: 1, borderWidth: 1, padding: 6, marginRight: 6 }} placeholder="Price" keyboardType="numeric" value={String(item.price)} onChangeText={t => updateLine(item.id, { price: t })} />
          <TextInput style={{ width: 80, borderWidth: 1, padding: 6, marginRight: 6 }} placeholder="Qty" keyboardType="numeric" value={String(item.qty)} onChangeText={t => updateLine(item.id, { qty: t })} />
          <TextInput style={{ width: 80, borderWidth: 1, padding: 6 }} placeholder="Discount%" keyboardType="numeric" value={String(item.discount)} onChangeText={t => updateLine(item.id, { discount: t })} />
        </View>
        <View style={{ height: 8 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text>Total: {formatCurrency(calcLineTotal(item))}</Text>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity onPress={() => { setScannerTargetIndex(item.id); setShowScanner(true); }} style={{ marginRight: 10 }}>
              <Text style={{ color: 'blue' }}>Scan Barcode</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => removeLine(item.id)}>
              <Text style={{ color: 'red' }}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ---- UI ----
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ padding: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 6 }}>KGF MEN'S WEAR — Billing</Text>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Button title="Inventory" onPress={() => setShowInventoryModal(true)} />
          <Button title="Customers" onPress={() => setShowCustomersModal(true)} />
          <Button title="History" onPress={() => setShowHistoryModal(true)} />
        </View>

        <FlatList data={lines} keyExtractor={i => i.id} renderItem={renderLine} style={{ height: 350 }} />

        <View style={{ height: 10 }} />
        <Button title="Add Product Line" onPress={addLine} />
        <View style={{ height: 12 }} />

        <Text style={{ fontSize: 18 }}>Invoice Total: {formatCurrency(calcInvoiceTotal())}</Text>
        <View style={{ height: 8 }} />

        <Text style={{ marginBottom: 6 }}>Select Customer (optional)</Text>
        <ScrollView horizontal style={{ marginBottom: 8 }}>
          <TouchableOpacity onPress={() => { setSelectedCustomer(null); Alert.alert('Customer cleared'); }} style={{ padding: 8, borderWidth: 1, marginRight: 8 }}>
            <Text>Walk-in</Text>
          </TouchableOpacity>
          {customers.map(c => (
            <TouchableOpacity key={c.id} onPress={() => { setSelectedCustomer(c); Alert.alert('Selected', c.name); }} style={{ padding: 8, borderWidth: 1, marginRight: 8 }}>
              <Text>{c.name} ({c.phone})</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Button title="Finalize & Save PDF" onPress={() => finalizeSale(false)} />
          <Button title="Finalize & WhatsApp" onPress={() => finalizeSale(true)} />
        </View>
      </View>

      {/* Barcode Scanner Modal */}
      <Modal visible={showScanner} animationType="slide">
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flex: 1 }}>
            {permission === false ? <Text>No camera permission</Text> : (
              <>
                <BarCodeScanner onBarCodeScanned={handleBarCodeScanned} style={{ flex: 1 }} />
                <Button title="Close" onPress={() => setShowScanner(false)} />
              </>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Inventory modal (simple add / list) */}
      <Modal visible={showInventoryModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, padding: 12 }}>
          <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>Inventory</Text>
          <InventoryManager inventory={inventory} onSave={addInventoryItem} onClose={() => setShowInventoryModal(false)} />
        </SafeAreaView>
      </Modal>

      {/* Customers modal */}
      <Modal visible={showCustomersModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, padding: 12 }}>
          <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>Customers</Text>
          <CustomerManager customers={customers} onAdd={addCustomer} onClose={() => setShowCustomersModal(false)} />
        </SafeAreaView>
      </Modal>

      {/* History modal */}
      <Modal visible={showHistoryModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, padding: 12 }}>
          <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>Billing History</Text>
          <FlatList data={history} keyExtractor={h => h.id} renderItem={({ item }) => (
            <View style={{ padding: 8, borderBottomWidth: 1 }}>
              <Text>Date: {new Date(item.date).toLocaleString()}</Text>
              <Text>Customer: {item.customer?.name || 'Walk-in'}</Text>
              <Text>Total: {item.total}</Text>
              <View style={{ flexDirection: 'row', marginTop: 6 }}>
                <Button title="Open PDF" onPress={() => shareInvoice(item.file)} />
              </View>
            </View>
          )} />
          <View style={{ height: 12 }} />
          <Button title="Close" onPress={() => setShowHistoryModal(false)} />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// --- InventoryManager component ---
function InventoryManager({ inventory = {}, onSave, onClose }) {
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState('');

  return (
    <View style={{ flex: 1 }}>
      <TextInput placeholder="Barcode (optional)" value={barcode} onChangeText={setBarcode} style={{ borderWidth: 1, padding: 6, marginBottom: 6 }} />
      <TextInput placeholder="Name" value={name} onChangeText={setName} style={{ borderWidth: 1, padding: 6, marginBottom: 6 }} />
      <TextInput placeholder="Price" value={price} keyboardType="numeric" onChangeText={setPrice} style={{ borderWidth: 1, padding: 6, marginBottom: 6 }} />
      <TextInput placeholder="Quantity" value={qty} keyboardType="numeric" onChangeText={setQty} style={{ borderWidth: 1, padding: 6, marginBottom: 6 }} />
      <Button title="Save Item" onPress={() => {
        if (!name) return Alert.alert('Name required');
        onSave({ barcode, name, price: parseFloat(price || 0), qty: parseInt(qty || 0) });
        setBarcode(''); setName(''); setPrice(''); setQty('');
      }} />
      <View style={{ height: 12 }} />
      <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>Existing inventory</Text>
      <FlatList data={Object.values(inventory)} keyExtractor={(it, idx) => (it.barcode || idx).toString()} renderItem={({ item }) => (
        <View style={{ padding: 8, borderBottomWidth: 1 }}>
          <Text>{item.name} - {item.qty} pcs - ₹{item.price}</Text>
          <Text>Barcode: {item.barcode || '-'}</Text>
        </View>
      )} />
      <View style={{ height: 12 }} />
      <Button title="Close" onPress={onClose} />
    </View>
  );
}

// --- CustomerManager component ---
function CustomerManager({ customers = [], onAdd, onClose }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  return (
    <View style={{ flex: 1 }}>
      <TextInput placeholder="Customer Name" value={name} onChangeText={setName} style={{ borderWidth: 1, padding: 6, marginBottom: 6 }} />
      <TextInput placeholder="Phone" value={phone} keyboardType="phone-pad" onChangeText={setPhone} style={{ borderWidth: 1, padding: 6, marginBottom: 6 }} />
      <Button title="Add Customer" onPress={() => {
        if (!name || !phone) return Alert.alert('Name and phone required');
        onAdd({ name, phone });
        setName(''); setPhone('');
      }} />
      <View style={{ height: 12 }} />
      <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>Saved customers</Text>
      <FlatList data={customers} keyExtractor={c => c.id} renderItem={({ item }) => (
        <View style={{ padding: 8, borderBottomWidth: 1 }}>
          <Text>{item.name} - {item.phone}</Text>
        </View>
      )} />
      <View style={{ height: 12 }} />
      <Button title="Close" onPress={onClose} />
    </View>
  );
}