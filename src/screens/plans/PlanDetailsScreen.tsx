import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../theme';
import { getPlanDetails, createRoutine } from '../../api/plans';
import { Container } from '../../components/common/Container';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function PlanDetailsScreen() {
  const theme = useTheme();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { planId } = route.params;
  const queryClient = useQueryClient();

  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [routineName, setRoutineName] = useState('');
  
  // NEW: Week State
  const [currentWeek, setCurrentWeek] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['planDetails', planId],
    queryFn: () => getPlanDetails(planId),
  });

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
      setRoutineName('');
      setModalVisible(true);
  };

  const handleSaveRoutine = () => {
      if (!routineName) return;
      createMutation.mutate();
  };

  // NEW: Helper to change weeks
  const changeWeek = (direction: 'next' | 'prev') => {
      if (!data) return;
      if (direction === 'next' && currentWeek < data.duration_weeks) {
          setCurrentWeek(c => c + 1);
      }
      if (direction === 'prev' && currentWeek > 1) {
          setCurrentWeek(c => c - 1);
      }
  };

  if (isLoading || !data) return (
    <Container style={{justifyContent:'center', alignItems:'center'}}>
        <ActivityIndicator color={theme.colors.primary} />
    </Container>
  );

  const getRoutineForDay = (dayIndex: number) => {
      return data.routines.find(r => r.day_of_week === dayIndex);
  };

  return (
    <Container isScrollable={true}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{ fontSize: 24, color: theme.colors.primary }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[styles.header, { color: theme.colors.text }]}>{data.name}</Text>
            <Text style={{ color: theme.colors.textSecondary }}>{data.duration_weeks} Weeks Plan</Text>
        </View>
        <View style={{ width: 24 }} /> 
      </View>

      {/* NEW: Week Selector */}
      <View style={[styles.weekSelector, { backgroundColor: theme.colors.card }]}>
          <TouchableOpacity onPress={() => changeWeek('prev')} disabled={currentWeek === 1}>
              <Text style={{ fontSize: 24, color: currentWeek === 1 ? theme.colors.border : theme.colors.primary }}>‹</Text>
          </TouchableOpacity>
          
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.weekLabel, { color: theme.colors.text }]}>Week {currentWeek}</Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Projections</Text>
          </View>

          <TouchableOpacity onPress={() => changeWeek('next')} disabled={currentWeek === data.duration_weeks}>
              <Text style={{ fontSize: 24, color: currentWeek === data.duration_weeks ? theme.colors.border : theme.colors.primary }}>›</Text>
          </TouchableOpacity>
      </View>

      <View style={{ padding: 16 }}>
        {DAYS.map((dayName, index) => {
            const routine = getRoutineForDay(index);
            
            return (
                <View key={dayName} style={[styles.dayRow, { backgroundColor: theme.colors.card }]}>
                    <View style={styles.dayLabel}>
                        <Text style={{ fontWeight: 'bold', color: theme.colors.textSecondary }}>{dayName.substring(0, 3).toUpperCase()}</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                        {routine ? (
                            <TouchableOpacity 
                                style={[styles.routineCard, { backgroundColor: theme.colors.inputBackground }]}
                                onPress={() => navigation.navigate('RoutineEditor', { 
                                    routineId: routine.id, 
                                    routineName: routine.name,
                                    planId: planId 
                                })}
                            >
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.text }}>{routine.name}</Text>
                                    <Text style={{ fontSize: 12, color: theme.colors.primary }}>Edit</Text>
                                </View>

                                {/* NEW: Render Exercise Projections */}
                                {routine.exercises.length === 0 && (
                                    <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>No exercises yet.</Text>
                                )}
                                
                                {routine.exercises.map(ex => {
                                    // THE MATH: Base + (Increment * (Week - 1))
                                    const projectedWeight = ex.target_weight + (ex.increment_value * (currentWeek - 1));
                                    
                                    return (
                                        <View key={ex.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <Text style={{ color: theme.colors.text, fontSize: 13, flex: 1 }}>{ex.name}</Text>
                                            <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
                                                {ex.target_sets}x{ex.target_reps} @ <Text style={{fontWeight:'bold', color: theme.colors.text}}>{projectedWeight}kg</Text>
                                            </Text>
                                        </View>
                                    )
                                })}
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
      </View>

      {/* Modal remains the same */}
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
    </Container>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  header: { fontSize: 20, fontWeight: 'bold' },
  weekSelector: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      paddingHorizontal: 24, 
      paddingVertical: 12,
      margin: 16,
      marginBottom: 0,
      borderRadius: 12,
      elevation: 2
  },
  weekLabel: { fontSize: 18, fontWeight: 'bold' },
  dayRow: { flexDirection: 'row', marginBottom: 12, borderRadius: 12, padding: 12, alignItems: 'flex-start' },
  dayLabel: { width: 50, paddingTop: 12, alignItems: 'center', marginRight: 12 },
  addButton: { padding: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, alignItems: 'center' },
  routineCard: { padding: 12, borderRadius: 8 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 32 },
  modalContent: { padding: 24, borderRadius: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 24 }
});