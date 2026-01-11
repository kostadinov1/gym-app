import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../theme';
import { SetRow } from '../components/workout/SetRow';
import { startRoutine, finishWorkout } from '../api/workouts';
import { getExercises } from '../api/exercises';
import { FAB } from '../components/common/FAB';

export default function ActiveWorkoutScreen() {
  const [isAddModalVisible, setAddModalVisible] = useState(false);
  const theme = useTheme();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { routineId } = route.params;
  const queryClient = useQueryClient();

  const startTime = useRef(new Date());
  const { data, isLoading } = useQuery({
    queryKey: ['activeSession', routineId],
    queryFn: () => startRoutine(routineId),
  });

  const [exercises, setExercises] = useState<any[]>([]);

    const { data: allExercises } = useQuery({
    queryKey: ['exercises'],
    queryFn: getExercises,
  });
  // 1. Transform Data (FIXED: Generate Unique IDs)
  useEffect(() => {
    if (data) {
      const transformed = data.exercises.map((ex: any, index: number) => ({
        // We create a unique local ID using index to prevent duplicates crashing the list
        uniqueId: `${ex.exercise_id}_${index}`,
        exercise_id: ex.exercise_id, // Keep real ID for saving
        name: ex.name,
        history: 'No history yet',
        sets: ex.sets.map((s: any) => ({
          id: `${ex.exercise_id}-${s.set_number}-${index}`, // Unique Set ID
          setNumber: s.set_number,
          weight: s.target_weight,
          reps: s.target_reps,
          isCompleted: false
        }))
      }));
      setExercises(transformed);
    }
  }, [data]);

  const finishMutation = useMutation({
    mutationFn: finishWorkout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
      // Update routines list to show "Done" badge immediately
      queryClient.invalidateQueries({ queryKey: ['routines'] });

      Alert.alert("Great Job!", "Workout saved successfully.", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    },
    onError: (error) => {
      Alert.alert("Error saving workout", (error as Error).message);
    }
  });

  // 2. Handle Finish (Use real exercise_id)
  const handleFinish = () => {
    const flatSets = exercises.flatMap(ex =>
      ex.sets.map((s: any) => ({
        exercise_id: ex.exercise_id, // Send the REAL database ID
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

  // 3. Update Functions (Use uniqueId)
  const updateSet = (uniqueId: string, setId: string, field: 'weight' | 'reps', value: number) => {
    setExercises(prev => prev.map(ex => {
      if (ex.uniqueId !== uniqueId) return ex; // Compare unique ID
      return {
        ...ex,
        sets: ex.sets.map((s: any) => s.id === setId ? { ...s, [field]: value } : s)
      };
    }));
  };

  const toggleComplete = (uniqueId: string, setId: string) => {
    setExercises(prev => prev.map(ex => {
      if (ex.uniqueId !== uniqueId) return ex; // Compare unique ID
      return {
        ...ex,
        sets: ex.sets.map((s: any) => s.id === setId ? { ...s, isCompleted: !s.isCompleted } : s)
      };
    }));
  };


  // 1. NEW: Add Set Logic
  const handleAddSet = (exerciseUniqueId: string) => {
    setExercises(prev => prev.map(ex => {
      if (ex.uniqueId !== exerciseUniqueId) return ex;

      const previousSet = ex.sets[ex.sets.length - 1];
      const newSetNumber = ex.sets.length + 1;

      const newSet = {
        // Create a temp unique ID
        id: `temp-${Date.now()}-${Math.random()}`,
        setNumber: newSetNumber,
        // Copy previous values or default to 0
        weight: previousSet ? previousSet.weight : 0,
        reps: previousSet ? previousSet.reps : 0,
        isCompleted: false
      };

      return {
        ...ex,
        sets: [...ex.sets, newSet]
      };
    }));
  };

  // 2. NEW: Remove Set Logic (With renumbering)
  const handleRemoveSet = (exerciseUniqueId: string, setIdToRemove: string) => {
    setExercises(prev => prev.map(ex => {
      if (ex.uniqueId !== exerciseUniqueId) return ex;

      // Filter out the deleted set
      const filteredSets = ex.sets.filter((s: any) => s.id !== setIdToRemove);

      // Re-number remaining sets (1, 2, 3...)
      const renumberedSets = filteredSets.map((s: any, index: number) => ({
        ...s,
        setNumber: index + 1
      }));

      return {
        ...ex,
        sets: renumberedSets
      };
    }));
  };


  // 3. NEW: Logic to add Ad-Hoc Exercise
  const handleAddAdHoc = (exercise: any) => {
    const newExerciseIndex = exercises.length;
    const newExercise = {
        uniqueId: `adhoc-${exercise.id}-${Date.now()}`, // Unique UI Key
        exercise_id: exercise.id,
        name: exercise.name,
        history: 'Ad-Hoc', // Visual indicator
        sets: [
            {
                id: `adhoc-set-${Date.now()}`,
                setNumber: 1,
                weight: 0,
                reps: 0,
                isCompleted: false
            }
        ]
    };

    setExercises(prev => [...prev, newExercise]);
    setAddModalVisible(false);
  };
  

  // 1. Only show spinner if React Query is actually loading
  if (isLoading) {
    return (
      <View style={[styles.safeArea, styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

// 2. If data loaded but we have no exercises
  if (data && exercises.length === 0) {
     return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 16 }}>
                <Text style={{ fontSize: 24, color: theme.colors.primary }}>←</Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{data?.name}</Text>
        </View>
        
        <View style={[styles.center, { padding: 32 }]}>
            <Text style={{ fontSize: 40, marginBottom: 16 }}>📝</Text>
            <Text style={{ 
                color: theme.colors.text, 
                fontSize: 18, 
                fontWeight: 'bold', 
                textAlign: 'center',
                marginBottom: 8 
            }}>
                This routine is empty
            </Text>
            <Text style={{ 
                color: theme.colors.textSecondary, 
                fontSize: 16, 
                textAlign: 'center',
                marginBottom: 32
            }}>
                You need to add exercises to this routine before you can start working out.
            </Text>
            
            {/* The Redirect Button */}
            <TouchableOpacity 
                style={{ 
                    backgroundColor: theme.colors.primary, 
                    paddingHorizontal: 24, 
                    paddingVertical: 14, 
                    borderRadius: 12 
                }}
                // Navigate to the 'Plans' Tab
                onPress={() => navigation.navigate('Plans')} 
            >
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
                    Go to Plans Manager
                </Text>
            </TouchableOpacity>
        </View>
      </SafeAreaView>
     );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 16 }}>
          <Text style={{ fontSize: 24, color: theme.colors.primary }}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{data?.name}</Text>
      </View>

      <FlatList
        data={exercises}
        // FIX: Use the uniqueId we generated
        keyExtractor={item => item.uniqueId}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
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
                onUpdate={(field, val) => updateSet(exercise.uniqueId, set.id, field, val)}
                onToggleComplete={() => toggleComplete(exercise.uniqueId, set.id)}
                // Pass the delete handler
                onDelete={() => handleRemoveSet(exercise.uniqueId, set.id)}
              />
            ))}

            {/* NEW: Add Set Button */}
            <TouchableOpacity
              style={styles.addSetButton}
              onPress={() => handleAddSet(exercise.uniqueId)}
            >
              <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>+ Add Set</Text>
            </TouchableOpacity>
          </View>
        )}
        
      />
   {/* FAB - Add exercise Button */}
      <FAB
        onPress={() => setAddModalVisible(true)} 
        style={{ bottom: 100 }} 
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
         {/* 6. NEW: Simple Modal Picker */}
      <Modal visible={isAddModalVisible} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Add Exercise</Text>
                <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                    <Text style={{ color: theme.colors.primary, fontSize: 16 }}>Close</Text>
                </TouchableOpacity>
            </View>
            <FlatList 
                data={allExercises}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <TouchableOpacity 
                        style={[styles.pickerItem, { borderBottomColor: theme.colors.border }]}
                        onPress={() => handleAddAdHoc(item)}
                    >
                        <Text style={{ fontSize: 16, color: theme.colors.text }}>{item.name}</Text>
                    </TouchableOpacity>
                )}
            />
        </SafeAreaView>
      </Modal>
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
  finishButton: { padding: 16, borderRadius: 12, alignItems: 'center' },
  addSetButton: {
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0', // You might want to use theme.colors.border here
    marginTop: 4
  },
    // New Styles
  adHocFab: {
      position: 'absolute',
      bottom: 90, // Sit ABOVE the Finish Button (which is usually ~20-30px from bottom + height)
      right: 20,
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 5,
      zIndex: 100,
  },
  modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderColor: '#eee'
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  pickerItem: {
      padding: 16,
      borderBottomWidth: 1,
  }
});