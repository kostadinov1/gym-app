import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native'; // Import navigation
import { useTheme } from '../theme';
import { getRoutines } from '../api/workouts';

export default function HomeScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['routines'],
    queryFn: getRoutines,
  });

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refetch();
    });
    return unsubscribe;
  }, [navigation, refetch]);

const isDoneToday = (dateString?: string | null) => {
    if (!dateString) return false;
    
    const now = new Date(); // Device time
    const completedAt = new Date(dateString); // Server time (UTC) converted to Object

    // .toDateString() returns "Tue Feb 08 2026" based on the DEVICE'S timezone/locale
    return now.toDateString() === completedAt.toDateString();
  };
  
  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={theme.colors.primary} />;

  // --- NEW: Empty State Component ---
  const EmptyState = () => (
    <View style={styles.emptyContainer}>
        <Text style={{ fontSize: 40, marginBottom: 10 }}>🏋️‍♂️</Text>
        <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Active Workouts</Text>
        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            You haven't set up a routine yet. Create a plan to get started!
        </Text>
        
        <TouchableOpacity 
            style={[styles.createButton, { backgroundColor: theme.colors.primary }]}
            // Redirect to the PLANS tab
            onPress={() => navigation.navigate('Plans')} 
        >
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Create a Plan</Text>
        </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.header, { color: theme.colors.text }]}>Today's Workout</Text>
      
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ flexGrow: 1 }} // Allows centering empty state
        ListEmptyComponent={EmptyState} // <--- Show this if list is empty
        renderItem={({ item }) => {
            // ... (Your existing renderItem code) ...
            const completed = isDoneToday(item.last_completed_at);
            return (
                <TouchableOpacity 
                  disabled={completed} 
                  style={[
                    styles.card, 
                    { backgroundColor: theme.colors.card },
                    completed && { opacity: 0.6, backgroundColor: theme.colors.background } 
                  ]}
                  onPress={() => navigation.navigate('ActiveWorkout', { routineId: item.id })}
                >
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={[styles.title, { color: completed ? theme.colors.textSecondary : theme.colors.text }]}>
                            {item.name}
                        </Text>
                        {completed && (
                            <View style={{ backgroundColor: theme.colors.success, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 }}>
                                <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>DONE</Text>
                            </View>
                        )}
                    </View>
                    <Text style={{ color: theme.colors.textSecondary }}>
                      {item.day_of_week !== null 
                        ? ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][item.day_of_week!] 
                        : 'Flexible Schedule'}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 24, color: completed ? theme.colors.success : theme.colors.textSecondary }}>
                    {completed ? '✓' : '›'}
                  </Text>
                </TouchableOpacity>
            );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { fontSize: 28, fontWeight: 'bold', margin: 16 },
  card: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16, // Add margin since list handles padding now
  },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  // Empty State Styles
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