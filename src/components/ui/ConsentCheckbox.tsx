import React from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTheme } from '../../theme';

const PRIVACY_URL = 'https://gymlogic.io/privacy';
const TERMS_URL = 'https://gymlogic.io/terms';

interface Props {
  checked: boolean;
  onToggle: () => void;
  error?: string;
  style?: object;
}

export function ConsentCheckbox({ checked, onToggle, error, style }: Props) {
  const theme = useTheme();

  return (
    <View style={style}>
      <View style={styles.row}>
        <TouchableOpacity onPress={onToggle} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
          <View style={[
            styles.box,
            {
              borderColor: error ? theme.colors.error : checked ? theme.colors.primary : theme.colors.border,
              backgroundColor: checked ? theme.colors.primary : 'transparent',
            },
          ]}>
            {checked && <Check size={12} color="#fff" strokeWidth={3} />}
          </View>
        </TouchableOpacity>
        <Text
          style={[styles.label, { color: theme.colors.textSecondary }]}
          onPress={onToggle}
        >
          {'I have read and agree to the '}
          <Text
            style={{ color: theme.colors.primary }}
            onPress={() => Linking.openURL(PRIVACY_URL)}
          >
            Privacy Policy
          </Text>
          {' and '}
          <Text
            style={{ color: theme.colors.primary }}
            onPress={() => Linking.openURL(TERMS_URL)}
          >
            Terms of Service
          </Text>
        </Text>
      </View>
      {error ? (
        <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  box: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  label: {
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 30,
  },
});
