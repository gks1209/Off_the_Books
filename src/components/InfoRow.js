import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import C from '../theme/colors';

export const InfoRow = ({ label, value, valueColor }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={[styles.infoValue, valueColor && { color: valueColor }]} numberOfLines={2}>
      {value || '-'}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  infoLabel: { color: C.textMuted, fontSize: 12, flex: 1 },
  infoValue: { color: C.textPri, fontSize: 12, flex: 2, textAlign: 'right' },
});

export default InfoRow;
