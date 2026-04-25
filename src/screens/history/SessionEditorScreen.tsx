import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useTheme } from '../../theme';
import { useStorage } from '../../context/StorageContext';
import { SetRow } from '../../components/workout/SetRow';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { PinnedFooter } from '../../components/ui/PinnedFooter';
import { PrimaryButton } from '../../components/ui/PrimaryButton';

export default function SessionEditorScreen() {
  const theme = useTheme();
  const db = useStorage();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { sessionId } = route.params;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['sessionDetails', sessionId],
    queryFn: () => db.getSessionDetails(sessionId),
  });

  const [exercises, setExercises] = useState<any[]>([]);

  useEffect(() => {
    if (data) {
      const grouped: any = {};
      data.sets.forEach((set: any) => {
        const id = set.exercise_id;
        if (!grouped[id]) {
          grouped[id] = {
            uniqueId: `edit-${id}`,
            exercise_id: id,
            name: set.exercise_name,
            hasDuration: false,
            sets: [],
          };
        }
        if (set.duration_seconds !== null && set.duration_seconds !== undefined) {
          grouped[id].hasDuration = true;
        }
        grouped[id].sets.push({
          id: `set-${set.set_number}-${Math.random()}`,
          setNumber: set.set_number,
          weight: set.weight,
          reps: set.reps,
          durationSeconds: set.duration_seconds ?? 0,
          hasDuration: grouped[id].hasDuration,
          isCompleted: set.is_completed,
        });
      });
      setExercises(Object.values(grouped));
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (payload: any) => db.updateSession(sessionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
      queryClient.invalidateQueries({ queryKey: ['sessionDetails', sessionId] });
      Alert.alert('Saved', 'Workout updated successfully.');
      navigation.goBack();
    },
    onError: (err) => Alert.alert('Error', (err as Error).message),
  });

  const handleSave = () => {
    const flatSets = exercises.flatMap((ex) =>
      ex.sets.map((s: any) => ({
        exercise_id: ex.exercise_id,
        set_number: s.setNumber,
        reps: s.reps,
        weight: s.weight,
        duration_seconds: ex.hasDuration ? s.durationSeconds : null,
        is_completed: s.isCompleted,
      })),
    );
    updateMutation.mutate({ sets: flatSets });
  };

  const updateSet = (uniqueId: string, setId: string, field: 'weight' | 'reps' | 'durationSeconds', value: number) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.uniqueId !== uniqueId) return ex;
        return { ...ex, sets: ex.sets.map((s: any) => (s.id === setId ? { ...s, [field]: value } : s)) };
      }),
    );
  };

  const toggleComplete = (uniqueId: string, setId: string) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.uniqueId !== uniqueId) return ex;
        return { ...ex, sets: ex.sets.map((s: any) => (s.id === setId ? { ...s, isCompleted: !s.isCompleted } : s)) };
      }),
    );
  };

  const toggleDurationMode = (uniqueId: string) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.uniqueId !== uniqueId) return ex;
        const nextHasDuration = !ex.hasDuration;
        return {
          ...ex,
          hasDuration: nextHasDuration,
          sets: ex.sets.map((s: any) => ({
            ...s,
            hasDuration: nextHasDuration,
            durationSeconds: nextHasDuration ? (s.durationSeconds || 30) : 0,
          })),
        };
      }),
    );
  };

  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} color={theme.colors.primary} />;

  return (
    <SafeAreaView edges={[]} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader title="Edit Session" onBack={() => navigation.goBack()} />

      <FlatList
        data={exercises}
        keyExtractor={(item) => item.uniqueId}
        contentContainerStyle={styles.list}
        renderItem={({ item: exercise }) => (
          <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.exerciseHeader}>
              <Text style={[theme.typography.title, { color: theme.colors.text }]}>{exercise.name}</Text>
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
            </View>
            {exercise.sets.map((set: any) => (
              <SetRow
                key={set.id}
                {...set}
                hasDuration={exercise.hasDuration}
                onUpdate={(f: any, v: any) => updateSet(exercise.uniqueId, set.id, f, v)}
                onToggleComplete={() => toggleComplete(exercise.uniqueId, set.id)}
              />
            ))}
          </View>
        )}
      />

      <PinnedFooter>
        <PrimaryButton
          label="Save Changes"
          onPress={handleSave}
          loading={updateMutation.isPending}
        />
      </PinnedFooter>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  card: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  durationToggle: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
