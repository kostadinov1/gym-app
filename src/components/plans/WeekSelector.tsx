import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

interface WeekSelectorProps {
  currentWeek: number;
  totalWeeks: number;
  onPrev: () => void;
  onNext: () => void;
}

export const WeekSelector = ({ currentWeek, totalWeeks, onPrev, onNext }: WeekSelectorProps) => {
  const theme = useTheme();
  return (
    <View style={[styles.weekSelector, { backgroundColor: theme.colors.card }]}>
      <TouchableOpacity onPress={onPrev} disabled={currentWeek === 1} style={{ padding: 8 }}>
        <Ionicons name="chevron-back" size={24} color={currentWeek === 1 ? theme.colors.border : theme.colors.primary} />
      </TouchableOpacity>

      <View style={{ alignItems: 'center' }}>
        <Text style={[styles.weekLabel, { color: theme.colors.text }]}>Week {currentWeek}</Text>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Projections</Text>
      </View>

      <TouchableOpacity onPress={onNext} disabled={currentWeek === totalWeeks} style={{ padding: 8 }}>
        <Ionicons name="chevron-forward" size={24} color={currentWeek === totalWeeks ? theme.colors.border : theme.colors.primary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  weekSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    elevation: 2
  },
  weekLabel: { fontSize: 18, fontWeight: 'bold' },
});