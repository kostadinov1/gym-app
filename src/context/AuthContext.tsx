import React, { createContext, useState, useEffect, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authEvents } from '../utils/authEvents';
import { clearLocalUserData } from '../db/clearUserData';

const GUEST_MODE_KEY = 'isGuestMode';
const USER_EMAIL_KEY = 'userEmail';

interface AuthContextType {
  userToken: string | null;
  userEmail: string | null;  // null for guest users
  isGuest: boolean;
  isLoading: boolean;
  signIn: (token: string, email: string) => Promise<void>;
  signOut: () => Promise<void>;
  guestSignIn: () => Promise<void>;
  promoteGuest: (token: string, email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await SecureStore.getItemAsync('userToken');
        if (token) {
          setUserToken(token);
          const email = await AsyncStorage.getItem(USER_EMAIL_KEY);
          setUserEmail(email);
        } else {
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

  const signIn = async (token: string, email: string) => {
    await SecureStore.setItemAsync('userToken', token);
    await AsyncStorage.setItem(USER_EMAIL_KEY, email);
    setUserToken(token);
    setUserEmail(email);
  };

  const signOut = async () => {
    // Wipe all user-created local data before clearing auth state.
    // This covers all sign-out paths: manual logout, session expiry (401),
    // and account deletion — so no user ever sees another user's local data.
    await clearLocalUserData();
    await SecureStore.deleteItemAsync('userToken');
    await AsyncStorage.multiRemove([GUEST_MODE_KEY, USER_EMAIL_KEY]);
    setUserToken(null);
    setUserEmail(null);
    setIsGuest(false);
  };

  // Enter the app as a guest — all data stored locally, no network needed.
  const guestSignIn = async () => {
    await AsyncStorage.setItem(GUEST_MODE_KEY, 'true');
    setIsGuest(true);
  };

  // Called after a guest successfully registers and local data is migrated.
  const promoteGuest = async (token: string, email: string) => {
    await SecureStore.setItemAsync('userToken', token);
    await AsyncStorage.setItem(USER_EMAIL_KEY, email);
    await AsyncStorage.removeItem(GUEST_MODE_KEY);
    setIsGuest(false);
    setUserToken(token);
    setUserEmail(email);
  };

  return (
    <AuthContext.Provider value={{ userToken, userEmail, isGuest, isLoading, signIn, signOut, guestSignIn, promoteGuest }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
