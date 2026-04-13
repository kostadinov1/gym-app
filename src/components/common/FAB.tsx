import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useTheme } from '../../theme';

interface FABProps {
  onPress: () => void;
  style?: ViewStyle; // <--- Add this optional prop
}

export const FAB = ({ onPress, style }: FABProps) => {
  const theme = useTheme();

  return (
    <TouchableOpacity 
      // Merge default styles with the passed 'style' prop
      style={[styles.fab, { backgroundColor: theme.colors.primary }, style]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Plus size={32} color="white" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24, // Default bottom
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    zIndex: 100,
  },
});