import React from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { getExercises, createExercise } from './src/api/exercises';
import { theme } from './src/theme';

const queryClient = new QueryClient();

function ExerciseListScreen() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['exercises'],
    queryFn: getExercises,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Unable to load exercises</Text>
        <Text style={styles.bodyText}>{(error as Error).message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Gym Progress</Text>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              {/* Badge for custom exercises */}
              {item.is_custom && <View style={styles.badge} />}
            </View>
            <Text style={styles.cardSubtitle}>
              Next increment: +{item.default_increment} {item.unit}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
         {/* Pass edges to handle top/bottom notches correctly */}
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
          <ExerciseListScreen />
        </SafeAreaView>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

// Organized Styles using the Theme
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: StatusBar.currentHeight,
  },
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.m,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    ...theme.text.header,
    color: theme.colors.text,
    marginVertical: theme.spacing.m,
  },
  listContent: {
    paddingBottom: theme.spacing.xl,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.m,
    padding: theme.spacing.m,
    marginBottom: theme.spacing.s,
    // Shadows
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  cardTitle: {
    ...theme.text.title,
    color: theme.colors.text,
  },
  cardSubtitle: {
    ...theme.text.body,
    color: theme.colors.textSecondary,
  },
  badge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  errorText: {
    ...theme.text.title,
    color: theme.colors.error,
    marginBottom: theme.spacing.s,
  },
  bodyText: {
    ...theme.text.body,
    color: theme.colors.textSecondary,
  }
});