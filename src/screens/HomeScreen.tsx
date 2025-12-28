import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { getRoutines } from '../api/workouts';

export default function HomeScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();

  // Use useFocusEffect or refetchOnMount to ensure data refreshes when we come back from "Finish"
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
    const today = new Date().toISOString().split('T')[0];
    const completed = new Date(dateString).toISOString().split('T')[0];
    return today === completed;
  };

  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={theme.colors.primary} />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.header, { color: theme.colors.text }]}>Choose Workout</Text>
      
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const completed = isDoneToday(item.last_completed_at);
          
          return (
            <TouchableOpacity 
              // 1. HARD DISABLE: Cannot be clicked if completed
              disabled={completed} 
              
              style={[
                styles.card, 
                { backgroundColor: theme.colors.card },
                // 2. VISUAL DISABLE: Dim opacity and change background slightly
                completed && { opacity: 0.6, backgroundColor: theme.colors.background } 
              ]}
              onPress={() => navigation.navigate('ActiveWorkout', { routineId: item.id })}
            >
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={[
                        styles.title, 
                        // Grey out text if completed
                        { color: completed ? theme.colors.textSecondary : theme.colors.text }
                    ]}>
                        {item.name}
                    </Text>
                    
                    {/* The Badge */}
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
              
              {/* Icon Logic */}
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
  container: { flex: 1, padding: 16 },
  header: { fontSize: 28, fontWeight: 'bold', marginBottom: 24 },
  card: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
  },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 4 }
});