import React from 'react';
import { Text, StyleSheet, ViewStyle, View } from 'react-native';
import { useTheme } from '../../theme';

interface SectionTitleProps {
  title: string;
  style?: ViewStyle;
}

export function SectionTitle({ title, style }: SectionTitleProps) {
  const theme = useTheme();
  return (
    <View style={[styles.container, style]}>
      <Text
        style={[
          theme.typography.sectionHeader,
          styles.text,
          { color: theme.colors.textSecondary },
        ]}
      >
        {title.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 8 },
  text: { letterSpacing: 0.8 },
});
