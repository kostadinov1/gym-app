import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../theme';
import { getPlanDetails, createRoutine } from '../../api/plans';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function PlanDetailsScreen() {
  const theme = useTheme();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { planId } = route.params;
  const queryClient = useQueryClient();

  // State for adding a new routine
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [routineName, setRoutineName] = useState('');

  // 1. Fetch Plan Details
  const { data, isLoading } = useQuery({
    queryKey: ['planDetails', planId],
    queryFn: () => getPlanDetails(planId),
  });

  // 2. Mutation to add a day
  const createMutation = useMutation({
    mutationFn: () => createRoutine(planId, routineName, selectedDayIndex!),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['planDetails', planId] });
        setModalVisible(false);
        setRoutineName('');
    },
    onError: (err) => Alert.alert("Error", (err as Error).message)
  });

  const handleAddPress = (dayIndex: number) => {
      setSelectedDayIndex(dayIndex);
      setRoutineName(''); // Reset
      setModalVisible(true);
  };

  const handleSaveRoutine = () => {
      if (!routineName) return;
      createMutation.mutate();
  };

  if (isLoading || !data) return <ActivityIndicator style={{ flex: 1 }} color={theme.colors.primary} />;

  // Helper to find if a routine exists for a specific day
  const getRoutineForDay = (dayIndex: number) => {
      return data.routines.find(r => r.day_of_week === dayIndex);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{ fontSize: 24, color: theme.colors.primary }}>←</Text>
        </TouchableOpacity>
        <View>
            <Text style={[styles.header, { color: theme.colors.text }]}>{data.name}</Text>
            <Text style={{ color: theme.colors.textSecondary }}>Weekly Schedule</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {DAYS.map((dayName, index) => {
            const routine = getRoutineForDay(index);
            
            return (
                <View key={dayName} style={[styles.dayRow, { backgroundColor: theme.colors.card }]}>
                    {/* Day Label (Left) */}
                    <View style={styles.dayLabel}>
                        <Text style={{ fontWeight: 'bold', color: theme.colors.textSecondary }}>{dayName.substring(0, 3).toUpperCase()}</Text>
                    </View>

                    {/* Content (Right) */}
                    <View style={{ flex: 1 }}>
                        {routine ? (
                            <TouchableOpacity 
                                style={[styles.routineCard, { backgroundColor: theme.colors.inputBackground }]}
                                // TODO: Navigate to Exercise Editor for this routine
                                   onPress={() => navigation.navigate('RoutineEditor', { 
        routineId: routine.id, 
        routineName: routine.name 
    })}
                            >
                                <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.text }}>{routine.name}</Text>
                                <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                                    {routine.exercises.length} Exercises
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity 
                                style={styles.addButton}
                                onPress={() => handleAddPress(index)}
                            >
                                <Text style={{ color: theme.colors.primary }}>+ Add Routine</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            );
        })}
      </ScrollView>

      {/* MODAL: Name the Routine */}
      <Modal visible={isModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                    {selectedDayIndex !== null ? DAYS[selectedDayIndex] : ''} Routine
                </Text>
                
                <TextInput 
                    style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
                    placeholder="e.g. Pull Day A"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={routineName}
                    onChangeText={setRoutineName}
                    autoFocus
                />

                <View style={styles.modalButtons}>
                    <TouchableOpacity onPress={() => setModalVisible(false)}>
                        <Text style={{ color: theme.colors.textSecondary }}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSaveRoutine}>
                        <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>Create</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  header: { fontSize: 20, fontWeight: 'bold' },
  dayRow: { flexDirection: 'row', marginBottom: 12, borderRadius: 12, padding: 12, alignItems: 'center' },
  dayLabel: { width: 50, alignItems: 'center', marginRight: 12 },
  addButton: { padding: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, alignItems: 'center' },
  routineCard: { padding: 12, borderRadius: 8 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 32 },
  modalContent: { padding: 24, borderRadius: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 24 }
});