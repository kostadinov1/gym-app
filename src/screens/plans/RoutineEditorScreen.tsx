import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../theme';
import { getExercises } from '../../api/exercises';
import { addExerciseTarget, getPlanDetails } from '../../api/plans';

export default function RoutineEditorScreen() {
  const theme = useTheme();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { routineId, routineName, planId } = route.params;
  const queryClient = useQueryClient();

  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  
  // State
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('10');
  const [weight, setWeight] = useState('20');
  const [incWeight, setIncWeight] = useState('2.5');
  const [incReps, setIncReps] = useState('0');

  const { data: planData } = useQuery({
    queryKey: ['planDetails', planId],
    queryFn: () => getPlanDetails(planId),
    enabled: !!planId
  });

  const currentRoutine = planData?.routines.find(r => r.id === routineId);
  const existingExercises = currentRoutine?.exercises || [];

  const { data: allExercises, isLoading: loadingEx } = useQuery({
    queryKey: ['exercises'],
    queryFn: getExercises,
  });

  const addMutation = useMutation({
    mutationFn: () => addExerciseTarget(routineId, {
        exercise_id: selectedExerciseId!,
        order_index: existingExercises.length + 1,
        target_sets: parseInt(sets) || 0,
        target_reps: parseInt(reps) || 0,
        target_weight: parseFloat(weight) || 0,
        rest_seconds: 90,
        increment_weight: parseFloat(incWeight) || 0,
        increment_reps: parseInt(incReps) || 0
    }),
    onSuccess: () => {
        setModalVisible(false);
        queryClient.invalidateQueries({ queryKey: ['planDetails'] });
    },
    onError: (err) => Alert.alert("Error", (err as Error).message)
  });

  const handleSave = () => {
      if(!selectedExerciseId) return;
      addMutation.mutate();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{ fontSize: 24, color: theme.colors.primary }}>←</Text>
        </TouchableOpacity>
        <View>
            <Text style={[styles.header, { color: theme.colors.text }]}>{routineName}</Text>
            <Text style={{ color: theme.colors.textSecondary }}>Add Exercises</Text>
        </View>
      </View>

      <FlatList 
        data={existingExercises}
        keyExtractor={(item) => item.id || item.exercise_id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
            <Text style={{ textAlign: 'center', marginTop: 20, color: theme.colors.textSecondary }}>
                No exercises yet. Tap + to add one.
            </Text>
        }
        renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
                <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{item.name}</Text>
                <Text style={{ color: theme.colors.textSecondary }}>
                    {item.target_sets} x {item.target_reps} @ {item.target_weight}kg
                </Text>
                {/* Visual feedback for increments */}
                <Text style={{ fontSize: 12, color: theme.colors.primary, marginTop: 4 }}>
                    Progress: +{item.increment_weight}kg, +{item.increment_reps} reps /week
                </Text>
            </View>
        )}
      />

      <View style={{ padding: 16 }}>
        <TouchableOpacity 
            style={[styles.bigButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => setModalVisible(true)}
        >
            <Text style={{ color: 'white', fontWeight: 'bold' }}>+ Add Exercise</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={isModalVisible} animationType="slide">
          <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
              <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: '#eee' }}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', flex: 1, color: theme.colors.text }}>Configure Exercise</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                      <Text style={{ color: theme.colors.primary }}>Close</Text>
                  </TouchableOpacity>
              </View>

              <View style={{ padding: 16 }}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>1. Select Exercise</Text>
                  <View style={{ height: 150, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, marginBottom: 16 }}>
                      {loadingEx ? <ActivityIndicator /> : (
                          <FlatList 
                            data={allExercises}
                            keyExtractor={item => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity 
                                    style={{ padding: 12, backgroundColor: selectedExerciseId === item.id ? theme.colors.primary : 'transparent' }}
                                    onPress={() => setSelectedExerciseId(item.id)}
                                >
                                    <Text style={{ color: selectedExerciseId === item.id ? 'white' : theme.colors.text }}>{item.name}</Text>
                                </TouchableOpacity>
                            )}
                          />
                      )}
                  </View>

                   <Text style={[styles.label, { color: theme.colors.text }]}>2. Set Targets</Text>
                  
                   {/* Row 1: Sets & Reps */}
                   <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                      <View style={{ flex: 1 }}>
                          <Text style={{ color: theme.colors.textSecondary }}>Sets</Text>
                          <TextInput style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]} value={sets} onChangeText={setSets} keyboardType="numeric" />
                      </View>
                      <View style={{ flex: 1 }}>
                          <Text style={{ color: theme.colors.textSecondary }}>Reps</Text>
                          <TextInput style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]} value={reps} onChangeText={setReps} keyboardType="numeric" />
                      </View>
                  </View>

                   {/* Row 2: Weight & Weight Increment */}
                   <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                      <View style={{ flex: 1 }}>
                          <Text style={{ color: theme.colors.textSecondary }}>Base Weight (kg)</Text>
                          <TextInput style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]} value={weight} onChangeText={setWeight} keyboardType="numeric" />
                      </View>
                      <View style={{ flex: 1 }}>
                          <Text style={{ color: theme.colors.textSecondary }}>+Kg / Week</Text>
                          <TextInput style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]} value={incWeight} onChangeText={setIncWeight} keyboardType="numeric" />
                      </View>
                  </View>

                   {/* Row 3: Rep Increment */}
                   <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                          <Text style={{ color: theme.colors.textSecondary }}>+Reps / Week</Text>
                          <TextInput style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]} value={incReps} onChangeText={setIncReps} keyboardType="numeric" />
                      </View>
                      <View style={{ flex: 1 }} /> 
                  </View>

                  <TouchableOpacity 
                    style={[styles.bigButton, { backgroundColor: theme.colors.primary, marginTop: 20 }]}
                    onPress={handleSave}
                  >
                      <Text style={{ color: 'white', fontWeight: 'bold' }}>Save to Routine</Text>
                  </TouchableOpacity>
              </View>
          </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  header: { fontSize: 20, fontWeight: 'bold' },
  bigButton: { padding: 16, borderRadius: 12, alignItems: 'center' },
  label: { fontWeight: 'bold', marginBottom: 8, fontSize: 16 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  card: { padding: 16, borderRadius: 12, marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 }
});