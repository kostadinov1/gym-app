import React from 'react';
import { 
  KeyboardAvoidingView, 
  Platform, 
  StyleSheet, 
  ScrollView, 
  ViewStyle,
  View
} from 'react-native';
import { SafeAreaView, SafeAreaViewProps } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

interface ContainerProps {
  children: React.ReactNode;
  /** True = Form (Scrolls). False = List (Fixed). */
  isScrollable?: boolean; 
  /** Style for the inner content wrapper (e.g. padding, centering) */
  style?: ViewStyle;
  /** Override default background color */
  backgroundColor?: string;
  /** Pass specific edges to SafeAreaView (optional) */
  edges?: SafeAreaViewProps['edges'];
}

export const Container = ({ 
  children, 
  isScrollable = false, 
  style, 
  backgroundColor,
  edges 
}: ContainerProps) => {
  const theme = useTheme();
  
  // Default to theme background if not provided
  const bgColor = backgroundColor || theme.colors.background;

  const content = isScrollable ? (
    <ScrollView 
      contentContainerStyle={[styles.scrollContent, style]} 
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    // For non-scrollable, we still apply the style to a View wrapper
    <View style={[styles.fixedContent, style]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView 
      style={[styles.safeArea, { backgroundColor: bgColor }]} 
      edges={edges}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  fixedContent: {
    flex: 1,
  }
});