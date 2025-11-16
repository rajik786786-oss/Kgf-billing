// src/components/PrintButton.js
import React, { useState } from 'react';
import { Button, Alert } from 'react-native';
import * as Sharing from 'expo-sharing';
import { createInvoicePdfAndSave } from '../services/pdf';

export default function PrintButton({ shop = {}, customer = {}, items = [], invoiceMeta = {}, onDone }) {
  const [working, setWorking] = useState(false);

  const handlePrint = async () => {
    if (!items || items.length === 0) return Alert.alert('No items', 'Add items before printing');
    setWorking(true);
    try {
      const fileUri = await createInvoicePdfAndSave({ shop, customer, items, invoiceMeta });
      // Try to share if available
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Saved', `PDF saved to: ${fileUri}`);
      }
      if (typeof onDone === 'function') onDone(fileUri);
    } catch (e) {
      console.error(e);
      Alert.alert('Print failed', e.message || String(e));
    } finally {
      setWorking(false);
    }
  };

  return <Button title={working ? 'Processing...' : 'Print / Share Invoice'} onPress={handlePrint} disabled={working} />;
}