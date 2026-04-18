import * as Sentry from '@sentry/react-native';
import React from 'react';
import { StatusBar, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { StorageProvider } from './src/context/StorageContext';
import { EntitlementProvider } from './src/context/EntitlementContext';
import { AdsProvider } from './src/components/ConsentManager';
import { useTheme } from './src/theme';
import RootNavigator from './src/navigation/RootNavigator';
import LoginScreen from './src/screens/auth/LoginScreen';
import { useSyncQueryInvalidator } from './src/hooks/useSyncQueryInvalidator';
import { ThemeProvider } from './src/context/ThemeContext';
import { UnitsProvider } from './src/context/UnitsContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: process.env.EXPO_PUBLIC_ENV ?? 'development',
  // Only send events in production builds
  enabled: process.env.EXPO_PUBLIC_ENV === 'production',
  // Strip PII before sending (GDPR compliance)
  beforeSend(event) {
    if (event.user) {
      delete event.user.email;
      delete event.user.username;
    }
    return event;
  },
});

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
  const { userToken, isGuest, isLoading } = useAuth();
  const theme = useTheme();
  useSyncQueryInvalidator();

  if (isLoading) {
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
    );
  }

  // Both registered users (userToken) and ghost users (isGuest) enter the app
  return (userToken || isGuest) ? <RootNavigator /> : <LoginScreen />;
};

function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ThemeProvider>
          <UnitsProvider>
              {/* 3. Pass the configured client here */}
              <QueryClientProvider client={queryClient}>
                  {/* StorageProvider injects RemoteService or LocalService
                      depending on whether the user is a guest */}
                  <StorageProvider>
                      <EntitlementProvider>
                      <AdsProvider>
                          <StatusBar barStyle="default" />
                          <NavigationWrapper />
                      </AdsProvider>
                  </EntitlementProvider>
                  </StorageProvider>
                  <Toast />
              </QueryClientProvider>
          </UnitsProvider>
          </ThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Wrap with Sentry for automatic crash boundary and error reporting
export default Sentry.wrap(App);