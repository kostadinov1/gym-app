import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { getRoutines } from '../api/workouts';

export default function HomeScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>(); // We'll fix types later

  const { data, isLoading } = useQuery({
    queryKey: ['routines'],
    queryFn: getRoutines,
  });

  if (isLoading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color={theme.colors.primary} />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.header, { color: theme.colors.text }]}>Choose Workout</Text>
      
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.card, { backgroundColor: theme.colors.card }]}
            onPress={() => navigation.navigate('ActiveWorkout', { routineId: item.id })}
          >
            <View>
              <Text style={[styles.title, { color: theme.colors.text }]}>{item.name}</Text>
              <Text style={{ color: theme.colors.textSecondary }}>
                {/* Simple logic to show day name or 'Flexible' */}
                {item.day_of_week !== null 
                  ? ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][item.day_of_week!] 
                  : 'Flexible Schedule'}
              </Text>
            </View>
            <Text style={{ fontSize: 24, color: theme.colors.textSecondary }}>›</Text>
          </TouchableOpacity>
        )}
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