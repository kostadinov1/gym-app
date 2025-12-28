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
    <View style={[styles.container, { borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground }]}>
      {/* Minus Button */}
      <TouchableOpacity onPress={handleDecrement} style={styles.button}>
        <Text style={[styles.buttonText, { color: theme.colors.primary }]}>-</Text>
      </TouchableOpacity>

      {/* Center Value */}
      <View style={styles.valueContainer}>
        <TextInput
          style={[styles.input, { color: theme.colors.text }]}
          keyboardType="numeric"
          value={String(value)}
          onChangeText={(text) => {
             // Allow empty string for typing, otherwise parse
             if (text === '') return;
             const num = parseFloat(text);
             if (!isNaN(num)) onChange(num);
          }}
        />
        {/* We make the unit smaller and absolute or just next to it */}
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
    borderRadius: 8,
    height: 36, // Reduced height
    alignItems: 'center',
    flex: 1, // Allow it to shrink/grow
    marginHorizontal: 2, // Tiny gap
  },
  button: {
    width: 32, // Reduced width
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: -2,
  },
  valueContainer: {
    flex: 1, // Takes remaining space
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  input: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    padding: 0,
    minWidth: 20,
  },
  unit: {
    fontSize: 10,
    marginLeft: 2,
    marginTop: 3,
  },
});