import React from 'react';
import { StatusBar, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { useTheme } from './src/theme';

import RootNavigator from './src/navigation/RootNavigator';
import LoginScreen from './src/screens/auth/LoginScreen';
import { ThemeProvider } from './src/context/ThemeContext';

const queryClient = new QueryClient();
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';

// We separate this component to access useAuth context
const NavigationWrapper = () => {
  const { userToken, isLoading } = useAuth();
  const theme = useTheme();

  if (isLoading) {
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
    );
  }

  return userToken ? <RootNavigator /> : <LoginScreen />;
};

export default function App() {
  return (
    // 2. WRAP EVERYTHING (Outside SafeAreaProvider)
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ThemeProvider>
              <QueryClientProvider client={queryClient}>
                  <StatusBar barStyle="default" />
                  <NavigationWrapper />
                  <Toast />
              </QueryClientProvider>
          </ThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}