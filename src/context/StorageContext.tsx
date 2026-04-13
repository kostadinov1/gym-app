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

    const initDb = async () => {
      // Always run migrations — fast, idempotent, tracks applied state.
      // Wrapped in try/catch so a migration failure never permanently hangs the app.
      try {
        runMigrations();
      } catch (e) {
        console.error('[DB] Migration failed:', e);
        // Don't block — tables may already exist from a previous successful run.
      }

      if (isGuest) {
        // Guest users need the system exercise catalog seeded before any
        // screen renders. seedSystemExercises() is a no-op if already done.
        try {
          await seedSystemExercises();
        } catch (e) {
          console.error('[DB] Seeding failed:', e);
        }
      }

      // Always unblock the app — even if something above failed.
      setDbReady(true);
    };

    initDb();
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
