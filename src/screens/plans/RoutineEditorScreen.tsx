import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../theme';
import { getExercises } from '../../api/exercises';
import { addExerciseTarget, deleteRoutine, deleteRoutineExercise, getPlanDetails, updateRoutine, updateRoutineExercise } from '../../api/plans';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';

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



    const [isRenameModalVisible, setRenameModalVisible] = useState(false);
    const [newName, setNewName] = useState(routineName);


    const [editingTargetId, setEditingTargetId] = useState<string | null>(null);

    // Update Mutation
    const updateExParamsMutation = useMutation({
        mutationFn: (payload: any) => updateRoutineExercise(editingTargetId!, payload),
        onSuccess: () => {
            setModalVisible(false);
            setEditingTargetId(null);
            queryClient.invalidateQueries({ queryKey: ['planDetails'] });
            Toast.show({ type: 'success', text1: 'Exercise updated' });
        }
    });

    const updateRoutineMutation = useMutation({
        mutationFn: () => updateRoutine(routineId, newName),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['planDetails'] });
            setRenameModalVisible(false);
            Toast.show({ type: 'success', text1: 'Routine renamed' });
        }
    });

    const deleteRoutineMutation = useMutation({
        mutationFn: () => deleteRoutine(routineId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['planDetails'] });
            navigation.goBack();
            Toast.show({ type: 'success', text1: 'Routine deleted' });
        }
    });

    const { data: planData } = useQuery({
        queryKey: ['planDetails', planId],
        queryFn: () => getPlanDetails(planId),
        enabled: !!planId
    });

    const currentRoutine = planData?.routines.find(r => r.id === routineId);
    // Check if it is rest
    const isRest = currentRoutine?.routine_type === 'rest';

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

            // --- FIX: Force 0 if it is a Rest Day ---
            increment_weight: isRest ? 0 : (parseFloat(incWeight) || 0),
            increment_reps: isRest ? 0 : (parseInt(incReps) || 0)
        }),
        onSuccess: () => {
            setModalVisible(false);
            queryClient.invalidateQueries({ queryKey: ['planDetails'] });
        },
        onError: (err) => Alert.alert("Error", (err as Error).message)
    });

    const handleSave = () => {
        if (!selectedExerciseId) return;

        const payload = {
            target_sets: parseInt(sets) || 0,
            target_reps: parseInt(reps) || 0,
            target_weight: parseFloat(weight) || 0,
            increment_weight: isRest ? 0 : (parseFloat(incWeight) || 0),
            increment_reps: isRest ? 0 : (parseInt(incReps) || 0),
        };

        if (editingTargetId) {
            updateExParamsMutation.mutate(payload);
        } else {
            addMutation.mutate(); // This uses your existing addMutation
        }
    };

    const deleteExMutation = useMutation({
        mutationFn: (id: string) => deleteRoutineExercise(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['planDetails'] });
            Toast.show({ type: 'success', text1: 'Exercise removed' });
        }
    });

    const handleDeleteExercise = (id: string, name: string) => {
        Alert.alert("Remove Exercise", `Remove ${name} from this routine?`, [
            { text: "Cancel", style: "cancel" },
            { text: "Remove", style: "destructive", onPress: () => deleteExMutation.mutate(id) }
        ]);
    };

    const handleEditExercisePress = (item: any) => {
        setEditingTargetId(item.id);
        setSelectedExerciseId(item.exercise_id); // Lock the exercise
        setSets(String(item.target_sets));
        setReps(String(item.target_reps));
        setWeight(String(item.target_weight));
        setIncWeight(String(item.increment_weight));
        setIncReps(String(item.increment_reps));
        setModalVisible(true);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
                </TouchableOpacity>

                <View style={{ flex: 1 }}>
                    <Text style={[styles.header, { color: theme.colors.text }]} numberOfLines={1}>
                        {currentRoutine?.name || routineName}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary }}>Manage Exercises</Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 15 }}>
                    <TouchableOpacity onPress={() => setRenameModalVisible(true)}>
                        <Ionicons name="create-outline" size={24} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => {
                        Alert.alert("Delete Routine", "Are you sure? This will remove all exercises in this day.", [
                            { text: "Cancel" },
                            { text: "Delete", style: "destructive", onPress: () => deleteRoutineMutation.mutate() }
                        ]);
                    }}>
                        <Ionicons name="trash-outline" size={24} color={theme.colors.error} />
                    </TouchableOpacity>
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
                    <View style={[styles.card, { backgroundColor: theme.colors.card, flexDirection: 'row', alignItems: 'center', padding: 0 }]}>
                        {/* Clickable Area for Editing */}
                        <TouchableOpacity
                            onPress={() => handleEditExercisePress(item)}
                            style={{ flex: 1, padding: 16 }}
                        >
                            <View>
                                <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{item.name}</Text>
                                <Text style={{ color: theme.colors.textSecondary }}>
                                    {item.target_sets} x {item.target_reps} @ {item.target_weight}kg
                                </Text>
                                {!isRest && (
                                    <Text style={{ fontSize: 12, color: theme.colors.primary, marginTop: 4 }}>
                                        Progress: +{item.increment_weight}kg, +{item.increment_reps} reps /week
                                    </Text>
                                )}
                            </View>
                        </TouchableOpacity>

                        {/* Delete Button (Separate from edit area) */}
                        <TouchableOpacity
                            onPress={() => handleDeleteExercise(item.id, item.name)}
                            style={{ padding: 20 }}
                        >
                            <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                        </TouchableOpacity>
                    </View>
                )}
            />

            <View style={{ padding: 16 }}>
                <TouchableOpacity
                    style={[styles.bigButton, { backgroundColor: theme.colors.primary }]}
                    onPress={() => {
                        setEditingTargetId(null);
                        setSelectedExerciseId(null);
                        setSets('3'); setReps('10'); setWeight('20'); setIncWeight('2.5'); setIncReps('0');
                        setModalVisible(true);
                    }}
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
                        {!editingTargetId && (
                            <>
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
                            </>
                        )}
                        {editingTargetId && (
                            <Text style={[styles.label, { color: theme.colors.primary, marginBottom: 16 }]}>
                                Editing: {existingExercises.find(e => e.id === editingTargetId)?.name}
                            </Text>
                        )}
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

                            {/* --- CONDITIONAL RENDER --- */}
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: theme.colors.textSecondary }}>+Kg / Week</Text>
                                <TextInput
                                    style={[
                                        styles.input,
                                        { color: theme.colors.text, borderColor: theme.colors.border },
                                        isRest && { backgroundColor: theme.colors.background, opacity: 0.5 } // Visual feedback
                                    ]}
                                    value={isRest ? "0" : incWeight} // Force "0" if Rest Day
                                    onChangeText={setIncWeight}
                                    keyboardType="numeric"
                                    editable={!isRest} // <--- BLOCK INPUT
                                    selectTextOnFocus={!isRest}
                                />
                            </View>
                        </View>

                        {/* Row 3: Rep Increment */}

                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: theme.colors.textSecondary }}>+Reps / Week</Text>
                                <TextInput
                                    style={[
                                        styles.input,
                                        { color: theme.colors.text, borderColor: theme.colors.border },
                                        isRest && { backgroundColor: theme.colors.background, opacity: 0.5 } // Visual feedback
                                    ]}
                                    value={isRest ? "0" : incReps}
                                    onChangeText={setIncReps}
                                    keyboardType="numeric"
                                    editable={!isRest} // <--- BLOCK INPUT
                                />
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
            {/* --- RENAME ROUTINE MODAL --- */}
            <Modal visible={isRenameModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
                        <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Rename Routine</Text>
                        <TextInput
                            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
                            placeholder="e.g. Heavy Pull"
                            placeholderTextColor={theme.colors.textSecondary}
                            value={newName}
                            onChangeText={setNewName}
                            autoFocus
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity onPress={() => setRenameModalVisible(false)}>
                                <Text style={{ color: theme.colors.textSecondary }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => updateRoutineMutation.mutate()}
                                disabled={!newName.trim() || updateRoutineMutation.isPending}
                            >
                                <Text style={{
                                    color: theme.colors.primary,
                                    fontWeight: 'bold',
                                    opacity: !newName.trim() ? 0.5 : 1
                                }}>
                                    {updateRoutineMutation.isPending ? "Saving..." : "Rename"}
                                </Text>
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
    bigButton: { padding: 16, borderRadius: 12, alignItems: 'center' },
    label: { fontWeight: 'bold', marginBottom: 8, fontSize: 16 },
    input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
    card: { padding: 16, borderRadius: 12, marginBottom: 8 },
    cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 32
    },
    modalContent: {
        padding: 24,
        borderRadius: 16
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 24,
        marginTop: 8
    },
});