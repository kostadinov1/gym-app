import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';

import { useTheme } from '../../theme';
import { useStorage } from '../../context/StorageContext';
import { useUnits } from '../../context/UnitsContext';
import { ScreenHeader } from '../../components/ui/ScreenHeader';

export default function HistoryDetailsScreen() {
  const theme = useTheme();
  const db = useStorage();
  const { kgToDisplay, unitLabel } = useUnits();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { sessionId } = route.params;

  const { data, isLoading } = useQuery({
    queryKey: ['sessionDetails', sessionId],
    queryFn: () => db.getSessionDetails(sessionId),
  });

  if (isLoading || !data) {
    return (
      <SafeAreaView edges={[]} style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator style={{ flex: 1 }} color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  const groupedSets = data.sets.reduce((acc: any, set) => {
    if (!acc[set.exercise_name]) acc[set.exercise_name] = [];
    acc[set.exercise_name].push(set);
    return acc;
  }, {});

  const exerciseNames = Object.keys(groupedSets);

  return (
    <SafeAreaView edges={[]} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader
        title={data.routine_name}
        subtitle={`${new Date(data.start_time).toLocaleDateString()} · ${data.duration_minutes} min`}
        onBack={() => navigation.goBack()}
        rightElement={
          <TouchableOpacity onPress={() => navigation.navigate('SessionEditor', { sessionId })} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={[theme.typography.body, { color: theme.colors.primary, fontWeight: '600' }]}>Edit</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {exerciseNames.map((name) => (
          <View key={name} style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[theme.typography.title, styles.exerciseTitle, { color: theme.colors.text }]}>
              {name}
            </Text>
            {groupedSets[name].map((set: any, index: number) => (
              <View key={index} style={[styles.setRow, { borderBottomColor: theme.colors.border }]}>
                <View style={[styles.setBadge, { backgroundColor: theme.colors.surface }]}>
                  <Text style={[theme.typography.caption, { fontWeight: '700', color: theme.colors.textSecondary }]}>
                    {set.set_number}
                  </Text>
                </View>
                <Text style={[theme.typography.body, { color: theme.colors.text }]}>
                  {kgToDisplay(set.weight)}{unitLabel} × {set.reps}
                  {set.duration_seconds != null ? ` · ${set.duration_seconds}s` : ''}
                </Text>
              </View>
            ))}
          </View>
        ))}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8 },
  card: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  exerciseTitle: { marginBottom: 12 },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  setBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
});
