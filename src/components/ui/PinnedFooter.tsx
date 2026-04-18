import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

interface PinnedFooterProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Set to true when an AdBanner sits directly below this footer */
  hasAdBelow?: boolean;
}

/**
 * Pins its children to the bottom of the screen, always visible above the
 * keyboard and safe area. Sits between scroll content and AdBanner.
 *
 * Usage:
 *   <SafeAreaView edges={['top']}>
 *     <FlatList ... />
 *     <PinnedFooter><PrimaryButton ... /></PinnedFooter>
 *     <AdBanner />
 *   </SafeAreaView>
 */
export function PinnedFooter({ children, style, hasAdBelow = false }: PinnedFooterProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <View
      style={[
        styles.footer,
        { borderTopColor: theme.colors.border },
        // Only add bottom safe area when there's no ad below
        !hasAdBelow && { paddingBottom: insets.bottom > 0 ? insets.bottom : 8 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
