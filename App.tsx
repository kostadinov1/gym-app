import * as Sentry from '@sentry/react-native';
import React, { useEffect, useState } from 'react';
import { StatusBar, View, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { StorageProvider } from './src/context/StorageContext';
import { EntitlementProvider } from './src/context/EntitlementContext';
import { AdsProvider } from './src/components/ConsentManager';
import { useTheme } from './src/theme';
import RootNavigator from './src/navigation/RootNavigator';
import LoginScreen from './src/screens/auth/LoginScreen';
import ForgotPasswordScreen from './src/screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from './src/screens/auth/ResetPasswordScreen';
import { EmailVerificationBanner } from './src/components/EmailVerificationBanner';
import { useSyncQueryInvalidator } from './src/hooks/useSyncQueryInvalidator';
import { ThemeProvider } from './src/context/ThemeContext';
import { UnitsProvider } from './src/context/UnitsContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';


Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: process.env.EXPO_PUBLIC_ENV ?? 'development',
  enabled: process.env.EXPO_PUBLIC_ENV === 'production',
  beforeSend(event) {
    if (event.user) {
      delete event.user.email;
      delete event.user.username;
    }
    return event;
  },
});

const handleError = (error: Error) => {
  if (error.message === 'Session expired. Please login again.') return;
  Toast.show({
    type: 'error',
    text1: 'Error',
    text2: error.message,
    position: 'top',
  });
};

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleError }),
  mutationCache: new MutationCache({ onError: handleError }),
  defaultOptions: { queries: { retry: false } },
});

// ---------------------------------------------------------------------------
// Deep-link helpers
// ---------------------------------------------------------------------------

function parseDeepLink(url: string | null): { path: string; token: string } | null {
  if (!url) return null;
  try {
    // Expected formats:
    //   hardlog://reset-password?token=XXX
    //   hardlog://verify-email?token=XXX  (handled via browser, but guard anyway)
    const parsed = new URL(url);
    const path = parsed.hostname;  // e.g. "reset-password"
    const token = parsed.searchParams.get('token') ?? '';
    if (path && token) return { path, token };
  } catch {
    // Malformed URL — ignore
  }
  return null;
}

// ---------------------------------------------------------------------------
// NavigationWrapper — decides which top-level view to render
// ---------------------------------------------------------------------------

type UnauthScreen = 'login' | 'forgotPassword' | 'resetPassword';

const NavigationWrapper = () => {
  const { userToken, isGuest, isLoading } = useAuth();
  const theme = useTheme();
  useSyncQueryInvalidator();

  const [unauthScreen, setUnauthScreen] = useState<UnauthScreen>('login');
  const [pendingResetToken, setPendingResetToken] = useState<string | null>(null);

  // Handle deep links (password reset) while unauthenticated
  useEffect(() => {
    const handleUrl = (url: string | null) => {
      const link = parseDeepLink(url);
      if (!link) return;
      if (link.path === 'reset-password') {
        setPendingResetToken(link.token);
        setUnauthScreen('resetPassword');
      }
    };

    // Initial URL (app launched via deep link)
    Linking.getInitialURL().then(handleUrl).catch(() => {});

    // Subsequent links while app is running
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (userToken || isGuest) {
    return (
      <View style={{ flex: 1 }}>
        <EmailVerificationBanner />
        <RootNavigator />
      </View>
    );
  }

  // Unauthenticated screens
  if (unauthScreen === 'forgotPassword') {
    return <ForgotPasswordScreen onBack={() => setUnauthScreen('login')} />;
  }

  if (unauthScreen === 'resetPassword' && pendingResetToken) {
    return (
      <ResetPasswordScreen
        token={pendingResetToken}
        onDone={() => {
          setPendingResetToken(null);
          setUnauthScreen('login');
        }}
      />
    );
  }

  return <LoginScreen onForgotPassword={() => setUnauthScreen('forgotPassword')} />;
};

// ---------------------------------------------------------------------------
// Root app
// ---------------------------------------------------------------------------

function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <AuthProvider>
          <ThemeProvider>
            <UnitsProvider>
              <QueryClientProvider client={queryClient}>
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

export default Sentry.wrap(App);
