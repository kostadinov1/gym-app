import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { PrimaryButton } from './PrimaryButton';

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export function EmptyState({ icon: Icon, title, subtitle, action }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Icon size={48} color={theme.colors.textSecondary} strokeWidth={1.5} />
      <Text style={[theme.typography.title, styles.title, { color: theme.colors.text }]}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={[theme.typography.body, styles.subtitle, { color: theme.colors.textSecondary }]}>
          {subtitle}
        </Text>
      ) : null}
      {action ? (
        <PrimaryButton
          label={action.label}
          onPress={action.onPress}
          style={styles.button}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  title: {
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    marginTop: 24,
    width: '80%',
  },
});
