import React, { createContext, useState, useEffect, useContext } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from '../theme/tokens';

type ThemeType = typeof lightTheme;

interface ThemeContextType {
  theme: ThemeType;
  isDark: boolean;
  isThemeLoaded: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({} as ThemeContextType);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemScheme = useColorScheme(); // 'light' or 'dark' from OS
  const [isDark, setIsDark] = useState(systemScheme === 'dark');
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);

  // 1. Load saved preference on startup
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('userTheme');
        if (savedTheme !== null) {
          setIsDark(savedTheme === 'dark');
        }
      } catch (e) {
        console.warn('Failed to load theme');
      } finally {
        setIsThemeLoaded(true);
      }
    };
    loadTheme();
  }, []);

  // 2. Toggle Function
  const toggleTheme = async () => {
    const newMode = !isDark;
    setIsDark(newMode);
    await AsyncStorage.setItem('userTheme', newMode ? 'dark' : 'light');
  };

  // 3. Compute the active theme object
  const activeTheme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme: activeTheme, isDark, isThemeLoaded, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom Hook to use the theme anywhere
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context.theme; // Returns colors
};

// Hook to get the toggle function
export const useThemeToggle = () => {
    const context = useContext(ThemeContext);
    return { isDark: context.isDark, toggleTheme: context.toggleTheme };
}

// Hook to check if the saved theme has finished loading from storage
export const useThemeReady = () => {
  const context = useContext(ThemeContext);
  return context.isThemeLoaded;
};