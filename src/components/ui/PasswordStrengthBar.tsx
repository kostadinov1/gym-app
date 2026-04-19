import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import type { PasswordStrength } from '../../utils/validation';

interface Props {
  strength: PasswordStrength;
}

const BAR_COLORS = ['#e53935', '#fb8c00', '#43a047', '#1b5e20'];

export function PasswordStrengthBar({ strength }: Props) {
  const theme = useTheme();

  if (strength.score === 0) return null;

  const activeColor = BAR_COLORS[strength.score - 1];
  const { checks } = strength;

  return (
    <View style={styles.container}>
      {/* Four segment bars */}
      <View style={styles.bars}>
        {[1, 2, 3, 4].map((seg) => (
          <View
            key={seg}
            style={[
              styles.bar,
              { backgroundColor: seg <= strength.score ? activeColor : theme.colors.border },
            ]}
          />
        ))}
      </View>

      {/* Label */}
      <Text style={[styles.label, { color: activeColor }]}>{strength.label}</Text>

      {/* Requirement hints */}
      <View style={styles.hints}>
        <Hint met={checks.length}    label="8+ chars" />
        <Hint met={checks.uppercase} label="Uppercase" />
        <Hint met={checks.lowercase} label="Lowercase" />
        <Hint met={checks.digit}     label="Digit" />
        <Hint met={checks.symbol}    label="Symbol" />
      </View>
    </View>
  );
}

function Hint({ met, label }: { met: boolean; label: string }) {
  const theme = useTheme();
  return (
    <Text style={[styles.hint, { color: met ? theme.colors.success : theme.colors.textSecondary }]}>
      {met ? '✓' : '·'} {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  bars: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 6,
  },
  bar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'right',
  },
  hints: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hint: {
    fontSize: 11,
  },
});
