import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import C from '../theme/colors';

export const Btn = ({ label, onPress, variant = 'primary', style: extra }) => {
  const bg =
    variant === 'primary' ? C.accent :
      variant === 'gold' ? C.gold :
        variant === 'green' ? C.green :
          variant === 'danger' ? C.red :
            C.surface;
  const textColor =
    variant === 'ghost' ? C.textSec : C.bg;
  return (
    <TouchableOpacity
      style={[styles.btn, { backgroundColor: bg }, extra]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.btnText, { color: textColor }]}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 8,
  },
  btnText: { fontSize: 15, fontWeight: '700' },
});

export default Btn;
