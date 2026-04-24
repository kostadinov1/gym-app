// Design tokens. No dependencies — safe to import from anywhere,
// including ThemeContext. The public surface is re-exported from ./index.

const palette = {
  blue: '#007AFF',
  lightBlue: '#0A84FF',
  green: '#34C759',
  lightGreen: '#E0F8E3',
  darkGreen: '#1C3A22',
  red: '#FF3B30',
  redDark: '#FF453A',
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#F7F7F8',
  gray100: '#F2F2F7',
  gray200: '#E5E5EA',
  gray300: '#EFEFF4',
  gray800: '#1C1C1E',
  gray850: '#2C2C2E',
  gray900: '#111111',
  grayInputLight: '#F2F2F5',
  grayInputDark: '#2C2C2E',
};

const typography = {
  display:      { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  title:        { fontSize: 17, fontWeight: '600' as const },
  body:         { fontSize: 15, fontWeight: '400' as const },
  label:        { fontSize: 13, fontWeight: '500' as const },
  caption:      { fontSize: 12, fontWeight: '400' as const },
  sectionHeader:{ fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.8 },
} as const;

const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  none: {},
} as const;

const spacing = { xs: 4, s: 8, m: 16, l: 24, xl: 32 } as const;
const borderRadius = { s: 8, m: 12, l: 16, full: 9999 } as const;

export const lightTheme = {
  mode: 'light' as const,
  colors: {
    background:       palette.gray50,
    card:             palette.white,
    surface:          palette.gray300,
    text:             palette.black,
    textSecondary:    '#6B6B6B',
    primary:          palette.blue,
    border:           palette.gray200,
    success:          palette.green,
    successBackground:palette.lightGreen,
    inputBackground:  palette.grayInputLight,
    error:            palette.red,
  },
  typography,
  shadow,
  spacing,
  borderRadius,
};

export const darkTheme = {
  mode: 'dark' as const,
  colors: {
    background:       '#000000',
    card:             palette.gray800,
    surface:          palette.gray850,
    text:             palette.white,
    textSecondary:    '#A1A1A6',
    primary:          palette.lightBlue,
    border:           '#38383A',
    success:          palette.green,
    successBackground:palette.darkGreen,
    inputBackground:  palette.grayInputDark,
    error:            palette.redDark,
  },
  typography,
  shadow: shadow.none,
  spacing,
  borderRadius,
};
