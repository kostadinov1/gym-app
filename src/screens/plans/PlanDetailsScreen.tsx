import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../theme';
import { getPlanDetails, createRoutine, updatePlan } from '../../api/plans';
import { Container } from '../../components/common/Container';
import { SwipeWrapper } from '../../components/common/SwipeWrapper'; // <--- Import
import { Calendar } from 'react-native-calendars';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function PlanDetailsScreen() {
    const theme = useTheme();
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { planId } = route.params;
    const queryClient = useQueryClient();

    const [isEditModalVisible, setEditModalVisible] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDate, setEditDate] = useState('');

    const [isModalVisible, setModalVisible] = useState(false);
    const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
    const [routineName, setRoutineName] = useState('');
    const [routineType, setRoutineType] = useState<'workout' | 'rest'>('workout');
    // NEW: Week State
    const [currentWeek, setCurrentWeek] = useState(1);

    const { data, isLoading } = useQuery({
        queryKey: ['planDetails', planId],
        queryFn: () => getPlanDetails(planId),
    });

    const createMutation = useMutation({
        mutationFn: () => createRoutine(planId, routineName, selectedDayIndex!, routineType),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['planDetails', planId] });
            setModalVisible(false);
            setRoutineName('');
            setRoutineType('workout');

            // --- NEW: Success Message ---
            Toast.show({
                type: 'success',
                text1: 'Routine Added',
                text2: `${routineName} added to the plan.`
            });
        },
        onError: (err) => {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: (err as Error).message
            });
        }
    });

    const updatePlanMutation = useMutation({
        mutationFn: () => updatePlan(planId, { name: editName, start_date: editDate }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['planDetails', planId] });
            queryClient.invalidateQueries({ queryKey: ['routines'] });
            setEditModalVisible(false);

            // --- NEW: Success Message ---
            Toast.show({
                type: 'success',
                text1: 'Plan Updated',
                text2: 'Start date and details saved.'
            });
        },
        onError: (err) => {
            // Use Toast instead of Alert
            Toast.show({
                type: 'error',
                text1: 'Update Failed',
                text2: (err as Error).message
            });
        }
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
        <Container style={{ justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator color={theme.colors.primary} />
        </Container>
    );

    const getRoutineForDay = (dayIndex: number) => {
        return data.routines.find(r => r.day_of_week === dayIndex);
    };



    const openEditModal = () => {
        if (data) {
            setEditName(data.name);
            setEditDate(data.start_date.split('T')[0]);
            setEditModalVisible(true);
        }
    };

    return (
        <SwipeWrapper
            onSwipeLeft={() => changeWeek('next')}
            onSwipeRight={() => changeWeek('prev')}
        >
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

                    {/* --- NEW: Settings Button --- */}
                    <TouchableOpacity onPress={openEditModal}>
                        <Text style={{ fontSize: 24 }}>⚙️</Text>
                    </TouchableOpacity>
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
                        const isRest = routine?.routine_type === 'rest';

                        return (
                            <View key={dayName} style={[styles.dayRow, { backgroundColor: theme.colors.card }]}>
                                <View style={styles.dayLabel}>
                                    <Text style={{ fontWeight: 'bold', color: theme.colors.textSecondary }}>{dayName.substring(0, 3).toUpperCase()}</Text>
                                </View>

                                <View style={{ flex: 1 }}>
                                    {routine ? (
                                        <TouchableOpacity
                                            style={[
                                                styles.routineCard,
                                                // If Rest: Use successBackground (Light Green), else InputBackground (Light Gray)
                                                { backgroundColor: isRest ? theme.colors.successBackground : theme.colors.inputBackground },
                                                // Remove the heavy border, make it subtle
                                                isRest && { borderColor: theme.colors.success, borderWidth: 1 }
                                            ]}
                                            disabled={isRest}
                                            onPress={() => navigation.navigate('RoutineEditor', {
                                                routineId: routine.id,
                                                routineName: routine.name,
                                                planId: planId
                                            })}
                                        >
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: isRest ? 0 : 8 }}>

                                                {/* TITLE SECTION */}
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                    {isRest && <Ionicons name="battery-charging" size={18} color={theme.colors.success} />}
                                                    <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.text }}>
                                                        {routine.name}
                                                    </Text>
                                                </View>

                                                {/* EDIT LABEL (Hide on Rest) */}
                                                {!isRest && <Text style={{ fontSize: 12, color: theme.colors.primary }}>Edit</Text>}
                                            </View>

                                            {/* BODY SECTION */}
                                            {isRest ? (
                                                <View style={{ marginTop: 4 }}>
                                                    <Text style={{ color: theme.colors.success, fontSize: 13, fontStyle: 'italic' }}>
                                                        Active Recovery • Mobility • Sleep
                                                    </Text>
                                                </View>
                                            ) : (
                                                <>
                                                    {routine.exercises.length === 0 && (
                                                        <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>No exercises yet.</Text>
                                                    )}
                                                    {routine.exercises.map(ex => {
                                                        // ... (Keep your existing progression math here) ...
                                                        const weeksPassed = currentWeek - 1;
                                                        const currentWeight = ex.target_weight + ((ex.increment_weight || 0) * weeksPassed);
                                                        const currentReps = ex.target_reps + ((ex.increment_reps || 0) * weeksPassed);

                                                        return (
                                                            <View key={ex.id} style={{ marginTop: 4 }}>
                                                                <Text style={{ color: theme.colors.text }}>
                                                                    {ex.target_sets} x {currentReps} @ {currentWeight}kg
                                                                </Text>
                                                            </View>
                                                        );
                                                    })}
                                                </>
                                            )}
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

                            {/* TYPE SELECTOR */}
                            <View style={{ flexDirection: 'row', marginBottom: 20, gap: 12 }}>
                                <TouchableOpacity
                                    style={[
                                        styles.typeButton,
                                        routineType === 'workout' && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                                    ]}
                                    onPress={() => setRoutineType('workout')}
                                >
                                    <Text style={{ color: routineType === 'workout' ? 'white' : theme.colors.textSecondary }}>💪 Workout</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.typeButton,
                                        routineType === 'rest' && { backgroundColor: theme.colors.success, borderColor: theme.colors.success }
                                    ]}
                                    onPress={() => {
                                        setRoutineType('rest');
                                        setRoutineName('Rest Day'); // Auto-fill name for convenience
                                    }}
                                >
                                    <Text style={{ color: routineType === 'rest' ? 'white' : theme.colors.textSecondary }}>💤 Rest</Text>
                                </TouchableOpacity>
                            </View>
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

                {/* --- NEW: Edit Plan Modal --- */}
                <Modal visible={isEditModalVisible} animationType="slide" transparent>
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
                            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Edit Plan</Text>

                            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Plan Name</Text>
                            <TextInput
                                style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
                                value={editName}
                                onChangeText={setEditName}
                            />

                            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Start Date</Text>
                            <Calendar
                                current={editDate}
                                onDayPress={(day: any) => setEditDate(day.dateString)}
                                markedDates={{
                                    [editDate]: { selected: true, selectedColor: theme.colors.primary }
                                }}
                                theme={{
                                    calendarBackground: theme.colors.card,
                                    dayTextColor: theme.colors.text,
                                    monthTextColor: theme.colors.text,
                                    arrowColor: theme.colors.primary,
                                }}
                                style={{ borderRadius: 8, marginBottom: 16, height: 320 }}
                            />

                            <View style={styles.modalButtons}>
                                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                                    <Text style={{ color: theme.colors.textSecondary, fontSize: 16 }}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => updatePlanMutation.mutate()}>
                                    <Text style={{ color: theme.colors.primary, fontWeight: 'bold', fontSize: 16 }}>Save Changes</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

            </Container>
        </SwipeWrapper>
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
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 8
    },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 32 },
    modalContent: { padding: 24, borderRadius: 16 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
    input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 },
    modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 24 },
    typeButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ccc',
        alignItems: 'center'
    }
});