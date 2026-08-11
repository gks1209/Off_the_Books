import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import Label from './Label';
import C from '../theme/colors';

export const Field = ({ label, value, onChangeText, placeholder, keyboardType, multiline }) => (
  <View style={styles.fieldWrap}>
    {label ? <Label>{label}</Label> : null}
    <TextInput
      style={[styles.input, multiline && { height: 80, textAlignVertical: 'top' }]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder || ''}
      placeholderTextColor={C.textMuted}
      keyboardType={keyboardType || 'default'}
      multiline={multiline}
    />
  </View>
);

const styles = StyleSheet.create({
  fieldWrap: { marginBottom: 14 },
  input: {
    backgroundColor: C.surface,
    color: C.textPri,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
});

export default Field;
