import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../theme';
import { SetRow } from '../../components/workout/SetRow';
import { getSessionDetails, updateSession } from '../../api/history';
import { Container } from '../../components/common/Container';

export default function SessionEditorScreen() {
  const theme = useTheme();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { sessionId } = route.params;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['sessionDetails', sessionId],
    queryFn: () => getSessionDetails(sessionId),
  });

  const [exercises, setExercises] = useState<any[]>([]);

  useEffect(() => {
    if (data) {
      // Group sets back into exercises
      const grouped: any = {};
      data.sets.forEach((set: any) => {
        const id = set.exercise_id;
        if (!grouped[id]) {
            grouped[id] = {
                uniqueId: `edit-${id}`,
                exercise_id: id,
                name: set.exercise_name,
                sets: []
            };
        }
        grouped[id].sets.push({
            id: `set-${set.set_number}-${Math.random()}`,
            setNumber: set.set_number,
            weight: set.weight,
            reps: set.reps,
            isCompleted: set.is_completed
        });
      });
      setExercises(Object.values(grouped));
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (payload: any) => updateSession(sessionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
      queryClient.invalidateQueries({ queryKey: ['sessionDetails', sessionId] });
      Alert.alert("Saved", "Workout updated successfully.");
      navigation.goBack();
    },
    onError: (err) => Alert.alert("Error", (err as Error).message)
  });

  const handleSave = () => {
    const flatSets = exercises.flatMap(ex => 
      ex.sets.map((s: any) => ({
        exercise_id: ex.exercise_id,
        set_number: s.setNumber,
        reps: s.reps,
        weight: s.weight,
        is_completed: s.isCompleted
      }))
    );
    updateMutation.mutate({ sets: flatSets });
  };

  const updateSet = (uniqueId: string, setId: string, field: 'weight'|'reps', value: number) => {
    setExercises(prev => prev.map(ex => {
      if (ex.uniqueId !== uniqueId) return ex;
      return {
        ...ex,
        sets: ex.sets.map((s: any) => s.id === setId ? { ...s, [field]: value } : s)
      };
    }));
  };

  const toggleComplete = (uniqueId: string, setId: string) => {
    setExercises(prev => prev.map(ex => {
      if (ex.uniqueId !== uniqueId) return ex;
      return {
        ...ex,
        sets: ex.sets.map((s: any) => s.id === setId ? { ...s, isCompleted: !s.isCompleted } : s)
      };
    }));
  };

  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} color={theme.colors.primary} />;

  return (
    <Container>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 16 }}>
            <Text style={{ fontSize: 24, color: theme.colors.primary }}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>Edit: {data?.routine_name}</Text>
      </View>

      <FlatList 
        data={exercises}
        keyExtractor={item => item.uniqueId}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item: exercise }) => (
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
             <Text style={[styles.exTitle, { color: theme.colors.text }]}>{exercise.name}</Text>
             {exercise.sets.map((set: any) => (
                <SetRow 
                    key={set.id}
                    {...set}
                    onUpdate={(f, v) => updateSet(exercise.uniqueId, set.id, f, v)}
                    onToggleComplete={() => toggleComplete(exercise.uniqueId, set.id)}
                />
             ))}
          </View>
        )}
      />

      <TouchableOpacity 
        style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]}
        onPress={handleSave}
      >
          <Text style={styles.btnText}>{updateMutation.isPending ? "Saving..." : "Save Changes"}</Text>
      </TouchableOpacity>
    </Container>
  );
}

const styles = StyleSheet.create({
    header: { padding: 16, flexDirection: 'row', alignItems: 'center' },
    title: { fontSize: 22, fontWeight: 'bold' },
    card: { padding: 16, borderRadius: 12, marginBottom: 12 },
    exTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
    saveBtn: { margin: 16, padding: 16, borderRadius: 12, alignItems: 'center' },
    btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});