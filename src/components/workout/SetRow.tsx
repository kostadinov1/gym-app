import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { Stepper } from './Stepper';

interface SetRowProps {
  setNumber: number;
  weight: number;
  reps: number;
  isCompleted: boolean;
  onUpdate: (field: 'weight' | 'reps', value: number) => void;
  onToggleComplete: () => void;
}

export const SetRow = ({ 
  setNumber, weight, reps, isCompleted, onUpdate, onToggleComplete 
}: SetRowProps) => {
  const theme = useTheme();

  return (
    <View style={[
      styles.container, 
      isCompleted && { backgroundColor: theme.colors.successBackground }
    ]}>
      {/* Set Label (Clickable) */}
      <TouchableOpacity onPress={onToggleComplete} style={styles.labelContainer}>
        <View style={[
          styles.badge, 
          { backgroundColor: isCompleted ? theme.colors.success : theme.colors.border }
        ]}>
          <Text style={[
            styles.labelText, 
            { color: isCompleted ? '#FFF' : theme.colors.text }
          ]}>
            {setNumber}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Controls */}
      <View style={styles.controls}>
        <Stepper 
          value={weight} 
          step={2.5} 
          unit="kg"
          onChange={(val) => onUpdate('weight', val)} 
        />
        <View style={{ width: 12 }} /> 
        <Stepper 
          value={reps} 
          step={1} 
          unit="reps"
          onChange={(val) => onUpdate('reps', val)} 
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  labelContainer: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  controls: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
});