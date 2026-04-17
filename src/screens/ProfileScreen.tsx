import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, Alert, ActivityIndicator, Modal,
  TextInput, Linking, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useStorage } from '../context/StorageContext';
import { useTheme, useThemeToggle } from '../context/ThemeContext';
import Toast from 'react-native-toast-message';
import { deleteAccount, register, login } from '../api/auth';
import { VolumeChart } from '../components/profile/VolumeChart';
import { ChevronRight, FileText, Share2, Lock, Code2 } from 'lucide-react-native';
import { useUnits } from '../context/UnitsContext';
import { useNavigation } from '@react-navigation/native';
import { useEntitlement } from '../hooks/useEntitlement';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { ExportService, type ExportFormat } from '../services/ExportService';
import {
  getMigrationRecord,
  runGhostMigration,
} from '../services/GhostMigrationService';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const db = useStorage();
  const { isDark, toggleTheme } = useThemeToggle();
  const { isMetric, toggleUnit, unitLabel } = useUnits();
  const { signOut, isGuest, promoteGuest } = useAuth();
  const { canExport, openPaywall } = useEntitlement();
  const { isSyncing, pendingCount, lastSyncedAt, lastError, trigger: triggerSync } = useSyncStatus();
  const queryClient = useQueryClient();
  const [exporting, setExporting] = useState(false);

  // ── Ghost → Registered migration state ────────────────────────────────
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [migrationStep, setMigrationStep] = useState<
    'idle' | 'registering' | 'migrating' | 'done'
  >('idle');
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['stats'],
    queryFn: () => db.getStats(),
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

  const handleExport = async (format: ExportFormat) => {
    if (!canExport) {
      openPaywall();
      return;
    }
    setExporting(true);
    try {
      const svc = new ExportService(db);
      await svc.export(format);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Export failed',
        text2: (err as Error).message,
      });
    } finally {
      setExporting(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!regEmail.trim() || !regPassword.trim()) {
      Toast.show({ type: 'error', text1: 'Missing fields', text2: 'Enter email and password.' });
      return;
    }

    // Check idempotency — skip if already migrated
    const existing = await getMigrationRecord();
    if (existing) {
      Toast.show({ type: 'info', text1: 'Already migrated', text2: 'Your data is already synced.' });
      setShowRegisterModal(false);
      return;
    }

    try {
      // Step 1 — Register
      setMigrationStep('registering');
      await register(regEmail.trim(), regPassword.trim());

      // Step 2 — Get token
      const { access_token } = await login(regEmail.trim(), regPassword.trim());

      // Step 3 — Migrate local data
      setMigrationStep('migrating');
      // Store token so GhostMigrationService can use it
      const { setItemAsync } = await import('expo-secure-store');
      await setItemAsync('userToken', access_token);

      const result = await runGhostMigration();

      if (!result.success && result.errors.length > 0) {
        console.warn('[Migration] Partial errors:', result.errors);
      }

      // Step 4 — Flush cache + promote
      setMigrationStep('done');
      queryClient.clear();
      await promoteGuest(access_token);

      setShowRegisterModal(false);
      Toast.show({
        type: 'success',
        text1: 'Welcome! 🎉',
        text2: `Synced ${result.counts.sessions} workouts and ${result.counts.plans} plans.`,
      });
    } catch (err) {
      setMigrationStep('idle');
      Toast.show({ type: 'error', text1: 'Registration failed', text2: (err as Error).message });
    }
  };

  const syncStatusLabel = (): string => {
    if (isSyncing) return 'Syncing…';
    if (lastError) return 'Offline';
    if (lastSyncedAt) {
      const mins = Math.floor((Date.now() - lastSyncedAt) / 60_000);
      if (mins < 1) return 'Just now';
      if (mins === 1) return '1 min ago';
      return `${mins} min ago`;
    }
    if (pendingCount > 0) return `${pendingCount} pending`;
    return 'Not synced yet';
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

      {/* ── Syncing modal ──────────────────────────────────────────────── */}
      <Modal visible={migrationStep !== 'idle' && migrationStep !== 'done'} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.card }]}>
            <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginBottom: 16 }} />
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              {migrationStep === 'registering' ? 'Creating account…' : 'Syncing your data…'}
            </Text>
            <Text style={{ color: theme.colors.textSecondary, textAlign: 'center', marginTop: 8 }}>
              {migrationStep === 'registering'
                ? 'Setting up your account'
                : 'Uploading workouts, plans and exercises to the cloud'}
            </Text>
          </View>
        </View>
      </Modal>

      {/* ── Register modal ─────────────────────────────────────────────── */}
      <Modal visible={showRegisterModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Create Account</Text>
            <Text style={{ color: theme.colors.textSecondary, marginBottom: 20, textAlign: 'center' }}>
              Your workout data will be synced to the cloud.
            </Text>
            <TextInput
              style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground }]}
              placeholder="Email"
              placeholderTextColor={theme.colors.textSecondary}
              value={regEmail}
              onChangeText={setRegEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.inputBackground }]}
              placeholder="Password"
              placeholderTextColor={theme.colors.textSecondary}
              value={regPassword}
              onChangeText={setRegPassword}
              secureTextEntry
            />
            <TouchableOpacity
              style={[styles.ctaButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleCreateAccount}
              disabled={migrationStep !== 'idle'}
            >
              <Text style={styles.ctaButtonText}>Create Account & Sync</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ marginTop: 12, padding: 8 }}
              onPress={() => { setShowRegisterModal(false); setMigrationStep('idle'); }}
            >
              <Text style={{ color: theme.colors.textSecondary, textAlign: 'center' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >

        {/* GUEST CTA BANNER */}
        {isGuest && (
          <TouchableOpacity
            style={[styles.guestBanner, { backgroundColor: theme.colors.primary + '18', borderColor: theme.colors.primary }]}
            onPress={() => setShowRegisterModal(true)}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.guestBannerTitle, { color: theme.colors.primary }]}>Save your progress</Text>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                Create a free account to back up and sync your data.
              </Text>
            </View>
            <ChevronRight size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        )}

        {/* STATS GRID */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>My Progress</Text>
        <View style={styles.grid}>
          <StatCard label="Total Workouts" value={data?.total_workouts || 0} />
          <StatCard label="This Month" value={data?.workouts_this_month || 0} />
        </View>
        {/* ANALYTICS BUTTON */}
        <TouchableOpacity 
            style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                backgroundColor: theme.colors.card, 
                padding: 16, 
                borderRadius: 12,
                marginTop: 16,
                marginBottom: 16
            }}
            onPress={() => navigation.navigate('Analytics')}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ backgroundColor: theme.colors.inputBackground, padding: 8, borderRadius: 8 }}>
                     <Text>📈</Text>
                </View>
                <View>
                    <Text style={{ color: theme.colors.text, fontWeight: 'bold', fontSize: 16 }}>Full Analytics</Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Check your long term progress</Text>
                </View>
            </View>
            <ChevronRight size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        {/* --- NEW CHART --- */}
        <VolumeChart />

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

          {/* CLOUD SYNC ROW — registered users only */}
          {!isGuest && (
            <TouchableOpacity
              onPress={triggerSync}
              disabled={isSyncing}
              style={[styles.settingRow, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}
            >
              <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Cloud Sync</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {isSyncing && <ActivityIndicator size="small" color={theme.colors.primary} />}
                <Text style={[styles.settingValue, {
                  color: lastError ? theme.colors.error : theme.colors.textSecondary,
                }]}>
                  {syncStatusLabel()}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* THEME TOGGLE ROW */}
          <SettingRow
            label="Theme"
            value={isDark ? 'Dark Mode 🌙' : 'Light Mode ☀️'}
            onPress={toggleTheme} // <--- Wire it up!
          />

          <SettingRow
            label="Units"
            value={isMetric ? `Metric (kg)` : `Imperial (lbs)`}
            onPress={toggleUnit}
          />
          <SettingRow label="Version" value="1.0.0" />
          <SettingRow
            label="Privacy Policy"
            value=""
            onPress={() => Linking.openURL('https://hardlog.app/privacy')}
          />
          {!isGuest && (
            <SettingRow
              label="Manage Subscription"
              value=""
              onPress={() =>
                Linking.openURL(
                  'https://play.google.com/store/account/subscriptions?package=com.gencho.hardlog',
                )
              }
            />
          )}
        </View>

        {/* EXPORT SECTION */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: 24 }]}>Export Data</Text>
        <View style={[styles.settingsGroup, { marginBottom: 8 }]}>
          <TouchableOpacity
            style={[styles.settingRow, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}
            onPress={() => handleExport('csv')}
            disabled={exporting}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <FileText size={20} color={theme.colors.primary} />
              <View>
                <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Export as CSV</Text>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Strong-compatible format</Text>
              </View>
            </View>
            {exporting
              ? <ActivityIndicator size="small" color={theme.colors.primary} />
              : canExport ? <Share2 size={20} color={theme.colors.textSecondary} /> : <Lock size={20} color={theme.colors.textSecondary} />
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingRow, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}
            onPress={() => handleExport('json')}
            disabled={exporting}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Code2 size={20} color={theme.colors.primary} />
              <View>
                <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Export as JSON</Text>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Full-fidelity backup</Text>
              </View>
            </View>
            {exporting
              ? <ActivityIndicator size="small" color={theme.colors.primary} />
              : canExport ? <Share2 size={20} color={theme.colors.textSecondary} /> : <Lock size={20} color={theme.colors.textSecondary} />
            }
          </TouchableOpacity>
        </View>
        {!canExport && (
          <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginBottom: 16, paddingHorizontal: 4 }}>
            🔒 Export is a Pro feature. Upgrade to unlock.
          </Text>
        )}

        {/* LOGOUT BUTTON */}
        <TouchableOpacity
          style={[styles.logoutButton, { borderColor: theme.colors.error }]}
          onPress={handleLogout}
        >
          <Text style={{ color: theme.colors.error, fontWeight: 'bold', fontSize: 16 }}>Log Out</Text>
        </TouchableOpacity>


        {/* Delete Account — only for registered users */}
        {!isGuest && (
          <TouchableOpacity
            style={{ marginBottom: 40, padding: 10, alignItems: 'center' }}
            onPress={handleDeleteAccountPress}
            disabled={deleteAccountMutation.isPending}
          >
            <Text style={{ color: theme.colors.textSecondary, fontSize: 14, textDecorationLine: 'underline' }}>
              {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account & Data"}
            </Text>
          </TouchableOpacity>
        )}

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

  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  guestBannerTitle: { fontSize: 16, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  input: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
    fontSize: 15,
  },
  ctaButton: {
    width: '100%',
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  ctaButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
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