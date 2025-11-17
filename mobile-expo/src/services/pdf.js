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
 * Returns an object: { fileUri } on success, or throws an Error on failure.
 */
export async function createInvoicePdfAndSave({ shop = {}, customer = {}, items = [], invoiceMeta = {} }) {
  if (!FileSystem.documentDirectory) {
    // This should not happen on real mobile devices, but guard it.
    throw new Error('FileSystem.documentDirectory is not available on this platform.');
  }

  const html = generateInvoiceHtml({ shop, customer, items, invoiceMeta });

  try {
    // printToFileAsync writes a temp PDF. result usually = { uri: 'file:///...' }
    const result = await Print.printToFileAsync({ html });
    const tempUri = (result && (result.uri || result.file || result.path)) ? (result.uri || result.file || result.path) : null;
    if (!tempUri) throw new Error('printToFileAsync did not return a file URI.');

    const invoicesDir = `${FileSystem.documentDirectory}invoices`;
    // ensure invoices directory exists
    try {
      const stat = await FileSystem.getInfoAsync(invoicesDir);
      if (!stat.exists) {
        await FileSystem.makeDirectoryAsync(invoicesDir, { intermediates: true });
      }
    } catch (e) {
      // if directory creation fails, still surface a meaningful error later
      console.warn('Could not verify/create invoices dir:', e);
    }

    const dest = `${invoicesDir}/invoice-${Date.now()}.pdf`;

    // copy temp PDF to persistent destination
    try {
      await FileSystem.copyAsync({ from: tempUri, to: dest });
    } catch (copyErr) {
      // fallback: try move (some platforms support move)
      try {
        await FileSystem.moveAsync({ from: tempUri, to: dest });
      } catch (moveErr) {
        // if both fail, surface the original copy error
        throw copyErr;
      }
    }

    // success: return object with consistent shape
    return { fileUri: dest };
  } catch (err) {
    console.error('createInvoicePdfAndSave error:', err);
    throw err;
  }
}
