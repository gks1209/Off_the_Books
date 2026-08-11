import React from 'react';
import { Text, StyleSheet } from 'react-native';
import C from '../theme/colors';

export const Label = ({ children }) => <Text style={styles.label}>{children}</Text>;

const styles = StyleSheet.create({
  label: {
    color: C.textSec,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
});

export default Label;
