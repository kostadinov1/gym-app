import React, { createContext, useState, useEffect, useContext } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from '../theme';

type ThemeType = typeof lightTheme;

interface ThemeContextType {
  theme: ThemeType;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({} as ThemeContextType);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemScheme = useColorScheme(); // 'light' or 'dark' from OS
  const [isDark, setIsDark] = useState(systemScheme === 'dark');

  // 1. Load saved preference on startup
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('userTheme');
        if (savedTheme !== null) {
          // If user saved a preference, use it
          setIsDark(savedTheme === 'dark');
        }
      } catch (e) {
        console.log('Failed to load theme');
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
    <ThemeContext.Provider value={{ theme: activeTheme, isDark, toggleTheme }}>
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