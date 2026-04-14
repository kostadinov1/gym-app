import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { useUnits } from '../../context/UnitsContext';
import { Stepper } from './Stepper';

interface SetRowProps {
  setNumber: number;
  weight: number;
  reps: number;
  durationSeconds?: number;
  hasDuration?: boolean;
  isCompleted: boolean;
  onUpdate: (field: 'weight' | 'reps' | 'durationSeconds', value: number) => void;
  onToggleComplete: () => void;
  onDelete?: () => void;
}

export const SetRow = ({
  setNumber,
  weight,
  reps,
  durationSeconds,
  hasDuration = false,
  isCompleted,
  onUpdate,
  onToggleComplete,
  onDelete,
}: SetRowProps) => {
  const theme = useTheme();
  const { unitLabel, weightStep } = useUnits();

  return (
    <View style={[styles.container, isCompleted && { backgroundColor: theme.colors.successBackground }]}> 
      <TouchableOpacity onPress={onToggleComplete} style={styles.labelContainer}>
        <View style={[styles.badge, { backgroundColor: isCompleted ? theme.colors.success : theme.colors.border }]}> 
          <Text style={[styles.labelText, { color: isCompleted ? '#FFF' : theme.colors.text }]}>{setNumber}</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.controls}>
        <View style={{ flex: 1.1 }}>
          <Stepper value={weight} step={weightStep} unit={unitLabel} onChange={(val) => onUpdate('weight', val)} />
        </View>

        <View style={{ width: 8 }} />

        <View style={{ flex: 1 }}>
          <Stepper value={reps} step={1} unit="reps" onChange={(val) => onUpdate('reps', val)} />
        </View>

        {hasDuration && (
          <>
            <View style={{ width: 8 }} />
            <View style={{ flex: 1 }}>
              <Stepper
                value={durationSeconds ?? 0}
                step={5}
                unit="sec"
                onChange={(val) => onUpdate('durationSeconds', val)}
              />
            </View>
          </>
        )}

        {onDelete && (
          <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
            <Trash2 size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  labelContainer: {
    width: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  controls: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteBtn: {
    marginLeft: 8,
    padding: 4,
  },
});
