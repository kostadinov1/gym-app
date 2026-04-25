import React, { useState, forwardRef } from 'react';
import {
  View,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '../../theme';

interface PasswordInputProps extends Omit<TextInputProps, 'secureTextEntry'> {
  containerStyle?: StyleProp<ViewStyle>;
}

export const PasswordInput = forwardRef<TextInput, PasswordInputProps>(
  ({ containerStyle, style, ...rest }, ref) => {
    const theme = useTheme();
    const [visible, setVisible] = useState(false);

    return (
      <View style={[styles.wrap, containerStyle]}>
        <TextInput
          ref={ref}
          {...rest}
          style={[style, styles.input]}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={styles.toggle}
          onPress={() => setVisible(v => !v)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          accessibilityRole="button"
        >
          {visible
            ? <EyeOff size={20} color={theme.colors.textSecondary} />
            : <Eye size={20} color={theme.colors.textSecondary} />}
        </TouchableOpacity>
      </View>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';

const styles = StyleSheet.create({
  wrap: { position: 'relative', justifyContent: 'center' },
  input: { paddingRight: 44 },
  toggle: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
