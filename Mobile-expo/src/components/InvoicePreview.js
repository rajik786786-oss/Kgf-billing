import React from 'react';
import { View, Text } from 'react-native';

export default function InvoicePreview({ invoice }) {
  return (
    <View style={{ padding:12 }}>
      <Text style={{ fontWeight:'700' }}>Invoice: {invoice.id}</Text>
      <Text>Date: {invoice.date}</Text>
      <Text>Customer: {invoice.customer?.name} - {invoice.customer?.phone}</Text>
      {invoice.rows.map((r, idx)=> (
        <Text key={r.id}>{idx+1}. {r.name} x {r.qty} @ {r.price} (-{r.discount}%)</Text>
      ))}
      <Text>Total: {invoice.totals.total.toFixed(2)}</Text>
    </View>
  );
}

// helper to render HTML for pdf generation
export function renderHtml(invoice) {
  const rows = invoice.rows.map(r=> `
    <tr>
      <td style="padding:6px;border:1px solid #ddd">${r.name}</td>
      <td style="padding:6px;border:1px solid #ddd">${r.qty}</td>
      <td style="padding:6px;border:1px solid #ddd">${Number(r.price).toFixed(2)}</td>
      <td style="padding:6px;border:1px solid #ddd">${r.discount}%</td>
      <td style="padding:6px;border:1px solid #ddd">${(Number(r.price)*(1 - (Number(r.discount)||0)/100)*Number(r.qty)).toFixed(2)}</td>
    </tr>
  `).join('');
  return `
  <html>
    <body>
      <h2>KGF MEN'S WEAR - Invoice</h2>
      <div>Invoice: ${invoice.id}</div>
      <div>Date: ${invoice.date}</div>
      <div>Customer: ${invoice.customer?.name || ''} ${invoice.customer?.phone || ''}</div>
      <table style="width:100%;border-collapse:collapse;margin-top:12px">
        <thead>
          <tr>
            <th style="border:1px solid #ddd;padding:6px">Name</th>
            <th style="border:1px solid #ddd;padding:6px">Qty</th>
            <th style="border:1px solid #ddd;padding:6px">Price</th>
            <th style="border:1px solid #ddd;padding:6px">Disc</th>
            <th style="border:1px solid #ddd;padding:6px">Line total</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <div style="margin-top:12px">Total: ${invoice.totals.total.toFixed(2)}</div>
    </body>
  </html>
  `;
}

// default export helper for usage
InvoicePreview.renderHtml = renderHtml;