import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Dumbbell, Check, ChevronRight } from 'lucide-react-native';

import { useTheme } from '../theme';
import { useStorage } from '../context/StorageContext';
import { AdBanner } from '../components/AdBanner';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';
import type { Routine } from '../api/workouts';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const formatShortDate = (iso: string): string => {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const buildPlanSubtitle = (startDate: string, endDate: string, durationWeeks: number): string => {
  const today = new Date().toISOString().split('T')[0];
  const planStart = new Date(startDate + 'T00:00:00');
  const todayDate = new Date(today + 'T00:00:00');
  const daysDiff = Math.floor((todayDate.getTime() - planStart.getTime()) / 86_400_000);
  const weekNum = daysDiff >= 0 ? Math.min(Math.ceil((daysDiff + 1) / 7), durationWeeks) : 0;

  const weekStart = new Date(planStart);
  weekStart.setDate(planStart.getDate() + Math.max(daysDiff - (daysDiff % 7), 0));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const weekStartStr = weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const weekEndStr = weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  if (today < startDate) return `Starts ${formatShortDate(startDate)}`;
  if (today > endDate) return `Ended ${formatShortDate(endDate)}`;
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
    const unsubscribe = navigation.addListener('focus', () => { refetch(); });
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

  const subtitle = plan
    ? buildPlanSubtitle(plan.startDate, plan.endDate, plan.durationWeeks)
    : undefined;

  const renderItem = ({ item }: { item: Routine }) => {
    const completed = isDoneToday(item.last_completed_at);
    const isToday = item.day_of_week === todaySchemaDay;

    let dayLabel: string;
    if (item.day_of_week === undefined || item.day_of_week === null) {
      dayLabel = 'Flexible';
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
          { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
          isToday && !completed && { borderLeftColor: theme.colors.primary, borderLeftWidth: 4 },
          !isToday && !completed && { opacity: 0.75 },
          completed && { opacity: 0.6 },
        ]}
        onPress={() => navigation.navigate('ActiveWorkout', { routineId: item.id })}
        activeOpacity={0.7}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Text style={[theme.typography.title, { color: completed ? theme.colors.textSecondary : theme.colors.text }]}>
              {item.name}
            </Text>
            {completed && <Badge label="DONE" variant="success" />}
          </View>
          <Text style={[
            theme.typography.label,
            { color: isToday && !completed ? theme.colors.primary : theme.colors.textSecondary },
            isToday && !completed && { fontWeight: '700' },
          ]}>
            {dayLabel}
          </Text>
        </View>
        {completed
          ? <Check size={20} color={theme.colors.success} strokeWidth={2.5} />
          : <ChevronRight size={20} color={theme.colors.textSecondary} />
        }
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView edges={['bottom']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader
        title={plan?.name ?? "Today's Workout"}
        subtitle={subtitle ?? (plan && !hasRoutineToday && routines.length > 0 ? 'Rest day' : undefined)}
      />

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, sorted.length === 0 && { flex: 1 }]}
        ListEmptyComponent={
          <EmptyState
            icon={Dumbbell}
            title="No Active Workouts"
            subtitle="Create a plan and add routines to get started."
            action={{
              label: 'Create a Plan',
              onPress: () => navigation.navigate('Plans', { screen: 'CreatePlan' }),
            }}
          />
        }
        renderItem={renderItem}
      />
      <AdBanner />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: 16, paddingBottom: 8, paddingTop: 4 },
  card: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
