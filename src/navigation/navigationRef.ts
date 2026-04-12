import { createNavigationContainerRef } from '@react-navigation/native';

// A ref to the NavigationContainer used outside React components
// (e.g. EntitlementContext opening the paywall from anywhere in the tree).
export const navigationRef = createNavigationContainerRef<Record<string, object | undefined>>();
