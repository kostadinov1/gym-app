import React from 'react';
import { StatusBar, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { useTheme } from './src/theme';

import RootNavigator from './src/navigation/RootNavigator';
import LoginScreen from './src/screens/auth/LoginScreen';

const queryClient = new QueryClient();

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
    <SafeAreaProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
            <StatusBar barStyle="dark-content" />
            <NavigationWrapper />
        </QueryClientProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}