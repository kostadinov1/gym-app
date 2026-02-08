import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutProp) {
  UIManager.setLayoutProp(true);
}

interface DayRoutineCardProps {
  dayName: string;
  routine: any;
  currentWeek: number;
  onPress: () => void;
  onAddPress: () => void;
}

export const DayRoutineCard = ({ dayName, routine, currentWeek, onPress, onAddPress }: DayRoutineCardProps) => {
  const theme = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const isRest = routine?.routine_type === 'rest';
  const exercises = routine?.exercises || [];
  const hasManyExercises = exercises.length > 5;
  
  // Decide which exercises to show
  const visibleExercises = (hasManyExercises && !isExpanded) 
    ? exercises.slice(0, 3) 
    : exercises;

  const toggleExpand = (e: any) => {
    // Prevent the card's main onPress from firing when clicking the arrow
    e.stopPropagation();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

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
            onPress={onPress}
          >
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                {isRest && <Ionicons name="battery-charging" size={18} color={theme.colors.success} />}
                <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.text }} numberOfLines={1}>
                  {routine.name}
                </Text>
              </View>
              
              
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {!isRest && <Text style={{ fontSize: 12, color: theme.colors.primary, fontWeight: 'bold' }}>Edit</Text>}
              </View>
            </View>

            {isRest ? (
              <View style={{ marginTop: 4 }}>
                <Text style={{ color: theme.colors.success, fontSize: 13, fontStyle: 'italic' }}>
                  Active Recovery • Mobility • Sleep
                </Text>
              </View>
            ) : (
              <View style={{ marginTop: 4 }}>
                {exercises.length === 0 && (
                  <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>No exercises yet.</Text>
                )}
                
                {visibleExercises.map((ex: any) => {
                  const weeksPassed = (currentWeek - 1);
                  const effectiveWeeks = isRest ? 0 : weeksPassed;
                  const currentWeight = ex.target_weight + ((ex.increment_weight || 0) * effectiveWeeks);
                  const currentReps = ex.target_reps + ((ex.increment_reps || 0) * effectiveWeeks);

                  return (
                    <View key={ex.id} style={styles.exerciseLine}>
                      <Text 
                        style={[styles.exerciseName, { color: theme.colors.text }]} 
                        numberOfLines={1} 
                        ellipsizeMode="tail"
                      >
                        {ex.name}
                      </Text>
                      <Text style={[styles.exerciseStats, { color: theme.colors.textSecondary }]}>
                        {ex.target_sets}×{currentReps} @ {currentWeight}kg
                      </Text>
                    </View>
                  );
                })}

                {/* --- FIX: TOGGLE ROW NOW INSIDE THE ROUTINE BLOCK --- */}
{hasManyExercises && (
  <TouchableOpacity 
    onPress={toggleExpand} 
    style={styles.moreExercisesRow}
    activeOpacity={0.7}
  >
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text style={{ fontSize: 12, color: theme.colors.primary, fontWeight: '600' }}>
        {isExpanded ? "Show less" : `+ ${exercises.length - 3} more exercises`}
      </Text>
      <Ionicons 
          name={isExpanded ? "chevron-up" : "chevron-down"} 
          size={14} // Slightly smaller icon
          color={theme.colors.primary} 
          style={{ marginLeft: 4, marginTop: 1 }} // Fine-tuned alignment
      />
    </View>
  </TouchableOpacity>
)}
              </View>
            )}
          </TouchableOpacity>
        ) : (
          /* --- FIX: RESTORED THE ADD ROUTINE BUTTON --- */
          <TouchableOpacity style={styles.addButton} onPress={onAddPress}>
            <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>+ Add Routine</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  dayRow: { flexDirection: 'row', marginBottom: 12, borderRadius: 12, padding: 12, alignItems: 'flex-start' },
  dayLabel: { width: 45, paddingTop: 12, alignItems: 'center', marginRight: 8 },
  addButton: { padding: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, alignItems: 'center' },
  routineCard: { paddingTop: 12,paddingLeft: 12, paddingRight:12, borderRadius: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  exerciseLine: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginTop: 4,
    gap: 10
  },
  exerciseName: { fontSize: 13, flex: 1 },
  exerciseStats: { 
    fontSize: 13, 
    fontVariant: ['tabular-nums'], 
    minWidth: 90, 
    textAlign: 'right' 
  },
  expandButton: {
    padding: 2,
    marginLeft: 4
  },
moreExercisesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8, 
    marginTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)', // Slightly more visible but still subtle
},

});