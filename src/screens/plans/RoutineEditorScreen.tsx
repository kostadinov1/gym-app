import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../theme';
import { getExercises } from '../../api/exercises';
import { addExerciseTarget } from '../../api/plans'; // We need to add this export to api/plans.ts

export default function RoutineEditorScreen() {
  const theme = useTheme();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { routineId, routineName } = route.params; // Passed from PlanDetails
  const queryClient = useQueryClient();

  // State for Modal
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  
  // Target Inputs
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('10');
  const [weight, setWeight] = useState('20');
  const [increment, setIncrement] = useState('2.5');

  // 1. Fetch Available Exercises (for the picker)
  const { data: exercises, isLoading: loadingEx } = useQuery({
    queryKey: ['exercises'],
    queryFn: getExercises,
  });

  // 2. Mutation to Save
  const addMutation = useMutation({
    mutationFn: () => addExerciseTarget(routineId, {
        exercise_id: selectedExerciseId!,
        order_index: 1, // Logic for order needed later, default 1 for now
        target_sets: parseInt(sets),
        target_reps: parseInt(reps),
        target_weight: parseFloat(weight),
        increment_value: parseFloat(increment),
        rest_seconds: 90
    }),
    onSuccess: () => {
        Alert.alert("Success", "Exercise Added!");
        setModalVisible(false);
        // Invalidate Plan Details so the previous screen updates
        queryClient.invalidateQueries({ queryKey: ['planDetails'] });
        navigation.goBack(); 
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

      {/* Main Content: Just a big add button for now (since we don't fetch current exercises here yet) */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: theme.colors.textSecondary, marginBottom: 20 }}>
              (List of current exercises would go here)
          </Text>
          
          <TouchableOpacity 
            style={[styles.bigButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => setModalVisible(true)}
          >
              <Text style={{ color: 'white', fontWeight: 'bold' }}>+ Add Exercise</Text>
          </TouchableOpacity>
      </View>

      {/* MODAL: Pick Exercise & Set Targets */}
      <Modal visible={isModalVisible} animationType="slide">
          <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
              <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: '#eee' }}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', flex: 1, color: theme.colors.text }}>Configure Exercise</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                      <Text style={{ color: theme.colors.primary }}>Close</Text>
                  </TouchableOpacity>
              </View>

              <View style={{ padding: 16 }}>
                  {/* Step 1: Pick Exercise */}
                  <Text style={[styles.label, { color: theme.colors.text }]}>1. Select Exercise</Text>
                  <View style={{ height: 150, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, marginBottom: 16 }}>
                      {loadingEx ? <ActivityIndicator /> : (
                          <FlatList 
                            data={exercises}
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

                  {/* Step 2: Inputs */}
                  <Text style={[styles.label, { color: theme.colors.text }]}>2. Set Targets</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                          <Text style={{ color: theme.colors.textSecondary }}>Sets</Text>
                          <TextInput style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]} value={sets} onChangeText={setSets} keyboardType="numeric" />
                      </View>
                      <View style={{ flex: 1 }}>
                          <Text style={{ color: theme.colors.textSecondary }}>Reps</Text>
                          <TextInput style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]} value={reps} onChangeText={setReps} keyboardType="numeric" />
                      </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                          <Text style={{ color: theme.colors.textSecondary }}>Weight (kg)</Text>
                          <TextInput style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]} value={weight} onChangeText={setWeight} keyboardType="numeric" />
                      </View>
                      <View style={{ flex: 1 }}>
                          <Text style={{ color: theme.colors.textSecondary }}>Increment</Text>
                          <TextInput style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]} value={increment} onChangeText={setIncrement} keyboardType="numeric" />
                      </View>
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
  input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16 }
});