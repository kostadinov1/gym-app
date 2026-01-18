import React from 'react';
import { StatusBar, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { useTheme } from './src/theme';
import RootNavigator from './src/navigation/RootNavigator';
import LoginScreen from './src/screens/auth/LoginScreen';
import { ThemeProvider } from './src/context/ThemeContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';

// 1. Define Global Error Handler OUTSIDE the components
const handleError = (error: Error) => {
    // Ignore "Session Expired" (Handled by client.ts logic)
    if (error.message === "Session expired. Please login again.") return;

    // Show Toast for other errors
    Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message,
        position: 'bottom'
    });
};

// 2. Create the Client ONCE with the handlers
const queryClient = new QueryClient({
    queryCache: new QueryCache({
        onError: handleError
    }),
    mutationCache: new MutationCache({
        onError: handleError
    }),
    defaultOptions: {
        queries: {
            retry: false,
        }
    }
});

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ThemeProvider>
              {/* 3. Pass the configured client here */}
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