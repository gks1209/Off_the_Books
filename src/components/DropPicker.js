import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Label from './Label';
import C from '../theme/colors';

export const DropPicker = ({ label, value, onChange, options, placeholder }) => {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      {label ? <Label>{label}</Label> : null}
      <TouchableOpacity
        style={styles.dropBtn}
        onPress={() => setOpen((p) => !p)}
        activeOpacity={0.8}
      >
        <Text style={value ? styles.dropBtnText : styles.dropBtnPlaceholder}>
          {value || placeholder || '선택하세요'}
        </Text>
        <Text style={styles.dropArrow}>{open ? '▴' : '▾'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={styles.dropList}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[styles.dropItem, value === opt && styles.dropItemActive]}
              onPress={() => { onChange(opt); setOpen(false); }}
            >
              <Text style={[styles.dropItemText, value === opt && styles.dropItemTextActive]}>{opt}</Text>
              {value === opt && <Text style={{ color: C.accent, fontSize: 14 }}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  fieldWrap: { marginBottom: 14 },
  dropBtn: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropBtnText: {
    color: C.textPri,
    fontSize: 15,
  },
  dropBtnPlaceholder: {
    color: C.textMuted,
    fontSize: 15,
  },
  dropArrow: {
    color: C.textSec,
    fontSize: 14,
  },
  dropList: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    marginTop: 6,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  dropItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border + '33',
  },
  dropItemActive: {
    backgroundColor: C.surface,
  },
  dropItemText: {
    color: C.textPri,
    fontSize: 14,
  },
  dropItemTextActive: {
    color: C.accent,
    fontWeight: '700',
  },
});

export default DropPicker;
