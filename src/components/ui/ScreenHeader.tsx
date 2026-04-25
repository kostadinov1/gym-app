import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { IconButton } from './IconButton';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightElement?: React.ReactNode;
}

export function ScreenHeader({ title, subtitle, onBack, rightElement }: ScreenHeaderProps) {
  const theme = useTheme();
  const { top } = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: top + 12, backgroundColor: theme.colors.header }]}>
      {/* Left slot: back button or spacer */}
      <View style={styles.side}>
        {onBack && (
          <IconButton icon={ArrowLeft} onPress={onBack} color={theme.colors.primary} />
        )}
      </View>

      {/* Center: title + optional subtitle */}
      <View style={styles.center}>
        <Text
          style={[theme.typography.display, { color: theme.colors.text }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[theme.typography.caption, { color: theme.colors.textSecondary, marginTop: 1 }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* Right slot: custom element or spacer */}
      <View style={[styles.side, styles.sideRight]}>
        {rightElement ?? null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    minHeight: 56,
  },
  side: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  center: {
    flex: 1,
    paddingHorizontal: 8,
  },
});
