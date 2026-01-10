import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../theme';
import { SetRow } from '../components/workout/SetRow';
import { startRoutine, finishWorkout } from '../api/workouts';

export default function ActiveWorkoutScreen() {
  const theme = useTheme();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { routineId } = route.params;
  const queryClient = useQueryClient();

  // 1. Capture Start Time
  const startTime = useRef(new Date());

  // 2. FETCH THE ROUTINE DATA (This was missing!)
  const { data, isLoading } = useQuery({
    queryKey: ['activeSession', routineId],
    queryFn: () => startRoutine(routineId),
  });

  // 3. Local State
  const [exercises, setExercises] = useState<any[]>([]);

  // 4. Transform Data when Loaded (This was also missing!)
  useEffect(() => {
    if (data) {
      const transformed = data.exercises.map((ex: any) => ({
        id: ex.exercise_id,
        name: ex.name,
        history: 'No history yet', 
        sets: ex.sets.map((s: any) => ({
          id: `${ex.exercise_id}-${s.set_number}`,
          setNumber: s.set_number,
          weight: s.target_weight,
          reps: s.target_reps,
          isCompleted: false
        }))
      }));
      setExercises(transformed);
    }
  }, [data]);

  // 5. Define Mutation
  const finishMutation = useMutation({
    mutationFn: finishWorkout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
      Alert.alert("Great Job!", "Workout saved successfully.", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    },
    onError: (error) => {
      Alert.alert("Error saving workout", (error as Error).message);
    }
  });

  // 6. Finish Logic
  const handleFinish = () => {
    // Fix for "s implicitly has any type" -> added (s: any)
    const flatSets = exercises.flatMap(ex => 
      ex.sets.map((s: any) => ({
        exercise_id: ex.id,
        set_number: s.setNumber,
        reps: s.reps,
        weight: s.weight,
        is_completed: s.isCompleted
      }))
    );

    const payload = {
      routine_id: routineId,
      start_time: startTime.current.toISOString(),
      end_time: new Date().toISOString(),
      sets: flatSets
    };

    finishMutation.mutate(payload);
  };

  const updateSet = (exerciseId: string, setId: string, field: 'weight'|'reps', value: number) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id !== exerciseId) return ex;
      return {
        ...ex,
        sets: ex.sets.map((s: any) => s.id === setId ? { ...s, [field]: value } : s)
      };
    }));
  };

  const toggleComplete = (exerciseId: string, setId: string) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id !== exerciseId) return ex;
      return {
        ...ex,
        sets: ex.sets.map((s: any) => s.id === setId ? { ...s, isCompleted: !s.isCompleted } : s)
      };
    }));
  };

  // 7. Loading State
  if (isLoading || exercises.length === 0) {
    return (
      <View style={[styles.safeArea, styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 16 }}>
           <Text style={{ fontSize: 24, color: theme.colors.primary }}>←</Text>
        </TouchableOpacity>
        {/* Now 'data' exists, so this won't crash */}
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{data?.name}</Text>
      </View>

      <FlatList 
        data={exercises}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item: exercise }) => (
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
             <View style={styles.cardHeader}>
              <Text style={[styles.exerciseName, { color: theme.colors.text }]}>{exercise.name}</Text>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>{exercise.history}</Text>
            </View>
            
            {exercise.sets.map((set: any) => (
              <SetRow 
                key={set.id}
                {...set}
                onUpdate={(field, val) => updateSet(exercise.id, set.id, field, val)}
                onToggleComplete={() => toggleComplete(exercise.id, set.id)}
              />
            ))}
          </View>
        )}
      />
      
       <View style={[styles.footer, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}>
           <TouchableOpacity 
            style={[
              styles.finishButton, 
              { backgroundColor: theme.colors.success, opacity: finishMutation.isPending ? 0.7 : 1 }
            ]}
            onPress={handleFinish}
            disabled={finishMutation.isPending}
         >
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>
              {finishMutation.isPending ? "Saving..." : "Finish Workout"}
            </Text>
         </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: 'bold' },
  card: { borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  exerciseName: { fontSize: 18, fontWeight: '700' },
  footer: { padding: 16, borderTopWidth: 1 },
  finishButton: { padding: 16, borderRadius: 12, alignItems: 'center' }
});