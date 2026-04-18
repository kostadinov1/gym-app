import React from 'react';
import { TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme';

interface IconButtonProps {
  icon: React.ElementType;
  onPress: () => void;
  color?: string;
  size?: number;
  style?: object;
}

export function IconButton({ icon: Icon, onPress, color, size = 22, style }: IconButtonProps) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={style}
    >
      <Icon size={size} color={color ?? theme.colors.primary} />
    </TouchableOpacity>
  );
}
