import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  User,
  Settings as SettingsIcon,
  TrendingUp,
  Lock,
  ChevronRight,
  LucideIcon,
} from 'lucide-react-native';

import { useTheme } from '../../theme';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { useAuth } from '../../context/AuthContext';
import { AdBanner } from '../../components/AdBanner';

interface MenuRow {
  key: string;
  label: string;
  icon: LucideIcon;
  target: string;
  registeredOnly?: boolean;
}

const ROWS: MenuRow[] = [
  { key: 'settings', label: 'Settings', icon: SettingsIcon, target: 'Settings' },
  { key: 'profile', label: 'Profile', icon: User, target: 'ProfileMain' },
  { key: 'change-password', label: 'Change Password', icon: Lock, target: 'ChangePassword', registeredOnly: true },
  { key: 'analytics', label: 'Analytics', icon: TrendingUp, target: 'Analytics' },
];

export default function MoreMenuScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const { isGuest, hasPassword } = useAuth();

  const visibleRows = ROWS.filter(row => {
    if (!row.registeredOnly) return true;
    return !isGuest && hasPassword;
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={[]}>
      <ScreenHeader title="More" />
      <ScrollView contentContainerStyle={styles.content}>
        {visibleRows.map((row, idx) => {
          const Icon = row.icon;
          const isLast = idx === visibleRows.length - 1;
          return (
            <TouchableOpacity
              key={row.key}
              style={[
                styles.row,
                {
                  backgroundColor: theme.colors.card,
                  borderBottomColor: theme.colors.border,
                  borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                },
              ]}
              onPress={() => navigation.navigate(row.target)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrap, { backgroundColor: theme.colors.background }]}>
                <Icon size={20} color={theme.colors.primary} strokeWidth={2} />
              </View>
              <Text style={[theme.typography.body, styles.label, { color: theme.colors.text }]}>
                {row.label}
              </Text>
              <ChevronRight size={20} color={theme.colors.textSecondary} />
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
});
