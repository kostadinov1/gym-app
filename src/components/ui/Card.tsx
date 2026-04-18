import React from 'react';
import { TouchableOpacity, View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  disabled?: boolean;
}

export function Card({ children, style, onPress, disabled }: CardProps) {
  const theme = useTheme();

  const cardStyle = [
    styles.card,
    { backgroundColor: theme.colors.card },
    theme.mode === 'light'
      ? { borderWidth: 1, borderColor: theme.colors.border }
      : {},
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 14,
  },
});
