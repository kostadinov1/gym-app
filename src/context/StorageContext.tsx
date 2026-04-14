import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from './AuthContext';
import { useTheme } from '../theme';
import { runMigrations } from '../db/client';
import { seedSystemExercises } from '../db/seed';
import { LocalService } from '../services/LocalService';
import { SyncService } from '../services/SyncService';
import type { IAppService } from '../services/types';

// LocalService is instantiated once for the lifetime of the app.
// All users (ghost and registered) read/write SQLite via this singleton.
// SyncService runs in the background for registered users.
const localService = new LocalService();

const StorageContext = createContext<IAppService>(localService);

export const StorageProvider = ({ children }: { children: React.ReactNode }) => {
  const { isGuest, userToken, isLoading: authLoading } = useAuth();
  const theme = useTheme();
  const [dbReady, setDbReady] = useState(false);
  const syncStarted = useRef(false);

  // --- DB initialisation ---------------------------------------------------
  useEffect(() => {
    if (authLoading) return;

    const initDb = async () => {
      try {
        runMigrations();
      } catch (e) {
        console.error('[DB] Migration failed:', e);
        // Don't block — tables may already exist from a previous successful run.
      }

      // Seed the system exercise catalog for all users so the library works
      // fully offline regardless of auth state.
      try {
        await seedSystemExercises();
      } catch (e) {
        console.error('[DB] Seeding failed:', e);
      }

      setDbReady(true);
    };

    initDb();
  }, [authLoading]);

  // --- SyncService lifecycle ------------------------------------------------
  // Start sync when a registered user is authenticated; stop it on sign-out.
  useEffect(() => {
    if (!dbReady) return;

    if (!isGuest && userToken) {
      if (!syncStarted.current) {
        SyncService.start(userToken, localService);
        syncStarted.current = true;
      } else {
        // Token may have refreshed — update the service's token reference
        SyncService.updateToken(userToken);
      }
    } else {
      if (syncStarted.current) {
        SyncService.stop();
        syncStarted.current = false;
      }
    }
  }, [isGuest, userToken, dbReady]);

  if (!dbReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <StorageContext.Provider value={localService}>
      {children}
    </StorageContext.Provider>
  );
};

export const useStorage = () => useContext(StorageContext);
