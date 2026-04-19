import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardList } from 'lucide-react-native';
import { useTheme } from '../theme';
import { SetRow } from '../components/workout/SetRow';
import { useUnits } from '../context/UnitsContext';
import { useStorage } from '../context/StorageContext';
import { FAB } from '../components/common/FAB';
import Toast from 'react-native-toast-message';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { EmptyState } from '../components/ui/EmptyState';

export default function ActiveWorkoutScreen() {
  const [isAddModalVisible, setAddModalVisible] = useState(false);
  const theme = useTheme();
  const db = useStorage();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { routineId } = route.params;
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { kgToDisplay, displayToKg } = useUnits();

  const startTime = useRef(new Date());
  const { data, isLoading } = useQuery({
    queryKey: ['activeSession', routineId],
    queryFn: () => db.startRoutine(routineId),
  });

  const [exercises, setExercises] = useState<any[]>([]);

  const { data: allExercises } = useQuery({
    queryKey: ['exercises'],
    queryFn: () => db.getExercisesFiltered(),
  });

  useEffect(() => {
    if (data) {
      const transformed = data.exercises.map((ex: any, index: number) => ({
        uniqueId: `${ex.exercise_id}_${index}`,
        exercise_id: ex.exercise_id,
        name: ex.name,
        history: 'No history yet',
        hasDuration: ex.sets.some((s: any) => s.target_duration_seconds !== null && s.target_duration_seconds !== undefined),
        sets: ex.sets.map((s: any) => ({
          id: `${ex.exercise_id}-${s.set_number}-${index}`,
          setNumber: s.set_number,
          weight: kgToDisplay(s.target_weight),
          reps: s.target_reps,
          durationSeconds: s.target_duration_seconds ?? 0,
          hasDuration: s.target_duration_seconds !== null && s.target_duration_seconds !== undefined,
          isCompleted: false,
        })),
      }));
      setExercises(transformed);
    }
  }, [data]);

  const finishMutation = useMutation({
    mutationFn: (payload: Parameters<typeof db.finishWorkout>[0]) => db.finishWorkout(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
      queryClient.invalidateQueries({ queryKey: ['routines'] });
      Toast.show({
        type: 'success',
        text1: 'Workout Completed! 💪',
        text2: 'Great job, see you next time.',
      });
      navigation.goBack();
    },
    onError: (error) => {
      setIsSubmitting(false);
      Toast.show({ type: 'error', text1: 'Save Failed', text2: (error as Error).message });
    },
  });

  const handleFinish = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const flatSets = exercises.flatMap((ex) =>
      ex.sets.map((s: any) => ({
        exercise_id: ex.exercise_id,
        set_number: s.setNumber,
        reps: s.reps,
        weight: displayToKg(s.weight),
        duration_seconds: s.hasDuration ? s.durationSeconds : null,
        is_completed: s.isCompleted,
      })),
    );

    const payload = {
      routine_id: routineId,
      start_time: startTime.current.toISOString(),
      end_time: new Date().toISOString(),
      sets: flatSets,
    };

    finishMutation.mutate(payload);
  };

  const updateSet = (
    uniqueId: string,
    setId: string,
    field: 'weight' | 'reps' | 'durationSeconds',
    value: number,
  ) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.uniqueId !== uniqueId) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s: any) => (s.id === setId ? { ...s, [field]: value } : s)),
        };
      }),
    );
  };

  const toggleComplete = (uniqueId: string, setId: string) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.uniqueId !== uniqueId) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s: any) => (s.id === setId ? { ...s, isCompleted: !s.isCompleted } : s)),
        };
      }),
    );
  };

  const handleAddSet = (exerciseUniqueId: string) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.uniqueId !== exerciseUniqueId) return ex;
        const previousSet = ex.sets[ex.sets.length - 1];
        const newSetNumber = ex.sets.length + 1;
        const newSet = {
          id: `temp-${Date.now()}-${Math.random()}`,
          setNumber: newSetNumber,
          weight: previousSet ? previousSet.weight : 0,
          reps: previousSet ? previousSet.reps : 0,
          durationSeconds: previousSet ? previousSet.durationSeconds : 0,
          hasDuration: previousSet ? previousSet.hasDuration : ex.hasDuration,
          isCompleted: false,
        };
        return { ...ex, sets: [...ex.sets, newSet] };
      }),
    );
  };

  const handleRemoveSet = (exerciseUniqueId: string, setIdToRemove: string) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.uniqueId !== exerciseUniqueId) return ex;
        const filteredSets = ex.sets.filter((s: any) => s.id !== setIdToRemove);
        const renumberedSets = filteredSets.map((s: any, index: number) => ({ ...s, setNumber: index + 1 }));
        return { ...ex, sets: renumberedSets };
      }),
    );
  };

  const handleAddAdHoc = (exercise: any) => {
    const newExercise = {
      uniqueId: `adhoc-${exercise.id}-${Date.now()}`,
      exercise_id: exercise.id,
      name: exercise.name,
      history: 'Ad-Hoc',
      hasDuration: false,
      sets: [
        {
          id: `adhoc-set-${Date.now()}`,
          setNumber: 1,
          weight: 0,
          reps: 0,
          durationSeconds: 0,
          hasDuration: false,
          isCompleted: false,
        },
      ],
    };
    setExercises((prev) => [...prev, newExercise]);
    setAddModalVisible(false);
  };


  const toggleDurationMode = (exerciseUniqueId: string) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.uniqueId !== exerciseUniqueId) return ex;
        const nextHasDuration = !ex.hasDuration;
        return {
          ...ex,
          hasDuration: nextHasDuration,
          sets: ex.sets.map((set: any) => ({
            ...set,
            hasDuration: nextHasDuration,
            durationSeconds: nextHasDuration ? (set.durationSeconds || 30) : 0,
          })),
        };
      }),
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.safeArea, styles.center, { backgroundColor: theme.colors.background }]}> 
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (data && exercises.length === 0) {
    return (
      <SafeAreaView edges={['bottom']} style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <ScreenHeader title={data?.name ?? 'Workout'} onBack={() => navigation.goBack()} />
        <EmptyState
          icon={ClipboardList}
          title="Routine is empty"
          subtitle="Add exercises in the Plans editor to get started."
          action={{ label: 'Go to Plans', onPress: () => navigation.navigate('Plans') }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader title={data?.name ?? 'Workout'} onBack={() => navigation.goBack()} />

      <FlatList
        data={exercises}
        keyExtractor={(item) => item.uniqueId}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        renderItem={({ item: exercise }) => (
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}> 
            <View style={styles.cardHeader}>
              <Text style={[styles.exerciseName, { color: theme.colors.text }]}>{exercise.name}</Text>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>{exercise.history}</Text>
                {exercise.history === 'Ad-Hoc' && (
                  <TouchableOpacity
                    onPress={() => toggleDurationMode(exercise.uniqueId)}
                    style={[
                      styles.durationToggle,
                      {
                        borderColor: exercise.hasDuration ? theme.colors.primary : theme.colors.border,
                        backgroundColor: exercise.hasDuration ? theme.colors.primary : theme.colors.card,
                      },
                    ]}
                  >
                    <Text style={{ color: exercise.hasDuration ? 'white' : theme.colors.textSecondary, fontSize: 11, fontWeight: '700' }}>
                      TIME {exercise.hasDuration ? 'ON' : 'OFF'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            {exercise.sets.map((set: any) => (
              <SetRow
                key={set.id}
                {...set}
                onUpdate={(field, val) => updateSet(exercise.uniqueId, set.id, field, val)}
                onToggleComplete={() => toggleComplete(exercise.uniqueId, set.id)}
                onDelete={() => handleRemoveSet(exercise.uniqueId, set.id)}
              />
            ))}
            <TouchableOpacity style={styles.addSetButton} onPress={() => handleAddSet(exercise.uniqueId)}>
              <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>+ Add Set</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <FAB onPress={() => setAddModalVisible(true)} style={{ bottom: 100 }} />

      <View style={[styles.footer, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}> 
        <TouchableOpacity
          style={[
            styles.finishButton,
            {
              backgroundColor: theme.colors.success,
              opacity: isSubmitting || finishMutation.isPending || finishMutation.isSuccess ? 0.5 : 1,
            },
          ]}
          onPress={handleFinish}
          disabled={isSubmitting || finishMutation.isPending || finishMutation.isSuccess}
        >
          {isSubmitting || finishMutation.isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>Finish Workout</Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal visible={isAddModalVisible} animationType="slide">
        <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.colors.background }}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Add Exercise</Text>
            <TouchableOpacity onPress={() => setAddModalVisible(false)}>
              <Text style={{ color: theme.colors.primary, fontSize: 16 }}>Close</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={allExercises}
            keyExtractor={(item) => item.id}
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
  durationToggle: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  footer: { padding: 16, borderTopWidth: 1 },
  finishButton: { padding: 16, borderRadius: 12, alignItems: 'center' },
  addSetButton: { paddingVertical: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f0f0f0', marginTop: 4 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#eee' },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  pickerItem: { padding: 16, borderBottomWidth: 1 },
});
