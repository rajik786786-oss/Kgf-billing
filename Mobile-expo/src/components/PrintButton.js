import React from 'react';
import { Button, Alert } from 'react-native';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export default function PrintButton({ html, fileName = 'invoice.pdf', title='Print / Share' }) {
  const onPress = async () => {
    try {
      const { uri } = await Print.printToFileAsync({ html });
      const dest = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.moveAsync({ from: uri, to: dest });
      if(await Sharing.isAvailableAsync()){
        await Sharing.shareAsync(dest);
      } else {
        Alert.alert('Saved', `Saved to ${dest}`);
      }
    } catch(e){
      Alert.alert('Print error', e.message || String(e));
    }
  };
  return <Button title={title} onPress={onPress} />;
}