import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme';
import { useStorage } from '../context/StorageContext';
import { AdBanner } from '../components/AdBanner';
import type { Routine } from '../api/workouts';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Returns "Apr 14" style label from a YYYY-MM-DD string
const formatShortDate = (iso: string): string => {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// Returns "Week X of Y · Apr 14 – Apr 20"
const buildPlanSubtitle = (startDate: string, endDate: string, durationWeeks: number): string => {
  const today = new Date().toISOString().split('T')[0];
  const planStart = new Date(startDate + 'T00:00:00');
  const todayDate = new Date(today + 'T00:00:00');
  const daysDiff = Math.floor((todayDate.getTime() - planStart.getTime()) / 86_400_000);
  const weekNum = daysDiff >= 0 ? Math.min(Math.ceil((daysDiff + 1) / 7), durationWeeks) : 0;

  // Week range containing today
  const weekStart = new Date(planStart);
  weekStart.setDate(planStart.getDate() + Math.max(daysDiff - (daysDiff % 7), 0));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const weekStartStr = weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const weekEndStr = weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  if (today < startDate) {
    return `Starts ${formatShortDate(startDate)}`;
  }
  if (today > endDate) {
    return `Ended ${formatShortDate(endDate)}`;
  }
  return `Week ${weekNum} of ${durationWeeks} · ${weekStartStr} – ${weekEndStr}`;
};

export default function HomeScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const db = useStorage();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['homeScreen'],
    queryFn: () => db.getHomeScreenData(),
  });

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refetch();
    });
    return unsubscribe;
  }, [navigation, refetch]);

  const isDoneToday = (dateString?: string | null) => {
    if (!dateString) return false;
    const now = new Date();
    const completedAt = new Date(dateString);
    return now.toDateString() === completedAt.toDateString();
  };

  if (isLoading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color={theme.colors.primary} />;
  }

  const { plan, routines = [], todaySchemaDay = 0 } = data ?? {};

  // Sort: today's routine first, then by day_of_week, flexible last
  const sorted = [...routines].sort((a, b) => {
    const aToday = a.day_of_week === todaySchemaDay;
    const bToday = b.day_of_week === todaySchemaDay;
    if (aToday && !bToday) return -1;
    if (!aToday && bToday) return 1;
    const aDay = a.day_of_week ?? 999;
    const bDay = b.day_of_week ?? 999;
    return aDay - bDay;
  });

  const hasRoutineToday = routines.some(r => r.day_of_week === todaySchemaDay);

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={{ fontSize: 40, marginBottom: 10 }}>🏋️‍♂️</Text>
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Active Workouts</Text>
      <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
        You haven't set up a routine yet. Create a plan to get started!
      </Text>
      <TouchableOpacity
        style={[styles.createButton, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate('Plans', { screen: 'CreatePlan' })}
      >
        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Create a Plan</Text>
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }: { item: Routine }) => {
    const completed = isDoneToday(item.last_completed_at);
    const isToday = item.day_of_week === todaySchemaDay;

    let dayLabel: string;
    if (item.day_of_week === undefined || item.day_of_week === null) {
      dayLabel = 'Flexible Schedule';
    } else if (isToday) {
      dayLabel = 'Today';
    } else {
      dayLabel = DAY_LABELS[item.day_of_week];
    }

    return (
      <TouchableOpacity
        disabled={completed}
        style={[
          styles.card,
          { backgroundColor: theme.colors.card },
          isToday && !completed && styles.cardToday,
          isToday && !completed && { borderLeftColor: theme.colors.primary },
          !isToday && !completed && { opacity: 0.75 },
          completed && { opacity: 0.6, backgroundColor: theme.colors.background },
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
          <Text style={[
            styles.dayLabel,
            { color: isToday && !completed ? theme.colors.primary : theme.colors.textSecondary },
            isToday && !completed && { fontWeight: '700' },
          ]}>
            {dayLabel}
          </Text>
        </View>
        <Text style={{ fontSize: 24, color: completed ? theme.colors.success : theme.colors.textSecondary }}>
          {completed ? '✓' : '›'}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerBlock}>
        <Text style={[styles.header, { color: theme.colors.text }]}>Today's Workout</Text>
        {plan && (
          <View>
            <Text style={[styles.planName, { color: theme.colors.textSecondary }]}>
              {plan.name}
            </Text>
            <Text style={[styles.planMeta, { color: theme.colors.textSecondary }]}>
              {buildPlanSubtitle(plan.startDate, plan.endDate, plan.durationWeeks)}
            </Text>
          </View>
        )}
        {plan && !hasRoutineToday && routines.length > 0 && (
          <Text style={[styles.restNote, { color: theme.colors.textSecondary }]}>
            No scheduled workout today
          </Text>
        )}
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 8 }}
        ListEmptyComponent={EmptyState}
        renderItem={renderItem}
      />
      <AdBanner />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBlock: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  header: { fontSize: 28, fontWeight: 'bold', marginBottom: 2 },
  planName: { fontSize: 15, fontWeight: '600', marginTop: 2 },
  planMeta: { fontSize: 13, marginTop: 2, marginBottom: 4 },
  restNote: { fontSize: 13, fontStyle: 'italic', marginTop: 4 },
  card: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  cardToday: {
    borderLeftWidth: 4,
    paddingLeft: 16,
  },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  dayLabel: { fontSize: 14 },
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
  },
});
