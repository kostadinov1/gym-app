import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

interface StepperProps {
  value: number;
  onChange: (val: number) => void;
  step: number;
  unit?: string;
}

export const Stepper = ({ value, onChange, step, unit }: StepperProps) => {
  const theme = useTheme();

  const handleIncrement = () => onChange(Number((value + step).toFixed(2)));
  const handleDecrement = () => onChange(Number((value - step).toFixed(2)));

  return (
    <View style={[styles.container, { borderColor: theme.colors.border }]}>
      {/* Minus Button */}
      <TouchableOpacity onPress={handleDecrement} style={styles.button}>
        <Text style={[styles.buttonText, { color: theme.colors.primary }]}>-</Text>
      </TouchableOpacity>

      {/* Center Value (Editable) */}
      <View style={[styles.valueContainer, { borderLeftColor: theme.colors.border, borderRightColor: theme.colors.border }]}>
        <TextInput
          style={[styles.input, { color: theme.colors.text }]}
          keyboardType="numeric"
          value={String(value)}
          onChangeText={(text) => {
            const num = parseFloat(text);
            if (!isNaN(num)) onChange(num);
          }}
          selectTextOnFocus
        />
        {unit && <Text style={[styles.unit, { color: theme.colors.textSecondary }]}>{unit}</Text>}
      </View>

      {/* Plus Button */}
      <TouchableOpacity onPress={handleIncrement} style={styles.button}>
        <Text style={[styles.buttonText, { color: theme.colors.primary }]}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 8,
    height: 40,
    alignItems: 'center',
    overflow: 'hidden',
  },
  button: {
    width: 40,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  buttonText: {
    fontSize: 24,
    fontWeight: '500',
    marginTop: -2,
  },
  valueContainer: {
    paddingHorizontal: 12,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    minWidth: 80,
  },
  input: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    padding: 0,
  },
  unit: {
    fontSize: 12,
    marginLeft: 2,
    marginTop: 2,
  },
});