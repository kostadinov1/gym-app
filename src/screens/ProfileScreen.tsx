import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, Alert, ActivityIndicator, Modal, Pressable,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Settings2, ChevronRight, TrendingUp } from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { useStorage } from '../context/StorageContext';
import { useTheme } from '../context/ThemeContext';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { useEntitlement } from '../hooks/useEntitlement';
import Toast from 'react-native-toast-message';
import { register, login } from '../api/auth';
import { VolumeChart } from '../components/profile/VolumeChart';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { IconButton } from '../components/ui/IconButton';
import { Card } from '../components/ui/Card';
import { SectionTitle } from '../components/ui/SectionTitle';
import { Badge } from '../components/ui/Badge';
import {
  getMigrationRecord,
  runGhostMigration,
} from '../services/GhostMigrationService';
import { PasswordStrengthBar } from '../components/ui/PasswordStrengthBar';
import {
  validateAuthFields,
  getPasswordStrength,
  type AuthFieldErrors,
} from '../utils/validation';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const db = useStorage();
  const { signOut, isGuest, promoteGuest, userEmail } = useAuth();
  const { pendingCount, trigger: triggerSync } = useSyncStatus();
  const { openPaywall } = useEntitlement();
  const queryClient = useQueryClient();

  // ── Ghost → Registered migration state ──────────────────────────────────
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regErrors, setRegErrors] = useState<AuthFieldErrors & { confirmPassword?: string }>({});
  const [migrationStep, setMigrationStep] = useState<'idle' | 'registering' | 'migrating' | 'done'>('idle');
  const regPasswordStrength = getPasswordStrength(regPassword);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['stats'],
    queryFn: () => db.getStats(),
  });

  // ── Logout with unsynced-changes warning ────────────────────────────────
  const handleLogout = () => {
    if (pendingCount > 0) {
      Alert.alert(
        'Unsynced Changes',
        `You have ${pendingCount} change${pendingCount === 1 ? '' : 's'} that haven't been uploaded yet. Logging out now will lose them permanently.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sync First', onPress: triggerSync },
          { text: 'Log Out Anyway', style: 'destructive', onPress: signOut },
        ],
      );
      return;
    }
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleGuestExit = () => {
    Alert.alert(
      'Exit Guest Mode',
      'Your workout data is only stored on this device. If you exit without creating an account, it will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Create Account', onPress: () => setShowRegisterModal(true) },
        { text: 'Delete & Exit', style: 'destructive', onPress: signOut },
      ],
    );
  };

  const closeRegisterModal = () => {
    setShowRegisterModal(false);
    setMigrationStep('idle');
    setRegConfirmPassword('');
    setRegErrors({});
  };

  // ── Ghost migration ──────────────────────────────────────────────────────
  const handleCreateAccount = async () => {
    const fieldErrors: typeof regErrors = validateAuthFields(regEmail, regPassword, true);
    if (regConfirmPassword !== regPassword) {
      fieldErrors.confirmPassword = 'Passwords do not match.';
    }
    if (Object.keys(fieldErrors).length > 0) {
      setRegErrors(fieldErrors);
      return;
    }
    setRegErrors({});
    const existing = await getMigrationRecord();
    if (existing) {
      Toast.show({ type: 'info', text1: 'Already migrated', text2: 'Your data is already synced.', position: 'top' });
      setShowRegisterModal(false);
      return;
    }
    try {
      setMigrationStep('registering');
      await register(regEmail.trim(), regPassword.trim());
      const { access_token } = await login(regEmail.trim(), regPassword.trim());
      setMigrationStep('migrating');
      const { setItemAsync } = await import('expo-secure-store');
      await setItemAsync('userToken', access_token);
      const result = await runGhostMigration();
      if (!result.success && result.errors.length > 0) console.warn('[Migration] Partial errors:', result.errors);
      setMigrationStep('done');
      queryClient.clear();
      await promoteGuest(access_token, regEmail.trim());
      setShowRegisterModal(false);
      Toast.show({ type: 'success', text1: 'Welcome!', text2: `Synced ${result.counts.sessions} workouts and ${result.counts.plans} plans.`, position: 'top' });
    } catch (err) {
      setMigrationStep('idle');
      Toast.show({ type: 'error', text1: 'Registration failed', text2: (err as Error).message, position: 'top' });
    }
  };

  const subtitle = isGuest ? 'Guest Mode' : (userEmail ?? undefined);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>

      {/* ── Migration progress modal ───────────────────────────────────── */}
      <Modal visible={migrationStep !== 'idle' && migrationStep !== 'done'} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.card }]}>
            <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginBottom: 16 }} />
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              {migrationStep === 'registering' ? 'Creating account…' : 'Syncing your data…'}
            </Text>
            <Text style={[{ color: theme.colors.textSecondary, textAlign: 'center', marginTop: 8 }, theme.typography.body]}>
              {migrationStep === 'registering' ? 'Setting up your account' : 'Uploading workouts, plans and exercises to the cloud'}
            </Text>
          </View>
        </View>
      </Modal>

      {/* ── Register modal ─────────────────────────────────────────────── */}
      <Modal visible={showRegisterModal} transparent animationType="slide" onRequestClose={closeRegisterModal}>
        <Pressable style={styles.modalOverlay} onPress={closeRegisterModal}>
          <Pressable style={styles.modalCardWrapper} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.modalCard, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text, textAlign: 'center' }]}>Create Account</Text>
              <Text style={[theme.typography.body, { color: theme.colors.textSecondary, marginBottom: 20, textAlign: 'center' }]}>
                Your workout data will be synced to the cloud.
              </Text>

              <TextInput
                style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.inputBackground,
                  borderColor: regErrors.email ? theme.colors.error : theme.colors.border }]}
                placeholder="Email"
                placeholderTextColor={theme.colors.textSecondary}
                value={regEmail}
                onChangeText={(v) => { setRegEmail(v); if (regErrors.email) setRegErrors(e => ({ ...e, email: undefined })); }}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              {regErrors.email && (
                <Text style={[styles.fieldError, { color: theme.colors.error }]}>{regErrors.email}</Text>
              )}

              <TextInput
                style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.inputBackground,
                  borderColor: regErrors.password ? theme.colors.error : theme.colors.border }]}
                placeholder="Password"
                placeholderTextColor={theme.colors.textSecondary}
                value={regPassword}
                onChangeText={(v) => { setRegPassword(v); if (regErrors.password) setRegErrors(e => ({ ...e, password: undefined })); }}
                secureTextEntry
              />
              {regErrors.password && (
                <Text style={[styles.fieldError, { color: theme.colors.error }]}>{regErrors.password}</Text>
              )}

              <PasswordStrengthBar strength={regPasswordStrength} />

              <TextInput
                style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.inputBackground,
                  borderColor: regErrors.confirmPassword ? theme.colors.error : theme.colors.border }]}
                placeholder="Confirm Password"
                placeholderTextColor={theme.colors.textSecondary}
                value={regConfirmPassword}
                onChangeText={(v) => { setRegConfirmPassword(v); if (regErrors.confirmPassword) setRegErrors(e => ({ ...e, confirmPassword: undefined })); }}
                secureTextEntry
              />
              {regErrors.confirmPassword && (
                <Text style={[styles.fieldError, { color: theme.colors.error }]}>{regErrors.confirmPassword}</Text>
              )}

              <TouchableOpacity
                style={[styles.ctaButton, { backgroundColor: theme.colors.primary, marginTop: 8 }]}
                onPress={handleCreateAccount}
                disabled={migrationStep !== 'idle'}
              >
                <Text style={styles.ctaButtonText}>Create Account & Sync</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ marginTop: 12, padding: 8, alignSelf: 'center' }} onPress={closeRegisterModal}>
                <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <ScreenHeader
        title="Profile"
        subtitle={subtitle}
        rightElement={
          <IconButton
            icon={Settings2}
            onPress={() => navigation.navigate('Settings')}
            color={theme.colors.textSecondary}
          />
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Guest CTA banner ───────────────────────────────────────────── */}
        {isGuest && (
          <TouchableOpacity
            style={[styles.guestBanner, { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary + '40' }]}
            onPress={() => setShowRegisterModal(true)}
            activeOpacity={0.7}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.guestBannerTitle, { color: theme.colors.primary }]}>Save your progress</Text>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>
                Create a free account to back up and sync your data.
              </Text>
            </View>
            <ChevronRight size={18} color={theme.colors.primary} />
          </TouchableOpacity>
        )}

        {/* ── Stats ──────────────────────────────────────────────────────── */}
        <SectionTitle title="My Progress" />
        <View style={styles.statRow}>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>{data?.total_workouts ?? 0}</Text>
            <Text style={[theme.typography.caption, { color: theme.colors.textSecondary, marginTop: 2 }]}>Total Workouts</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>{data?.workouts_this_month ?? 0}</Text>
            <Text style={[theme.typography.caption, { color: theme.colors.textSecondary, marginTop: 2 }]}>This Month</Text>
          </Card>
        </View>

        {/* ── Analytics link ─────────────────────────────────────────────── */}
        <Card onPress={() => navigation.navigate('Analytics')} style={styles.analyticsCard}>
          <View style={styles.analyticsInner}>
            <View style={[styles.analyticsIcon, { backgroundColor: theme.colors.surface }]}>
              <TrendingUp size={18} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[theme.typography.title, { color: theme.colors.text }]}>Full Analytics</Text>
              <Text style={[theme.typography.caption, { color: theme.colors.textSecondary, marginTop: 2 }]}>
                Check your long-term progress
              </Text>
            </View>
            <ChevronRight size={18} color={theme.colors.textSecondary} />
          </View>
        </Card>

        {/* ── Volume chart ───────────────────────────────────────────────── */}
        <VolumeChart />

        {/* ── Last workout ───────────────────────────────────────────────── */}
        <SectionTitle title="Last Workout" style={{ marginTop: 24 }} />
        <Card>
          <Text style={[theme.typography.title, { color: theme.colors.text }]}>
            {data?.last_workout_date
              ? new Date(data.last_workout_date).toLocaleDateString(undefined, {
                  weekday: 'long', month: 'short', day: 'numeric',
                })
              : 'No workouts yet'}
          </Text>
        </Card>

        {/* ── Logout ─────────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.logoutButton, { borderColor: theme.colors.error }]}
          onPress={isGuest ? handleGuestExit : handleLogout}
          activeOpacity={0.7}
        >
          <Text style={[theme.typography.body, { color: theme.colors.error, fontWeight: '600' }]}>
            {isGuest ? 'Exit Guest Mode' : 'Log Out'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 16 },
  statRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statValue: { fontSize: 28, fontWeight: '700' },
  analyticsCard: { marginBottom: 16 },
  analyticsInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  analyticsIcon: { padding: 8, borderRadius: 8 },
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    gap: 12,
  },
  guestBannerTitle: { fontSize: 15, fontWeight: '700' },
  logoutButton: {
    marginTop: 28,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCardWrapper: {
    width: '100%',
  },
  modalCard: {
    width: '100%',
    borderRadius: 20,
    padding: 28,
  },
  modalTitle: { fontSize: 19, fontWeight: '700', marginBottom: 4 },
  input: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 4,
    fontSize: 15,
  },
  fieldError: {
    fontSize: 12,
    marginBottom: 10,
    alignSelf: 'flex-start',
    marginLeft: 2,
  },
  ctaButton: {
    width: '100%',
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  ctaButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
