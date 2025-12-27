import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { SetRow } from '../components/workout/SetRow';

// Mock Data Structure
interface WorkoutSet {
  id: string;
  setNumber: number;
  weight: number;
  reps: number;
  isCompleted: boolean;
}

interface ExerciseBlock {
  id: string;
  name: string;
  history: string;
  sets: WorkoutSet[];
}

export default function ActiveWorkoutScreen() {
  const theme = useTheme()

  // MOCK STATE: We will eventually load this from Backend
  const [exercises, setExercises] = useState<ExerciseBlock[]>([
    {
      id: 'ex1',
      name: 'Deadlift',
      history: 'Last: 140kg x 5',
      sets: [
        { id: 's1', setNumber: 1, weight: 142.5, reps: 5, isCompleted: false },
        { id: 's2', setNumber: 2, weight: 142.5, reps: 5, isCompleted: false },
        { id: 's3', setNumber: 3, weight: 142.5, reps: 5, isCompleted: false },
      ]
    },
    {
      id: 'ex2',
      name: 'Pullups',
      history: 'Last: BW+5kg x 8',
      sets: [
        { id: 'p1', setNumber: 1, weight: 5, reps: 8, isCompleted: false },
        { id: 'p2', setNumber: 2, weight: 5, reps: 8, isCompleted: false },
      ]
    }
  ]);

  const updateSet = (exerciseId: string, setId: string, field: 'weight'|'reps', value: number) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id !== exerciseId) return ex;
      return {
        ...ex,
        sets: ex.sets.map(s => s.id === setId ? { ...s, [field]: value } : s)
      };
    }));
  };

  const toggleComplete = (exerciseId: string, setId: string) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id !== exerciseId) return ex;
      return {
        ...ex,
        sets: ex.sets.map(s => s.id === setId ? { ...s, isCompleted: !s.isCompleted } : s)
      };
    }));
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Pull Workout A</Text>
      </View>

      <FlatList 
        data={exercises}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item: exercise }) => (
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            {/* Card Header */}
            <View style={styles.cardHeader}>
              <Text style={[styles.exerciseName, { color: theme.colors.text }]}>{exercise.name}</Text>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>{exercise.history}</Text>
            </View>

            {/* Sets */}
            {exercise.sets.map(set => (
              <SetRow
                key={set.id}
                {...set}
                onUpdate={(field, val) => updateSet(exercise.id, set.id, field, val)}
                onToggleComplete={() => toggleComplete(exercise.id, set.id)}
              />
            ))}

            {/* Add Set Button (Visual Only for now) */}
            <TouchableOpacity style={{ marginTop: 8, alignSelf: 'center' }}>
              <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>+ Add Set</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Finish Button */}
      <View style={[styles.footer, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}>
         <TouchableOpacity style={[styles.finishButton, { backgroundColor: theme.colors.success }]}>
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>Finish Workout</Text>
         </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 22, fontWeight: 'bold' },
  card: { borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  exerciseName: { fontSize: 18, fontWeight: '700' },
  footer: { padding: 16, borderTopWidth: 1 },
  finishButton: { padding: 16, borderRadius: 12, alignItems: 'center' }
});