import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native'; // Add TouchableOpacity, Alert
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getStats } from '../api/history';
import { useAuth } from '../context/AuthContext'; 
import { useTheme, useThemeToggle } from '../context/ThemeContext';
import Toast from 'react-native-toast-message'; // <--- Import Toast
import { deleteAccount } from '../api/auth';


export default function ProfileScreen() {
  const theme = useTheme();
  const { isDark, toggleTheme } = useThemeToggle(); 
  const { signOut } = useAuth(); 

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['stats'],
    queryFn: getStats,
  });

  // Handler to confirm logout
  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Log Out", style: "destructive", onPress: signOut } 
      ]
    );
  };



   // --- NEW: Delete Account Mutation ---
  const deleteAccountMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      signOut(); // Clear token (Redirects to Login)
      Toast.show({
        type: 'success',
        text1: 'Account Deleted',
        text2: 'Your data has been removed.'
      });
    },
    onError: (err) => {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: (err as Error).message
      });
    }
  });

  const handleDeleteAccountPress = () => {
    Alert.alert(
      "Delete Account",
      "⚠️ This action is permanent. All your workouts, plans, and history will be lost forever.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete Forever", 
          style: "destructive", 
          onPress: () => deleteAccountMutation.mutate() 
        }
      ]
    );
  };

  const StatCard = ({ label, value }: { label: string, value: string | number }) => (
    <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
      <Text style={[styles.statValue, { color: theme.colors.primary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
    </View>
  );

  const SettingRow = ({ label, value, onPress }: { label: string, value: string, onPress?: () => void }) => (
    <TouchableOpacity 
        onPress={onPress} 
        disabled={!onPress}
        style={[styles.settingRow, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}
    >
      <Text style={[styles.settingLabel, { color: theme.colors.text }]}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={[styles.settingValue, { color: theme.colors.textSecondary }]}>{value}</Text>
      </View>
    </TouchableOpacity>
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
          <StatCard label="Total Workouts" value={data?.total_workouts || 0} />
          <StatCard label="This Month" value={data?.workouts_this_month || 0} />
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
            
            {/* THEME TOGGLE ROW */}
            <SettingRow 
                label="Theme" 
                value={isDark ? 'Dark Mode 🌙' : 'Light Mode ☀️'} 
                onPress={toggleTheme} // <--- Wire it up!
            />
            
            <SettingRow label="Units" value="Metric (kg)" />
            <SettingRow label="Version" value="1.0.0 (Alpha)" />
        </View>

        {/* LOGOUT BUTTON */}
        <TouchableOpacity 
            style={[styles.logoutButton, { borderColor: theme.colors.error }]} 
            onPress={handleLogout}
        >
            <Text style={{ color: theme.colors.error, fontWeight: 'bold', fontSize: 16 }}>Log Out</Text>
        </TouchableOpacity>


                {/* --- NEW: Delete Account Link --- */}
        <TouchableOpacity 
            style={{ marginBottom: 40, padding: 10, alignItems: 'center' }}
            onPress={handleDeleteAccountPress}
            disabled={deleteAccountMutation.isPending}
        >
            <Text style={{ color: theme.colors.textSecondary, fontSize: 14, textDecorationLine: 'underline' }}>
                {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account & Data"}
            </Text>
        </TouchableOpacity>

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
  infoCard: { padding: 16, borderRadius: 12, width: '100%' },
  settingsGroup: { borderRadius: 12, overflow: 'hidden' },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  settingLabel: { fontSize: 16 },
  settingValue: { fontSize: 16 },
  
  // NEW STYLE
  logoutButton: {
      marginTop: 32,
      marginBottom: 32,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
  }
});