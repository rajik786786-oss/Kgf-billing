import * as SQLite from 'expo-sqlite';
const db = SQLite.openDatabase('kgf-billing.db');

export function init() {
  db.transaction(tx => {
    tx.executeSql('CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, name TEXT, phone TEXT);');
    tx.executeSql('CREATE TABLE IF NOT EXISTS inventory (id TEXT PRIMARY KEY, name TEXT, qty INT);');
    tx.executeSql('CREATE TABLE IF NOT EXISTS invoices (id TEXT PRIMARY KEY, json TEXT);');
  });
}

export function saveInvoice(id, jsonStr, cb) {
  db.transaction(tx => {
    tx.executeSql('INSERT OR REPLACE INTO invoices (id,json) VALUES (?,?)', [id, jsonStr], (_,r)=> cb && cb(null,r), (_,e)=> cb && cb(e));
  });
}

export function getInvoices(cb) {
  db.transaction(tx => {
    tx.executeSql('SELECT * FROM invoices ORDER BY rowid DESC', [], (_, { rows }) => {
      cb && cb(null, rows._array);
    }, (_,e) => { cb && cb(e); });
  });
}