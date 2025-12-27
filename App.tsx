import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RootNavigator from './src/navigation/RootNavigator';

// Initialize the Query Client
const queryClient = new QueryClient();

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        {/* Status Bar style will be handled inside screens/navigator, 
            but we set a default here */}
        <StatusBar barStyle="dark-content" />
        <RootNavigator />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}