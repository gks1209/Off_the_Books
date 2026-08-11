import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Label from './Label';
import C from '../theme/colors';

const CATEGORIES = ['상의', '하의', '아우터', '가방', '신발', '악세서리', '기타'];

export const CategoryPicker = ({ value, onChange }) => (
  <View style={styles.fieldWrap}>
    <Label>카테고리</Label>
    <View style={styles.chipRow}>
      {CATEGORIES.map((c) => (
        <TouchableOpacity
          key={c}
          style={[styles.chip, value === c && styles.chipActive]}
          onPress={() => onChange(c)}
        >
          <Text style={[styles.chipText, value === c && styles.chipTextActive]}>{c}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  fieldWrap: { marginBottom: 14 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  chipActive: { backgroundColor: C.accentDim, borderColor: C.accent },
  chipText: { color: C.textSec, fontSize: 13 },
  chipTextActive: { color: C.white, fontWeight: '700' },
});

export default CategoryPicker;
