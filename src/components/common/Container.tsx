import React from 'react';
import { StyleSheet, View, ViewStyle, Platform } from 'react-native';
import { SafeAreaView, SafeAreaViewProps } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useTheme } from '../../theme';

interface ContainerProps {
  children: React.ReactNode;
  isScrollable?: boolean; 
  style?: ViewStyle;
  backgroundColor?: string;
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
  
  const bgColor = backgroundColor || theme.colors.background;

  const content = isScrollable ? (
    <KeyboardAwareScrollView
      enableOnAndroid={true}
      enableAutomaticScroll={true}
      extraScrollHeight={20} // Adds a little padding above the keyboard
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.scrollContent, style]}
      // These props help with the "Centering" issue on Android
      enableResetScrollToCoords={false}
    >
      {children}
    </KeyboardAwareScrollView>
  ) : (
    <View style={[styles.fixedContent, style]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView 
      style={[styles.safeArea, { backgroundColor: bgColor }]} 
      edges={edges}
    >
      {content}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  fixedContent: {
    flex: 1,
  }
});