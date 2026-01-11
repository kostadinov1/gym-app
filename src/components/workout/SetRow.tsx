import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Import Icons
import { useTheme } from '../../theme';
import { Stepper } from './Stepper';

interface SetRowProps {
  setNumber: number;
  weight: number;
  reps: number;
  isCompleted: boolean;
  onUpdate: (field: 'weight' | 'reps', value: number) => void;
  onToggleComplete: () => void;
  onDelete?: () => void; // <--- New Optional Prop
}

export const SetRow = ({ 
  setNumber, weight, reps, isCompleted, onUpdate, onToggleComplete, onDelete 
}: SetRowProps) => {
  const theme = useTheme();

  return (
    <View style={[
      styles.container, 
      isCompleted && { backgroundColor: theme.colors.successBackground }
    ]}>
      {/* Set Label */}
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
        <View style={{ flex: 1.2 }}> 
            <Stepper 
              value={weight} 
              step={2.5} 
              unit="kg"
              onChange={(val) => onUpdate('weight', val)} 
            />
        </View>
        <View style={{ width: 8 }} />
        <View style={{ flex: 1 }}>
            <Stepper 
              value={reps} 
              step={1} 
              unit="reps"
              onChange={(val) => onUpdate('reps', val)} 
            />
        </View>
        
        {/* NEW: Delete Button */}
        {onDelete && (
            <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={20} color={theme.colors.textSecondary} />
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
  // New style
  deleteBtn: {
      marginLeft: 8,
      padding: 4
  }
});