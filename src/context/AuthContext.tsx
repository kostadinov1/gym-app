import React, { createContext, useState, useEffect, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authEvents } from '../utils/authEvents';

const GUEST_MODE_KEY = 'isGuestMode';

interface AuthContextType {
  userToken: string | null;
  isGuest: boolean;
  isLoading: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  guestSignIn: () => Promise<void>;
  promoteGuest: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [userToken, setUserToken] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await SecureStore.getItemAsync('userToken');
        if (token) {
          setUserToken(token);
        } else {
          // No real account — check if a guest session was previously started
          const guestMode = await AsyncStorage.getItem(GUEST_MODE_KEY);
          if (guestMode === 'true') setIsGuest(true);
        }
      } catch (e) {
        console.log('Restoring auth state failed');
      }
      setIsLoading(false);
    };

    bootstrapAsync();
  }, []);

  useEffect(() => {
    const unsubscribe = authEvents.subscribe(() => {
      signOut();
    });
    return unsubscribe;
  }, []);

  const signIn = async (token: string) => {
    await SecureStore.setItemAsync('userToken', token);
    setUserToken(token);
  };

  const signOut = async () => {
    await SecureStore.deleteItemAsync('userToken');
    await AsyncStorage.removeItem(GUEST_MODE_KEY);
    setUserToken(null);
    setIsGuest(false);
  };

  // Enter the app as a guest — all data stored locally, no network needed.
  const guestSignIn = async () => {
    await AsyncStorage.setItem(GUEST_MODE_KEY, 'true');
    setIsGuest(true);
  };

  // Called after a guest successfully registers and local data is migrated.
  // IMPORTANT: the caller must flush the React Query cache BEFORE calling this
  // so no stale local data leaks into the remote-backed screens.
  const promoteGuest = async (token: string) => {
    await SecureStore.setItemAsync('userToken', token);
    await AsyncStorage.removeItem(GUEST_MODE_KEY);
    setIsGuest(false);
    setUserToken(token);
  };

  return (
    <AuthContext.Provider value={{ userToken, isGuest, isLoading, signIn, signOut, guestSignIn, promoteGuest }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
