// src/components/PrintButton.js
import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';

export default function PrintButton({ label = 'Print / Save PDF', onPress, working = false }) {
  return (
    <TouchableOpacity
      style={[styles.btn, working ? styles.btnWorking : null]}
      onPress={onPress}
      disabled={working}
    >
      {working ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#2b6cb0',
    alignItems: 'center',
    marginVertical: 8,
  },
  btnWorking: {
    opacity: 0.6,
  },
  label: {
    color: '#fff',
    fontWeight: '600',
  },
});
