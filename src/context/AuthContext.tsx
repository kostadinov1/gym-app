import React, { createContext, useState, useEffect, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authEvents } from '../utils/authEvents';

interface AuthContextType {
  userToken: string | null;
  isLoading: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [userToken, setUserToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await SecureStore.getItemAsync('userToken');
        if (token) {
          setUserToken(token);
        }
      } catch (e) {
        console.log('Restoring token failed');
      }
      setIsLoading(false);
    };

    bootstrapAsync();
  }, []);



  const signIn = async (token: string) => {
    await SecureStore.setItemAsync('userToken', token);
    setUserToken(token);
  };

  useEffect(() => {
    const unsubscribe = authEvents.subscribe(() => {
      signOut(); // This clears the token and state, forcing App.tsx to show LoginScreen
    });
    return unsubscribe;
  }, []);

  const signOut = async () => {
    await SecureStore.deleteItemAsync('userToken');
    setUserToken(null);
  };

  return (
    <AuthContext.Provider value={{ userToken, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);