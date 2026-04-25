import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { LayoutList, Trash2 } from 'lucide-react-native';

import { useTheme } from '../theme';
import { useStorage } from '../context/StorageContext';
import { AdBanner } from '../components/AdBanner';
import { FAB } from '../components/common/FAB';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';

const formatPlanDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

type PlanStatus = 'active' | 'upcoming' | 'completed';

function getPlanStatus(startDate: string, endDate: string): PlanStatus {
  const now = Date.now();
  if (now < new Date(startDate).getTime()) return 'upcoming';
  if (now > new Date(endDate).getTime()) return 'completed';
  return 'active';
}

const STATUS_SORT_ORDER: Record<PlanStatus, number> = { active: 0, upcoming: 1, completed: 2 };

function sortPlans<T extends { start_date: string; end_date: string }>(plans: T[]): T[] {
  return plans.slice().sort((a, b) => {
    const sa = getPlanStatus(a.start_date, a.end_date);
    const sb = getPlanStatus(b.start_date, b.end_date);
    if (sa !== sb) return STATUS_SORT_ORDER[sa] - STATUS_SORT_ORDER[sb];
    // Within ACTIVE/UPCOMING: earliest start first
    // Within COMPLETED: most recently ended first
    if (sa === 'completed') return new Date(b.end_date).getTime() - new Date(a.end_date).getTime();
    return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
  });
}

export default function PlansScreen() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const db = useStorage();

  const { data, isLoading, refetch, error, isError } = useQuery({
    queryKey: ['plans'],
    queryFn: () => db.getPlans(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => db.deletePlan(id),
    onSuccess: () => refetch(),
    onError: (err) => Alert.alert('Error', (err as Error).message),
  });

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete Plan', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  };

  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} color={theme.colors.primary} />;

  if (isError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <Text style={[theme.typography.body, { color: theme.colors.error, marginBottom: 8 }]}>
          Failed to load plans
        </Text>
        <Text style={[theme.typography.caption, { color: theme.colors.textSecondary, marginBottom: 20 }]}>
          {(error as Error).message}
        </Text>
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
    <SafeAreaView edges={[]} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader title="My Plans" />

      <FlatList
        data={data ? sortPlans(data) : undefined}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, (!data || data.length === 0) && { flex: 1 }]}
        ListEmptyComponent={
          <EmptyState
            icon={LayoutList}
            title="No Plans Yet"
            subtitle="Create a macro-cycle to track your progressive overload."
            action={{
              label: 'Create First Plan',
              onPress: () => navigation.navigate('CreatePlan'),
            }}
          />
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => navigation.navigate('PlanDetails', { planId: item.id })}
              activeOpacity={0.7}
            >
              <Text style={[theme.typography.title, { color: theme.colors.text, marginBottom: 4 }]}>
                {item.name}
              </Text>
              <Text style={[theme.typography.caption, { color: theme.colors.textSecondary, marginBottom: 8 }]}>
                {item.duration_weeks} {item.duration_weeks === 1 ? 'week' : 'weeks'} · {formatPlanDate(item.start_date)} – {formatPlanDate(item.end_date)}
              </Text>
              {(() => {
                const status = getPlanStatus(item.start_date, item.end_date);
                return <Badge
                  label={status === 'active' ? 'ACTIVE' : status === 'upcoming' ? 'UPCOMING' : 'COMPLETED'}
                  variant={status === 'active' ? 'success' : status === 'upcoming' ? 'primary' : 'muted'}
                />;
              })()}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleDelete(item.id, item.name)}
              style={styles.deleteBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Trash2 size={20} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        )}
      />

      <AdBanner />
      {data && data.length > 0 && (
        <FAB onPress={() => navigation.navigate('CreatePlan')} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: 16, paddingBottom: 8, paddingTop: 4 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  deleteBtn: {
    padding: 8,
    marginLeft: 8,
  },
});
