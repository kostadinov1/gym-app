import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from './AuthContext';
import { useTheme } from '../theme';
import { runMigrations } from '../db/client';
import { seedSystemExercises } from '../db/seed';
import { RemoteService } from '../services/RemoteService';
import { LocalService } from '../services/LocalService';
import type { IAppService } from '../services/types';

const StorageContext = createContext<IAppService>({} as IAppService);

export const StorageProvider = ({ children }: { children: React.ReactNode }) => {
  const { isGuest, isLoading: authLoading } = useAuth();
  const theme = useTheme();
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    // Wait until auth state is resolved before initialising the DB.
    if (authLoading) return;

    // Always run migrations — fast, idempotent, tracks applied state.
    runMigrations();

    if (isGuest) {
      // Guest users need the system exercise catalog seeded before any
      // screen renders. seedSystemExercises() is a no-op if already done.
      seedSystemExercises().then(() => setDbReady(true));
    } else {
      // Logged-in users go straight to the remote service — no local DB needed.
      setDbReady(true);
    }
  }, [isGuest, authLoading]);

  const service: IAppService = useMemo(
    () => (isGuest ? new LocalService() : new RemoteService()),
    [isGuest],
  );

  // Show a loading indicator while the DB initialises for guest users.
  // For logged-in users this resolves instantly.
  if (!dbReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <StorageContext.Provider value={service}>
      {children}
    </StorageContext.Provider>
  );
};

export const useStorage = () => useContext(StorageContext);
