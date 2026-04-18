import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

type Variant = 'success' | 'primary' | 'muted' | 'error';

interface BadgeProps {
  label: string;
  variant?: Variant;
}

export function Badge({ label, variant = 'primary' }: BadgeProps) {
  const theme = useTheme();

  const bgColor =
    variant === 'success' ? theme.colors.success :
    variant === 'error'   ? theme.colors.error :
    variant === 'muted'   ? theme.colors.border :
    theme.colors.primary;

  const textColor =
    variant === 'muted' ? theme.colors.textSecondary : '#FFFFFF';

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
});
