import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';

interface DayRoutineCardProps {
  dayName: string;
  routine: any; // We can use the specific type if imported, but any is fine for refactoring speed
  currentWeek: number;
  onPress: () => void;
  onAddPress: () => void;
}

export const DayRoutineCard = ({ dayName, routine, currentWeek, onPress, onAddPress }: DayRoutineCardProps) => {
  const theme = useTheme();
  const isRest = routine?.routine_type === 'rest';

  return (
    <View style={[styles.dayRow, { backgroundColor: theme.colors.card }]}>
      <View style={styles.dayLabel}>
        <Text style={{ fontWeight: 'bold', color: theme.colors.textSecondary }}>
            {dayName.substring(0, 3).toUpperCase()}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        {routine ? (
          <TouchableOpacity
            style={[
              styles.routineCard,
              { backgroundColor: isRest ? theme.colors.successBackground : theme.colors.inputBackground },
              isRest && { borderColor: theme.colors.success, borderWidth: 1 }
            ]}
            disabled={isRest}
            onPress={onPress}
          >
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {isRest && <Ionicons name="battery-charging" size={18} color={theme.colors.success} />}
                <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.text }}>
                  {routine.name}
                </Text>
              </View>
              {!isRest && <Text style={{ fontSize: 12, color: theme.colors.primary }}>Edit</Text>}
            </View>

            {isRest ? (
              <View style={{ marginTop: 4 }}>
                <Text style={{ color: theme.colors.success, fontSize: 13, fontStyle: 'italic' }}>
                  Active Recovery • Mobility • Sleep
                </Text>
              </View>
            ) : (
              <>
                {routine.exercises.length === 0 && (
                  <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>No exercises yet.</Text>
                )}
                {routine.exercises.map((ex: any) => {
                  // --- FIX: REST DAYS DO NOT PROGRESS ---
                  // If it's a rest day, we ignore the week swipe (effectively sticking to Week 1 values)
                  const weeksPassed = isRest ? 0 : (currentWeek - 1);
                  
                  const currentWeight = ex.target_weight + ((ex.increment_weight || 0) * weeksPassed);
                  const currentReps = ex.target_reps + ((ex.increment_reps || 0) * weeksPassed);

                  return (
                    <View key={ex.id} style={{ marginTop: 4 }}>
                      <Text style={{ color: theme.colors.text }}>
                        {ex.target_sets} x {currentReps} @ {currentWeight}kg
                      </Text>
                    </View>
                  );
                })}
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.addButton} onPress={onAddPress}>
            <Text style={{ color: theme.colors.primary }}>+ Add Routine</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  dayRow: { flexDirection: 'row', marginBottom: 12, borderRadius: 12, padding: 12, alignItems: 'flex-start' },
  dayLabel: { width: 50, paddingTop: 12, alignItems: 'center', marginRight: 12 },
  addButton: { padding: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, alignItems: 'center' },
  routineCard: { padding: 12, borderRadius: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }
});