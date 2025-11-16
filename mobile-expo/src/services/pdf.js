// src/services/pdf.js
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';

function currency(n) {
  return '₹' + (Number(n) || 0).toFixed(2);
}

export function generateInvoiceHtml({ shop = {}, customer = {}, items = [], invoiceMeta = {} }) {
  const { invoiceNo, date } = invoiceMeta;
  const rows = items.map(it => `
    <tr>
      <td style="padding:6px;border:1px solid #ddd">${it.name}</td>
      <td style="padding:6px;border:1px solid #ddd;text-align:center">${it.qty}</td>
      <td style="padding:6px;border:1px solid #ddd;text-align:right">${currency(it.price)}</td>
      <td style="padding:6px;border:1px solid #ddd;text-align:right">${it.discount ?? 0}%</td>
      <td style="padding:6px;border:1px solid #ddd;text-align:right">${currency(it.subtotal)}</td>
    </tr>
  `).join('');

  const subtotal = items.reduce((s, i) => s + (Number(i.subtotal) || 0), 0);
  const grand = subtotal;

  return `
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <style>
        body { font-family: Arial, Helvetica, sans-serif; padding: 12px; color:#111 }
        h1,h2,h3{ margin:0; padding:0 }
        table { width:100%; border-collapse:collapse; margin-top:12px; }
        th { text-align:left; padding:8px; border:1px solid #ddd; background:#f6f6f6 }
        td { font-size:13px }
      </style>
    </head>
    <body>
      <h2>${shop.name || "KGF MEN'S WEAR"}</h2>
      <div>${shop.address || ''}</div>
      <div style="margin-top:8px;">
        <strong>Invoice:</strong> ${invoiceNo || ''} &nbsp;&nbsp;
        <strong>Date:</strong> ${date || new Date().toLocaleString()}
      </div>

      <div style="margin-top:8px;">
        <strong>Customer:</strong> ${customer.name || '-'}<br/>
        <strong>Phone:</strong> ${customer.phone || '-'}
      </div>

      <table>
        <thead>
          <tr>
            <th style="width:50%">Item</th>
            <th style="width:10%;text-align:center">Qty</th>
            <th style="width:15%;text-align:right">Price</th>
            <th style="width:12%;text-align:right">Disc</th>
            <th style="width:15%;text-align:right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <div style="margin-top:12px; text-align:right;">
        <div>Subtotal: ${currency(subtotal)}</div>
        <h3>Total: ${currency(grand)}</h3>
      </div>

      <div style="margin-top:20px; font-size:12px; color:#666">
        Thank you for shopping with us.
      </div>
    </body>
  </html>
  `;
}

/**
 * Create PDF file from invoice data and save to FileSystem.documentDirectory/invoices/
 * Returns saved file path (URI).
 */
export async function createInvoicePdfAndSave({ shop, customer, items, invoiceMeta }) {
  const html = generateInvoiceHtml({ shop, customer, items, invoiceMeta });
  // create PDF in a temp location
  const { uri } = await Print.printToFileAsync({ html });
  // ensure invoices directory exists
  const invoicesDir = `${FileSystem.documentDirectory}invoices`;
  try {
    const stat = await FileSystem.getInfoAsync(invoicesDir);
    if (!stat.exists) await FileSystem.makeDirectoryAsync(invoicesDir, { intermediates: true });
  } catch (e) {
    // ignore
  }
  const dest = `${invoicesDir}/invoice-${Date.now()}.pdf`;
  // move temp pdf to persistent location
  await FileSystem.copyAsync({ from: uri, to: dest });
  // optional: delete temp uri (platform may manage)
  return dest;
}