import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import {
  Moon, Sun, Weight, FileText, Code2, Share2, Lock,
  Shield, CreditCard, Info, RefreshCw, ChevronRight,
} from 'lucide-react-native';

import { useTheme, useThemeToggle } from '../context/ThemeContext';
import { useUnits } from '../context/UnitsContext';
import { useAuth } from '../context/AuthContext';
import { useEntitlement } from '../hooks/useEntitlement';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { ExportService, type ExportFormat } from '../services/ExportService';
import { deleteAccount } from '../api/auth';
import { useStorage } from '../context/StorageContext';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { SectionTitle } from '../components/ui/SectionTitle';
import Toast from 'react-native-toast-message';

// ---------------------------------------------------------------------------
// Local SettingRow — a grouped-list row (iOS Settings style)
// ---------------------------------------------------------------------------
function SettingRow({
  icon: Icon,
  label,
  value,
  onPress,
  destructive = false,
  loading = false,
}: {
  icon?: React.ElementType;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  loading?: boolean;
}) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      disabled={!onPress || loading}
      activeOpacity={onPress ? 0.6 : 1}
    >
      {Icon && (
        <Icon
          size={18}
          color={destructive ? theme.colors.error : theme.colors.textSecondary}
          style={{ marginRight: 12 }}
        />
      )}
      <Text
        style={[
          styles.rowLabel,
          { color: destructive ? theme.colors.error : theme.colors.text },
        ]}
      >
        {label}
      </Text>
      <View style={styles.rowRight}>
        {loading ? (
          <ActivityIndicator size="small" color={theme.colors.textSecondary} />
        ) : (
          <>
            {value ? (
              <Text style={[styles.rowValue, { color: theme.colors.textSecondary }]}>
                {value}
              </Text>
            ) : null}
            {onPress && !destructive && (
              <ChevronRight size={16} color={theme.colors.textSecondary} style={{ marginLeft: 4 }} />
            )}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

function Separator() {
  const theme = useTheme();
  return (
    <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
  );
}

// ---------------------------------------------------------------------------
// SettingsScreen
// ---------------------------------------------------------------------------
export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const db = useStorage();
  const { isDark, toggleTheme } = useThemeToggle();
  const { isMetric, toggleUnit } = useUnits();
  const { signOut, isGuest } = useAuth();
  const { canExport, openPaywall } = useEntitlement();
  const { isSyncing, pendingCount, lastSyncedAt, lastError, trigger: triggerSync } = useSyncStatus();
  const [exporting, setExporting] = useState(false);

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

  const handleExport = async (format: ExportFormat) => {
    if (!canExport) { openPaywall(); return; }
    setExporting(true);
    try {
      const svc = new ExportService(db);
      await svc.export(format);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Export failed', text2: (err as Error).message, position: 'top' });
    } finally {
      setExporting(false);
    }
  };

  const deleteAccountMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      signOut();
      Toast.show({ type: 'success', text1: 'Account deleted', text2: 'Your data has been removed.', position: 'top' });
    },
    onError: (err) => {
      Toast.show({ type: 'error', text1: 'Error', text2: (err as Error).message, position: 'top' });
    },
  });

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action is permanent. All your workouts, plans, and history will be lost forever.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete Forever', style: 'destructive', onPress: () => deleteAccountMutation.mutate() },
      ],
    );
  };

  const groupStyle = [styles.group, { backgroundColor: theme.colors.card }];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <ScreenHeader title="Settings" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── ACCOUNT (registered only) ───────────────────────────── */}
        {!isGuest && (
          <>
            <SectionTitle title="Account" style={styles.sectionTitle} />
            <View style={groupStyle}>
              <SettingRow
                icon={RefreshCw}
                label="Cloud Sync"
                value={syncStatusLabel()}
                onPress={isSyncing ? undefined : triggerSync}
              />
            </View>
          </>
        )}

        {/* ── APPEARANCE ─────────────────────────────────────────── */}
        <SectionTitle title="Appearance" style={styles.sectionTitle} />
        <View style={groupStyle}>
          <SettingRow
            icon={isDark ? Moon : Sun}
            label="Theme"
            value={isDark ? 'Dark' : 'Light'}
            onPress={toggleTheme}
          />
          <Separator />
          <SettingRow
            icon={Weight}
            label="Units"
            value={isMetric ? 'Metric (kg)' : 'Imperial (lbs)'}
            onPress={toggleUnit}
          />
        </View>

        {/* ── EXPORT DATA ────────────────────────────────────────── */}
        <SectionTitle title="Export Data" style={styles.sectionTitle} />
        <View style={groupStyle}>
          <SettingRow
            icon={FileText}
            label="Export as CSV"
            value="Strong-compatible"
            onPress={() => handleExport('csv')}
            loading={exporting}
          />
          <Separator />
          <SettingRow
            icon={Code2}
            label="Export as JSON"
            value="Full-fidelity backup"
            onPress={() => handleExport('json')}
            loading={exporting}
          />
        </View>
        {!canExport && (
          <View style={styles.proNote}>
            <Lock size={12} color={theme.colors.textSecondary} />
            <Text style={[styles.proNoteText, { color: theme.colors.textSecondary }]}>
              Export is a Pro feature. Upgrade to unlock.
            </Text>
          </View>
        )}

        {/* ── ABOUT ──────────────────────────────────────────────── */}
        <SectionTitle title="About" style={styles.sectionTitle} />
        <View style={groupStyle}>
          <SettingRow
            icon={Shield}
            label="Privacy Policy"
            onPress={() => Linking.openURL('https://gymlogic.app/privacy')}
          />
          {!isGuest && (
            <>
              <Separator />
              <SettingRow
                icon={CreditCard}
                label="Manage Subscription"
                onPress={() =>
                  Linking.openURL(
                    'https://play.google.com/store/account/subscriptions?package=com.gencho.gymlogic',
                  )
                }
              />
            </>
          )}
          <Separator />
          <SettingRow icon={Info} label="Version" value="1.0.0" />
        </View>

        {/* ── DANGER ZONE (registered only) ──────────────────────── */}
        {!isGuest && (
          <>
            <SectionTitle title="Danger Zone" style={styles.sectionTitle} />
            <View style={groupStyle}>
              <SettingRow
                label="Delete Account & Data"
                onPress={handleDeleteAccount}
                destructive
                loading={deleteAccountMutation.isPending}
              />
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 16 },
  sectionTitle: { marginTop: 24, marginBottom: 8 },
  group: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    minHeight: 48,
  },
  rowLabel: { flex: 1, fontSize: 15 },
  rowRight: { flexDirection: 'row', alignItems: 'center' },
  rowValue: { fontSize: 14 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 14 },
  proNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  proNoteText: { fontSize: 12 },
});
