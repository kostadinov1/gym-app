import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useTheme } from '../../theme';

interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  loading?: boolean;
  autoFocus?: boolean;
}

export function SearchInput({
  value,
  onChangeText,
  placeholder = 'Search…',
  onClear,
  loading = false,
  autoFocus = false,
}: SearchInputProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border },
      ]}
    >
      <Search size={16} color={theme.colors.textSecondary} />
      <TextInput
        style={[styles.input, { color: theme.colors.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        returnKeyType="search"
      />
      {loading && (
        <ActivityIndicator size="small" color={theme.colors.textSecondary} style={styles.icon} />
      )}
      {!loading && value.length > 0 && (
        <TouchableOpacity
          onPress={() => {
            onChangeText('');
            onClear?.();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.icon}
        >
          <X size={14} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    padding: 0,  // removes extra Android padding
  },
  icon: {
    marginLeft: 4,
  },
});
