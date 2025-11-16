// Minimal desktop prototype with:
// - Local lowdb JSON storage
// - New billing screen with manual discount & GST toggle
// - HID keyboard barcode capture (typical bluetooth/USB scanners)
// - Simple Quagga camera integration via CDN (if online) -- optional

const fs = require('fs');
const path = require('path');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const dbPath = path.join(__dirname, 'data.json');
const adapter = new FileSync(dbPath);
const db = low(adapter);

// defaults
db.defaults({ items: [], customers: [], vendors: [], bills: [], settings: { gstEnabled: true, loyaltyEnabled: true } }).write();

const main = document.getElementById('mainArea');
document.getElementById('newBillBtn').addEventListener('click', showNewBill);
document.getElementById('inventoryBtn').addEventListener('click', showInventory);
document.getElementById('customersBtn').addEventListener('click', showCustomers);
document.getElementById('vendorsBtn').addEventListener('click', showVendors);
document.getElementById('reportsBtn').addEventListener('click', showReports);

let currentBillLines = [];

function showNewBill(){
  main.innerHTML = `
    <h2>New Billing</h2>
    <div>
      <label>Customer: <input id="customerSearch" placeholder="Select or add customer"></label>
      <label>Scan/Barcode: <input id="barcodeInput" placeholder="Scan or type barcode"></label>
      <button id="addByBarcode">Add</button>
      <button id="startCamScan">Start Camera Scan</button>
    </div>
    <table id="billTable"><thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Discount</th><th>GST</th><th>Total</th><th></th></tr></thead><tbody></tbody></table>
    <div>
      <label>Manual Discount: <input id="manualDiscount" type="number" value="0"></label>
      <label>GST Toggle: <input id="gstToggle" type="checkbox"></label>
      <button id="saveBill">Save Bill</button>
    </div>
    <div id="billSummary"></div>
  `;
  document.getElementById('addByBarcode').addEventListener('click', ()=> {
    const code = document.getElementById('barcodeInput').value.trim();
    if(!code) return alert('Enter barcode');
    addBarcodeToBill(code);
  });
  document.getElementById('saveBill').addEventListener('click', saveBill);
  const gstToggle = document.getElementById('gstToggle');
  gstToggle.checked = db.get('settings.gstEnabled').value();
  gstToggle.addEventListener('change', (e)=> db.set('settings.gstEnabled', e.target.checked).write());

  document.getElementById('startCamScan').addEventListener('click', ()=> {
    startCameraScan(addBarcodeToBill);
  });

  renderBill([]);
}

