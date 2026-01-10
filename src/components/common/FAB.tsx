import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

interface FABProps {
  onPress: () => void;
}

export const FAB = ({ onPress }: FABProps) => {
  const theme = useTheme();

  return (
    <TouchableOpacity 
      style={[styles.fab, { backgroundColor: theme.colors.primary }]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name="add" size={32} color="white" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    zIndex: 100, // Ensure it sits on top
  },
});