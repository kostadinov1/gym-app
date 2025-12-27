import { useColorScheme } from 'react-native';

const palette = {
  blue: '#007AFF',
  lightBlue: '#0A84FF',
  green: '#34C759',
  lightGreen: '#E0F8E3', // Light background for completed sets
  darkGreen: '#1C3A22', // Dark background for completed sets
  red: '#FF3B30',
  white: '#FFFFFF',
  black: '#000000',
  gray100: '#F2F2F7',
  gray200: '#E5E5EA',
  gray800: '#1C1C1E',
  gray900: '#000000',
};

export const lightTheme = {
  mode: 'light',
  colors: {
    background: palette.gray100,
    card: palette.white,
    text: palette.black,
    textSecondary: '#666666',
    primary: palette.blue,
    border: palette.gray200,
    success: palette.green,
    successBackground: palette.lightGreen,
    inputBackground: '#F9F9F9',
  },
  spacing: { s: 8, m: 16, l: 24 },
  borderRadius: { m: 8, l: 12 },
};

export const darkTheme = {
  mode: 'dark',
  colors: {
    background: palette.black,
    card: palette.gray800,
    text: palette.white,
    textSecondary: '#A1A1A6',
    primary: palette.lightBlue,
    border: '#38383A',
    success: palette.green,
    successBackground: palette.darkGreen,
    inputBackground: '#2C2C2E',
  },
  spacing: { s: 8, m: 16, l: 24 },
  borderRadius: { m: 8, l: 12 },
};

// A helper hook to get the current theme automatically
export const useTheme = () => {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkTheme : lightTheme;
};