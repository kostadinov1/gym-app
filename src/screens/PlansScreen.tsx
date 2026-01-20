import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTheme } from '../theme';
import { getPlans, deletePlan } from '../api/plans';

import { useNavigation } from '@react-navigation/native'; // Add this
import { FAB } from '../components/common/FAB';
import { Ionicons } from '@expo/vector-icons';

export default function PlansScreen() {
    const navigation = useNavigation<any>()

    const theme = useTheme();

    const { data, isLoading, refetch, error, isError } = useQuery({
        queryKey: ['plans'],
        queryFn: getPlans,
    });

    const deleteMutation = useMutation({
        mutationFn: deletePlan,
        onSuccess: () => refetch(),
        onError: (err) => Alert.alert("Error", (err as Error).message)
    });

    const handleDelete = (id: string, name: string) => {
        Alert.alert("Delete Plan", `Delete "${name}"?`, [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(id) }
        ]);
    };

    if (isLoading) return <ActivityIndicator style={{ flex: 1 }} color={theme.colors.primary} />;



        // --- NEW: Empty State Component ---
    const EmptyPlansState = () => (
        <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 40, marginBottom: 10 }}>📅</Text>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Plans Yet</Text>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                Create a macro-cycle to track your progressive overload.
            </Text>
            <TouchableOpacity 
                style={[styles.createButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => navigation.navigate('CreatePlan')} 
            >
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Create First Plan</Text>
            </TouchableOpacity>
        </View>
    );

    // ADD THIS BLOCK
    if (isError) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
                <Text style={{ color: theme.colors.error, fontSize: 16, marginBottom: 10 }}>Failed to load plans</Text>
                <Text style={{ color: theme.colors.textSecondary, marginBottom: 20 }}>{(error as Error).message}</Text>
                <TouchableOpacity
                    onPress={() => refetch()}
                    style={{ padding: 10, backgroundColor: theme.colors.card, borderRadius: 8 }}
                >
                    <Text style={{ color: theme.colors.primary }}>Try Again</Text>
                </TouchableOpacity>
            </View>
        );
    }



    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <Text style={[styles.header, { color: theme.colors.text }]}>My Plans</Text>

            <FlatList
                data={data}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={EmptyPlansState}
                contentContainerStyle={{ padding: 16 }}
                renderItem={({ item }) => (
                    <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
                        <TouchableOpacity
                            style={{ flex: 1 }} // <--- ADD THIS: Makes the click area fill the space
                            onPress={() => navigation.navigate('PlanDetails', { planId: item.id })}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.title, { color: theme.colors.text }]}>{item.name}</Text>
                                <Text style={{ color: theme.colors.textSecondary }}>
                                    {item.duration_weeks} Weeks • {new Date(item.start_date).toLocaleDateString()}
                                </Text>
                                {/* Status Badge */}
                                <View style={[styles.badge, { backgroundColor: item.is_active ? theme.colors.success : theme.colors.border, marginTop: 8 }]}>
                                    <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                                        {item.is_active ? "ACTIVE" : "ARCHIVED"}
                                    </Text>
                                </View>
                            </View>

                        </TouchableOpacity>
                        {/* Delete Button */}
                        <TouchableOpacity onPress={() => handleDelete(item.id, item.name)} style={{ padding: 8 }}>
                            <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                        </TouchableOpacity>
                    </View>
                )}
            />

            {/* FAB to Create New Plan */}
            {/* <FAB onPress={() => navigation.navigate('CreatePlan')} /> */}
            {data && data.length > 0 && (
                <FAB onPress={() => navigation.navigate('CreatePlan')} />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { fontSize: 28, fontWeight: 'bold', margin: 16 },
    card: { flexDirection: 'row', padding: 16, borderRadius: 12, marginBottom: 12 },
    title: { fontSize: 18, fontWeight: 'bold' },
    badge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    fab: {
        position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, justifyContent: 'center',
        alignItems: 'center', elevation: 0.01
    },
    fabText: {
        color: 'white',
        fontSize: 32,
        textAlign: 'center',
        textAlignVertical: 'center',
        includeFontPadding: false,
        // Small adjustment to visually center the "+" character
        lineHeight: 32,
    },
      // --- NEW STYLES ---
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
        marginTop: 50,
    },
    emptyTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
    emptyText: { textAlign: 'center', marginBottom: 24, fontSize: 16 },
    createButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    }

});