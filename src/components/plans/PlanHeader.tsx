import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

interface PlanHeaderProps {
  title: string;
  subtitle: string;
  onBack: () => void;
  onSettings: () => void;
}

export const PlanHeader = ({ title, subtitle, onBack, onSettings }: PlanHeaderProps) => {
  const theme = useTheme();
  return (
    <View style={styles.headerRow}>
      <TouchableOpacity onPress={onBack} style={{ padding: 8 }}>
        <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
      </TouchableOpacity>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text style={[styles.header, { color: theme.colors.text }]}>{title}</Text>
        <Text style={{ color: theme.colors.textSecondary }}>{subtitle}</Text>
      </View>
      <TouchableOpacity onPress={onSettings} style={{ padding: 8 }}>
        <Ionicons name="settings-outline" size={24} color={theme.colors.text} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 8, 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee' 
  },
  header: { fontSize: 20, fontWeight: 'bold' },
});