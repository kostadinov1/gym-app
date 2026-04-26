import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  User,
  Settings as SettingsIcon,
  TrendingUp,
  Lock,
  RefreshCw,
  Scale,
  Dumbbell,
  Ruler,
  Camera,
  Flame,
  Zap,
  LucideIcon,
} from 'lucide-react-native';

import { useTheme } from '../../theme';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { useAuth } from '../../context/AuthContext';
import { AdBanner } from '../../components/AdBanner';
import { SyncService } from '../../services/SyncService';

interface MenuRow {
  key: string;
  label: string;
  icon: LucideIcon;
  target: string;
  registeredOnly?: boolean;
  comingSoon?: boolean;
  isPro?: boolean;
}

const ROWS: MenuRow[] = [
  { key: 'settings', label: 'Settings', icon: SettingsIcon, target: 'Settings' },
  { key: 'profile', label: 'Profile', icon: User, target: 'ProfileMain' },
  { key: 'change-password', label: 'Change Password', icon: Lock, target: 'ChangePassword', registeredOnly: true },
  { key: 'analytics', label: 'Analytics', icon: TrendingUp, target: 'Analytics' },
  { key: 'plates-calculator', label: 'Plates Calculator', icon: Scale, target: '', comingSoon: true, isPro: true },
  { key: '1rm-estimator', label: '1-Rep Max Estimator', icon: Dumbbell, target: '', comingSoon: true, isPro: true },
  { key: 'warmup-calculator', label: 'Warm-up Calculator', icon: Zap, target: '', comingSoon: true },
  { key: 'body-measurements', label: 'Body Measurements', icon: Ruler, target: '', comingSoon: true, isPro: true },
  { key: 'progress-photos', label: 'Progress Photos', icon: Camera, target: '', comingSoon: true },
  { key: 'streaks', label: 'Streaks & Consistency', icon: Flame, target: '', comingSoon: true },
];

export default function MoreMenuScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const { isGuest, hasPassword } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const manualSync = useRef(false);

  useEffect(() => {
    if (isGuest) return;
    return SyncService.subscribe(status => {
      setIsSyncing(prev => {
        if (prev && !status.isSyncing && manualSync.current) {
          manualSync.current = false;
          if (status.lastError) {
            Toast.show({ type: 'error', text1: 'Sync failed', text2: status.lastError, position: 'top' });
          } else {
            Toast.show({ type: 'success', text1: 'Synced', text2: 'Your data is up to date.', position: 'top' });
          }
        }
        return status.isSyncing;
      });
    });
  }, [isGuest]);

  const visibleRows = ROWS.filter(row => {
    if (!row.registeredOnly) return true;
    return !isGuest && hasPassword;
  });

  const syncButton = !isGuest ? (
    <TouchableOpacity
      onPress={() => { manualSync.current = true; SyncService.trigger(); }}
      disabled={isSyncing}
      hitSlop={8}
    >
      {isSyncing
        ? <ActivityIndicator size={20} color={theme.colors.primary} />
        : <RefreshCw size={20} color={theme.colors.primary} strokeWidth={2} />}
    </TouchableOpacity>
  ) : null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={[]}>
      <ScreenHeader title="More" rightElement={syncButton} />
      <ScrollView contentContainerStyle={styles.content}>
        {visibleRows.map((row, idx) => {
          const Icon = row.icon;
          const isLast = idx === visibleRows.length - 1;
          const dimmed = row.comingSoon;

          return (
            <TouchableOpacity
              key={row.key}
              style={[
                styles.row,
                {
                  backgroundColor: theme.colors.card,
                  borderBottomColor: theme.colors.border,
                  borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                  opacity: dimmed ? 0.6 : 1,
                },
              ]}
              onPress={dimmed ? undefined : () => navigation.navigate(row.target)}
              activeOpacity={dimmed ? 1 : 0.7}
            >
              <View style={[styles.iconWrap, { backgroundColor: theme.colors.background }]}>
                <Icon size={20} color={theme.colors.primary} strokeWidth={2} />
              </View>
              <Text style={[theme.typography.body, styles.label, { color: theme.colors.text }]}>
                {row.label}
              </Text>
              {dimmed ? (
                <View style={styles.badges}>
                  {row.isPro && (
                    <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
                      <Text style={styles.badgeTextPro}>PRO</Text>
                    </View>
                  )}
                  <View style={[styles.badge, { backgroundColor: theme.colors.surface }]}>
                    <Text style={[styles.badgeTextSoon, { color: theme.colors.textSecondary }]}>Soon</Text>
                  </View>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <AdBanner />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  label: { flex: 1, fontWeight: '500' },
  badges: { flexDirection: 'row', gap: 6 },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeTextPro: { fontSize: 10, fontWeight: '700', color: '#fff', letterSpacing: 0.4 },
  badgeTextSoon: { fontSize: 10, fontWeight: '600' },
});
