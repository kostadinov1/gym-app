import React, { useState } from 'react';
import { View, StyleSheet, Modal, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { Calendar } from 'react-native-calendars'; // <--- Restored Import

import { useTheme } from '../../theme';
import { getPlanDetails, createRoutine, updatePlan } from '../../api/plans';
import { Container } from '../../components/common/Container';
import { SwipeWrapper } from '../../components/common/SwipeWrapper';

// COMPONENTS
import { PlanHeader } from '../../components/plans/PlanHeader';
import { WeekSelector } from '../../components/plans/WeekSelector';
import { DayRoutineCard } from '../../components/plans/DayRoutineCard';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function PlanDetailsScreen() {
    const theme = useTheme();
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { planId } = route.params;
    const queryClient = useQueryClient();

    // UI State
    const [currentWeek, setCurrentWeek] = useState(1);

    // Edit Plan Modal State
    const [isEditModalVisible, setEditModalVisible] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDate, setEditDate] = useState('');

    // Create Routine Modal State
    const [isRoutineModalVisible, setRoutineModalVisible] = useState(false);
    const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
    const [routineName, setRoutineName] = useState('');
    const [routineType, setRoutineType] = useState<'workout' | 'rest'>('workout');

    // 1. DATA FETCHING
    const { data, isLoading } = useQuery({
        queryKey: ['planDetails', planId],
        queryFn: () => getPlanDetails(planId),
    });

    // 2. MUTATIONS
    const updatePlanMutation = useMutation({
        mutationFn: () => updatePlan(planId, { name: editName, start_date: editDate }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['planDetails', planId] });
            // Invalidate routines so Active Workout recalculates math immediately
            queryClient.invalidateQueries({ queryKey: ['routines'] });
            setEditModalVisible(false);
            Toast.show({ type: 'success', text1: 'Plan Updated' });
        },
        onError: (err) => Toast.show({ type: 'error', text1: 'Update Failed', text2: (err as Error).message })
    });


    const createRoutineMutation = useMutation({
        mutationFn: () => {
            // DEBUG: This confirms what we send to the API function
            console.log("Creating Routine:", { routineName, selectedDayIndex, routineType });
            return createRoutine(planId, routineName, selectedDayIndex!, routineType);

        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['planDetails', planId] });
            setRoutineModalVisible(false);

            Toast.show({ type: 'success', text1: 'Routine Added' });
            // Reset State
            setRoutineName('');
            setRoutineType('workout');
        },
        onError: (err) => Toast.show({ type: 'error', text1: 'Error', text2: (err as Error).message })
    });

    // 3. HANDLERS
    const changeWeek = (direction: 'next' | 'prev') => {
        if (!data) return;
        if (direction === 'next' && currentWeek < data.duration_weeks) setCurrentWeek(c => c + 1);
        if (direction === 'prev' && currentWeek > 1) setCurrentWeek(c => c - 1);
    };

    const handleAddRoutinePress = (dayIndex: number) => {
        setSelectedDayIndex(dayIndex);
        setRoutineName('');
        setRoutineType('workout');
        setRoutineModalVisible(true);
    };

    const handleEditPlanPress = () => {
        if (data) {
            setEditName(data.name);
            setEditDate(data.start_date.split('T')[0]);
            setEditModalVisible(true);
        }
    };

    if (isLoading || !data) return (
        <Container style={{ justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator color={theme.colors.primary} />
        </Container>
    );

    return (
        <SwipeWrapper onSwipeLeft={() => changeWeek('next')} onSwipeRight={() => changeWeek('prev')}>
            <Container isScrollable={true}>

                <PlanHeader
                    title={data.name}
                    subtitle={`${data.duration_weeks} Weeks Plan`}
                    onBack={() => navigation.goBack()}
                    onSettings={handleEditPlanPress} // <--- Restored Link
                />

                <WeekSelector
                    currentWeek={currentWeek}
                    totalWeeks={data.duration_weeks}
                    onPrev={() => changeWeek('prev')}
                    onNext={() => changeWeek('next')}
                />

                <View style={{ padding: 16 }}>
                    {DAYS.map((dayName, index) => {
                        const routine = data.routines.find(r => r.day_of_week === index);
                        return (
                            <DayRoutineCard
                                key={index}
                                dayName={dayName}
                                routine={routine}
                                currentWeek={currentWeek}
                                onAddPress={() => handleAddRoutinePress(index)}
                                onPress={() => navigation.navigate('RoutineEditor', {
                                    routineId: routine?.id,
                                    routineName: routine?.name,
                                    planId: planId
                                })}
                            />
                        );
                    })}
                </View>

                {/* --- 1. EDIT PLAN MODAL (Restored) --- */}
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
                                markedDates={{ [editDate]: { selected: true, selectedColor: theme.colors.primary } }}
                                theme={{ calendarBackground: theme.colors.card, dayTextColor: theme.colors.text, arrowColor: theme.colors.primary }}
                                style={{ borderRadius: 8, marginBottom: 16, height: 320 }}
                            />

                            <View style={styles.modalButtons}>
                                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                                    <Text style={{ color: theme.colors.textSecondary, fontSize: 16 }}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => updatePlanMutation.mutate()}>
                                    <Text style={{ color: theme.colors.primary, fontWeight: 'bold', fontSize: 16 }}>Save</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* --- 2. CREATE ROUTINE MODAL --- */}
                <Modal visible={isRoutineModalVisible} transparent animationType="fade">
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
                            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Add Routine</Text>
                            <TextInput
                                style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
                                placeholder="e.g. Pull Day A"
                                placeholderTextColor={theme.colors.textSecondary}
                                value={routineName}
                                onChangeText={setRoutineName}
                                autoFocus
                            />

                            {/* Type Selector */}
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
                                        setRoutineName('Rest Day');
                                    }}
                                >
                                    <Text style={{ color: routineType === 'rest' ? 'white' : theme.colors.textSecondary }}>💤 Rest</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.modalButtons}>
                                <TouchableOpacity onPress={() => setRoutineModalVisible(false)}>
                                    <Text style={{ color: theme.colors.textSecondary }}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => createRoutineMutation.mutate()}>
                                    <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>Create</Text>
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
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 32 },
    modalContent: { padding: 24, borderRadius: 16 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
    label: { fontSize: 16, fontWeight: '600', marginBottom: 8, marginTop: 8 },
    input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 },
    modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 24 },
    typeButton: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ccc', alignItems: 'center' }
});