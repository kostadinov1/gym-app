import React from 'react';
import { 
  KeyboardAvoidingView, 
  Platform, 
  StyleSheet, 
  ScrollView, 
  ViewStyle 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

interface ContainerProps {
  children: React.ReactNode;
  /** Set to true if the screen is a Form (needs scrolling). 
   * Set to false if the screen contains a FlatList (handles its own scrolling). */
  isScrollable?: boolean; 
  style?: ViewStyle;
}

export const Container = ({ children, isScrollable = false, style }: ContainerProps) => {
  const theme = useTheme();

  const content = isScrollable ? (
    <ScrollView 
      contentContainerStyle={styles.scrollContent} 
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    // If it's a list, just render children directly (FlatList handles itself)
    children 
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.keyboardView, style]}
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
    // Add padding if needed globally
  }
});