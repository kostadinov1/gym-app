import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ArrowLeft, Settings } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

interface PlanHeaderProps {
  title: string;
  subtitle: string;
  onBack: () => void;
  onSettings: () => void;
}

export const PlanHeader = ({ title, subtitle, onBack, onSettings }: PlanHeaderProps) => {
  const theme = useTheme();
  const { top } = useSafeAreaInsets();
  return (
    <View style={[styles.headerRow, { backgroundColor: theme.colors.header, borderBottomColor: theme.colors.border, paddingTop: top + 8 }]}>
      <TouchableOpacity onPress={onBack} style={{ padding: 8 }}>
        <ArrowLeft size={24} color={theme.colors.primary} />
      </TouchableOpacity>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text style={[styles.header, { color: theme.colors.text }]}>{title}</Text>
        <Text style={{ color: theme.colors.textSecondary }}>{subtitle}</Text>
      </View>
      <TouchableOpacity onPress={onSettings} style={{ padding: 8 }}>
        <Settings size={24} color={theme.colors.text} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  header: { fontSize: 20, fontWeight: 'bold' },
});