// render table rows for currentBillLines
function renderBill(lines){
  currentBillLines = lines;
  const tbody = document.querySelector('#billTable tbody');
  tbody.innerHTML = '';
  lines.forEach((l, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${l.name}</td><td><input class="qty" data-idx="${idx}" value="${l.qty}"></td><td>${l.rate.toFixed(2)}</td><td><input class="disc" data-idx="${idx}" value="${l.disc}"></td><td>${l.gst}%</td><td class="lineTotal">${(l.qty*l.rate*(1-l.disc/100)*(1+(l.gst/100))).toFixed(2)}</td><td><button data-remove="${idx}">X</button></td>`;
    tbody.appendChild(tr);
  });

  // wire events
  tbody.querySelectorAll('[data-remove]').forEach(btn=> btn.addEventListener('click', (e)=> {
    const idx = Number(e.target.getAttribute('data-remove'));
    currentBillLines.splice(idx,1);
    renderBill(currentBillLines);
  }));
  tbody.querySelectorAll('.qty').forEach(inp=> inp.addEventListener('input', (e)=> {
    const i = Number(e.target.dataset.idx); currentBillLines[i].qty = Number(e.target.value)||0; renderBill(currentBillLines);
  }));
  tbody.querySelectorAll('.disc').forEach(inp=> inp.addEventListener('input', (e)=> {
    const i = Number(e.target.dataset.idx); currentBillLines[i].disc = Number(e.target.value)||0; renderBill(currentBillLines);
  }));

  updateBillSummary();
}

function updateBillSummary(){
  const rows = document.querySelectorAll('#billTable tbody tr');
  let subtotal=0, gstTotal=0;
  rows.forEach(r=>{
    const qty = Number(r.querySelector('.qty').value)||0;
    const rate = Number(r.children[2].innerText)||0;
    const disc = Number(r.querySelector('.disc').value)||0;
    const gst = Number(r.children[4].innerText.replace('%',''))||0;
    const line = qty*rate*(1-disc/100);
    subtotal += line;
    gstTotal += line*(gst/100);
    r.querySelector('.lineTotal').innerText = (line*(1+gst/100)).toFixed(2);
  });
  const manualDisc = Number(document.getElementById('manualDiscount') ? document.getElementById('manualDiscount').value : 0) || 0;
  const total = subtotal - manualDisc + gstTotal;
  document.getElementById('billSummary').innerText = `Subtotal: ${subtotal.toFixed(2)} | GST: ${gstTotal.toFixed(2)} | Manual Discount: ${manualDisc.toFixed(2)} | Total: ${total.toFixed(2)}`;
}

function saveBill(){
  const rows = document.querySelectorAll('#billTable tbody tr');
  if(rows.length===0) return alert('No items');
  const lines = [];
  rows.forEach((r, idx) => {
    const name = r.children[0].innerText;
    const qty = Number(r.querySelector('.qty').value)||0;
    const rate = Number(r.children[2].innerText)||0;
    const disc = Number(r.querySelector('.disc').value)||0;
    const gst = Number(r.children[4].innerText.replace('%',''))||0;
    lines.push({name, qty, rate, disc, gst});
  });
  const manualDisc = Number(document.getElementById('manualDiscount').value)||0;
  const bill = { id: Date.now(), date: new Date().toISOString(), lines, manualDisc };
  db.get('bills').push(bill).write();
  alert('Bill saved. ID: ' + bill.id);
}

// inventory screen
function showInventory(){
  const items = db.get('items').value();
  main.innerHTML = `<h2>Inventory</h2><div><button id="addItem">Add Item</button></div><table><thead><tr><th>Name</th><th>Barcode</th><th>Rate</th><th>GST</th><th>Stock</th><th></th></tr></thead><tbody>${items.map((it,idx)=>`<tr><td>${it.name}</td><td>${it.barcode}</td><td>${it.rate}</td><td>${it.gst||0}</td><td>${it.stock||0}</td><td><button data-idx="${idx}" class="del">Del</button></td></tr>`).join('')}</tbody></table>`;
  document.getElementById('addItem').addEventListener('click', ()=>{
    const name = prompt('Item name'); if(!name) return;
    const barcode = prompt('Barcode/code') || '';
    const rate = Number(prompt('Rate')||0);
    const gst = Number(prompt('GST percent')||0);
    const stock = Number(prompt('Stock qty')||0);
    db.get('items').push({ name, barcode, rate, gst, stock }).write();
    showInventory();
  });
  document.querySelectorAll('.del').forEach(btn=> btn.addEventListener('click', e=>{
    const idx = Number(e.target.dataset.idx);
    const item = db.get('items').value()[idx];
    db.get('items').remove({ barcode: item.barcode }).write();
    showInventory();
  }));
}

// customers screen
function showCustomers(){
  const customers = db.get('customers').value();
  main.innerHTML = `<h2>Customers</h2><div><button id="addCust">Add Customer</button></div><table><thead><tr><th>Name</th><th>Phone</th><th>LoyaltyPts</th></tr></thead><tbody>${customers.map(c=>`<tr><td>${c.name}</td><td>${c.phone}</td><td>${c.points||0}</td></tr>`).join('')}</tbody></table>`;
  document.getElementById('addCust').addEventListener('click', ()=>{
    const name = prompt('Name'); if(!name) return;
    const phone = prompt('Phone')||'';
    db.get('customers').push({ name, phone, points:0 }).write();
    showCustomers();
  });
}

// vendors
function showVendors(){
  const vendors = db.get('vendors').value();
  main.innerHTML = `<h2>Vendors</h2><div><button id="addVend">Add Vendor</button></div><table><thead><tr><th>Name</th><th>Contact</th></tr></thead><tbody>${vendors.map(v=>`<tr><td>${v.name}</td><td>${v.contact}</td></tr>`).join('')}</tbody></table>`;
  document.getElementById('addVend').addEventListener('click', ()=>{
    const name = prompt('Vendor name'); if(!name) return;
    const contact = prompt('Contact')||'';
    db.get('vendors').push({ name, contact }).write();
    showVendors();
  });
}

// reports
function showReports(){
  const bills = db.get('bills').value();
  main.innerHTML = `<h2>Reports</h2><div>Total Bills: ${bills.length}</div><div><button id="exportBills">Export Bills (JSON)</button></div>`;
  document.getElementById('exportBills').addEventListener('click', ()=>{
    const p = path.join(__dirname, 'bills_export.json');
    fs.writeFileSync(p, JSON.stringify(bills, null, 2));
    alert('Exported to ' + p);
  });
}

// HID keyboard barcode capture: capture quick typed sequences + Enter
(function setupHIDCapture(){
  let buffer = '';
  let last = Date.now();
  window.addEventListener('keydown', (e) => {
    const now = Date.now();
    if(now - last > 1000) buffer = '';
    last = now;
    if(e.key === 'Enter'){
      const code = buffer.trim();
      buffer = '';
      if(code) addBarcodeToBill(code);
    } else if(e.key.length === 1){
      buffer += e.key;
    }
  });
})();

// camera scanning (Quagga) runtime init: opens a small preview and calls callback(code)
function startCameraScan(onDetected){
  // If Quagga is available globally (via CDN), use it. Otherwise tell user to use a camera scanner tool.
  if(typeof window.Quagga !== 'undefined'){
    const preview = document.createElement('div');
    preview.id = 'cameraPreview';
    preview.style = 'width:100%;height:320px;border:1px solid #ccc;margin-top:10px';
    document.getElementById('mainArea').appendChild(preview);
    Quagga.init({
      inputStream : { name : "Live", type : "LiveStream", target: '#cameraPreview', constraints: { facingMode: "environment" } },
      decoder : { readers : ["code_128_reader","ean_reader","ean_8_reader","upc_reader","upc_e_reader","code_39_reader"] }
    }, function(err) {
        if (err) { alert('Quagga init error: ' + err); return }
        Quagga.start();
    });
    Quagga.onDetected(data => {
      const code = data.codeResult.code;
      if(onDetected) onDetected(code);
    });
  } else {
    alert('Camera scanning requires Quagga (not bundled). Use a hardware scanner or add Quagga to index.html.');
  }
}

// Add barcode by code: lookup item and add/update bill lines
function addBarcodeToBill(code){
  const item = db.get('items').find({ barcode: String(code) }).value();
  if(!item){
    return alert('Item with barcode ' + code + ' not found.');
  }
  // Look for existing row in currentBillLines
  let found = false;
  for(let i=0;i<currentBillLines.length;i++){
    if(currentBillLines[i].name === item.name){
      currentBillLines[i].qty += 1;
      found = true; break;
    }
  }
  if(!found){
    currentBillLines.push({ name: item.name, qty:1, rate: item.rate, disc:0, gst: item.gst||0 });
  }
  renderBill(currentBillLines);
}

// initial view
showNewBill();
