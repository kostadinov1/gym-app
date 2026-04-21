import React, { createContext, useState, useEffect, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authEvents } from '../utils/authEvents';
import { clearLocalUserData } from '../db/clearUserData';
import { getMe } from '../api/auth';

const GUEST_MODE_KEY = 'isGuestMode';
const USER_EMAIL_KEY = 'userEmail';

interface AuthContextType {
  userToken: string | null;
  userEmail: string | null;  // null for guest users
  isGuest: boolean;
  isLoading: boolean;
  isEmailVerified: boolean;
  hasPassword: boolean;
  signIn: (token: string, email: string) => Promise<void>;
  signOut: () => Promise<void>;
  guestSignIn: () => Promise<void>;
  promoteGuest: (token: string, email: string) => Promise<void>;
  refreshUserInfo: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState(true);
  const [hasPassword, setHasPassword] = useState(true);

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await SecureStore.getItemAsync('userToken');
        if (token) {
          setUserToken(token);
          const email = await AsyncStorage.getItem(USER_EMAIL_KEY);
          setUserEmail(email);
          // Fetch profile flags with the restored token
          try {
            const me = await getMe();
            setIsEmailVerified(me.is_email_verified);
            setHasPassword(me.has_password);
          } catch {
            // Non-critical; defaults are safe
          }
        } else {
          const guestMode = await AsyncStorage.getItem(GUEST_MODE_KEY);
          if (guestMode === 'true') setIsGuest(true);
        }
      } catch {
        // Restoring auth state failed
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

  const refreshUserInfo = async () => {
    try {
      const me = await getMe();
      setIsEmailVerified(me.is_email_verified);
      setHasPassword(me.has_password);
      if (me.email) setUserEmail(me.email);
    } catch {
      // Non-critical
    }
  };

  const signIn = async (token: string, email: string) => {
    await SecureStore.setItemAsync('userToken', token);
    await AsyncStorage.setItem(USER_EMAIL_KEY, email);
    setUserToken(token);
    setUserEmail(email);
    // Populate profile flags right after token is stored
    try {
      const me = await getMe();
      setIsEmailVerified(me.is_email_verified);
      setHasPassword(me.has_password);
    } catch {
      // Non-critical; banner defaults to hidden
    }
  };

  const signOut = async () => {
    await clearLocalUserData();
    await SecureStore.deleteItemAsync('userToken');
    await AsyncStorage.multiRemove([GUEST_MODE_KEY, USER_EMAIL_KEY]);
    setUserToken(null);
    setUserEmail(null);
    setIsGuest(false);
    setIsEmailVerified(true);
    setHasPassword(true);
  };

  const guestSignIn = async () => {
    await AsyncStorage.setItem(GUEST_MODE_KEY, 'true');
    setIsGuest(true);
  };

  const promoteGuest = async (token: string, email: string) => {
    await SecureStore.setItemAsync('userToken', token);
    await AsyncStorage.setItem(USER_EMAIL_KEY, email);
    await AsyncStorage.removeItem(GUEST_MODE_KEY);
    setIsGuest(false);
    setUserToken(token);
    setUserEmail(email);
    try {
      const me = await getMe();
      setIsEmailVerified(me.is_email_verified);
      setHasPassword(me.has_password);
    } catch {
      // Non-critical
    }
  };

  return (
    <AuthContext.Provider value={{
      userToken, userEmail, isGuest, isLoading,
      isEmailVerified, hasPassword,
      signIn, signOut, guestSignIn, promoteGuest, refreshUserInfo,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
