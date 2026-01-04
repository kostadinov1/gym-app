import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../theme';
import { getStats } from '../api/history';

export default function ProfileScreen() {
  const theme = useTheme();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['stats'],
    queryFn: getStats,
  });

  // Helper component for Stat Cards
  const StatCard = ({ label, value }: { label: string, value: string | number }) => (
    <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
      <Text style={[styles.statValue, { color: theme.colors.primary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
    </View>
  );

  // Helper component for Settings Rows
  const SettingRow = ({ label, value }: { label: string, value: string }) => (
    <View style={[styles.settingRow, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
      <Text style={[styles.settingLabel, { color: theme.colors.text }]}>{label}</Text>
      <Text style={[styles.settingValue, { color: theme.colors.textSecondary }]}>{value}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.header, { color: theme.colors.text }]}>Profile</Text>

      <ScrollView 
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        
        {/* STATS GRID */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>My Progress</Text>
        <View style={styles.grid}>
          <StatCard 
            label="Total Workouts" 
            value={data?.total_workouts || 0} 
          />
          <StatCard 
            label="This Month" 
            value={data?.workouts_this_month || 0} 
          />
        </View>

        {/* LAST WORKOUT */}
        <View style={[styles.infoCard, { backgroundColor: theme.colors.card }]}>
            <Text style={{ color: theme.colors.textSecondary, marginBottom: 4 }}>Last Workout</Text>
            <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '600' }}>
                {data?.last_workout_date 
                  ? new Date(data.last_workout_date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) 
                  : "No workouts yet"}
            </Text>
        </View>

        {/* SETTINGS SECTION */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: 24 }]}>Settings</Text>
        <View style={styles.settingsGroup}>
            <SettingRow label="Theme" value={theme.mode === 'dark' ? 'Dark Mode' : 'Light Mode'} />
            <SettingRow label="Units" value="Metric (kg)" />
            <SettingRow label="Version" value="1.0.0 (Alpha)" />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { fontSize: 28, fontWeight: 'bold', marginHorizontal: 16, marginTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  grid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  statValue: { fontSize: 32, fontWeight: 'bold', marginBottom: 4 },
  statLabel: { fontSize: 14 },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    width: '100%',
  },
  settingsGroup: { borderRadius: 12, overflow: 'hidden' },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  settingLabel: { fontSize: 16 },
  settingValue: { fontSize: 16 },
});