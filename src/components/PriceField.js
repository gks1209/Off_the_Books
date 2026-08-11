import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import Label from './Label';
import C from '../theme/colors';
import { fmtInput, stripCommas } from '../utils/format';

export const PriceField = ({ label, rawValue, currency, onChangeRaw, onChangeCurrency, required }) => {
  const handleChange = (text) => {
    const clean = stripCommas(text).replace(/[^0-9.]/g, '');
    onChangeRaw(clean);
  };

  const displayValue = rawValue ? fmtInput(rawValue, currency) : '';
  const prefix = currency === 'USD' ? '$ ' : '';

  return (
    <View style={styles.fieldWrap}>
      {label ? <Label>{label}{required ? ' *' : ''}</Label> : null}
      <View style={styles.priceRow}>
        <TouchableOpacity
          style={[styles.currencyToggle, currency === 'KRW' && styles.currencyToggleActive]}
          onPress={() => onChangeCurrency('KRW')}
        >
          <Text style={[styles.currencyToggleText, currency === 'KRW' && styles.currencyToggleTextActive]}>₩</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.currencyToggle, currency === 'USD' && styles.currencyToggleActiveUSD]}
          onPress={() => onChangeCurrency('USD')}
        >
          <Text style={[styles.currencyToggleText, currency === 'USD' && styles.currencyToggleTextActive]}>$</Text>
        </TouchableOpacity>
        <View style={styles.priceInputWrap}>
          {prefix ? <Text style={styles.pricePrefix}>{prefix}</Text> : null}
          <TextInput
            style={styles.priceInput}
            value={displayValue}
            onChangeText={handleChange}
            placeholder="0"
            placeholderTextColor={C.textMuted}
            keyboardType="numeric"
          />
          {currency === 'KRW' && displayValue ? (
            <Text style={styles.priceSuffix}>원</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fieldWrap: { marginBottom: 14 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  currencyToggle: {
    width: 36, height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyToggleActive: { backgroundColor: C.accentDim, borderColor: C.accent },
  currencyToggleActiveUSD: { backgroundColor: '#166534', borderColor: '#4ade80' },
  currencyToggleText: { color: C.textMuted, fontSize: 14, fontWeight: '700' },
  currencyToggleTextActive: { color: C.white },
  priceInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    height: 42,
  },
  pricePrefix: { color: C.textSec, fontSize: 15, marginRight: 2 },
  priceInput: { flex: 1, color: C.textPri, fontSize: 15 },
  priceSuffix: { color: C.textMuted, fontSize: 13, marginLeft: 2 },
});

export default PriceField;
