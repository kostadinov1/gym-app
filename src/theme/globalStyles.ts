// ---------------------------------------------------------------------------
// globalStyles — the "index.css equivalent" for React Native.
// Common layout patterns any screen can import and spread.
// ---------------------------------------------------------------------------
import { StyleSheet } from 'react-native';

export const gs = StyleSheet.create({
  // Layout
  flex1:          { flex: 1 },
  row:            { flexDirection: 'row', alignItems: 'center' },
  center:         { justifyContent: 'center', alignItems: 'center' },
  screenPadding:  { paddingHorizontal: 16 },
  sectionGap:     { marginTop: 24 },

  // Typography helpers
  textUppercase:  { textTransform: 'uppercase' },
  textCenter:     { textAlign: 'center' },

  // Common spacing
  p4:  { padding: 4 },
  p8:  { padding: 8 },
  p16: { padding: 16 },
  p24: { padding: 24 },
  mt8:  { marginTop: 8 },
  mt16: { marginTop: 16 },
  mt24: { marginTop: 24 },
  mb8:  { marginBottom: 8 },
  mb16: { marginBottom: 16 },
});
