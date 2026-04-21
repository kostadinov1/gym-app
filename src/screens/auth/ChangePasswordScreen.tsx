import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { changePassword } from '../../api/auth';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { PasswordStrengthBar } from '../../components/ui/PasswordStrengthBar';
import { getPasswordStrength, isPasswordValid } from '../../utils/validation';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import Toast from 'react-native-toast-message';

export default function ChangePasswordScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const [current, setCurrent] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{
    current?: string;
    newPw?: string;
    confirm?: string;
  }>({});

  const strength = getPasswordStrength(newPw);

  const mutation = useMutation({
    mutationFn: () => changePassword(current, newPw),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Password updated', position: 'top' });
      navigation.goBack();
    },
    onError: (err: any) => {
      if (err?.message?.toLowerCase().includes('current')) {
        setErrors(e => ({ ...e, current: 'Current password is incorrect.' }));
      }
    },
  });

  const handleSubmit = () => {
    const next: typeof errors = {};
    if (!current) next.current = 'Enter your current password.';
    if (!isPasswordValid(newPw)) next.newPw = 'New password is too weak.';
    if (confirm !== newPw) next.confirm = 'Passwords do not match.';
    if (Object.keys(next).length) { setErrors(next); return; }
    setErrors({});
    mutation.mutate();
  };

  const inputStyle = (hasError: boolean) => [
    styles.input,
    {
      color: theme.colors.text,
      borderColor: hasError ? theme.colors.error : theme.colors.border,
      backgroundColor: theme.colors.card,
    },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={[]}>
      <ScreenHeader title="Change Password" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Current password */}
        <Text style={[theme.typography.label, styles.label, { color: theme.colors.textSecondary }]}>
          Current Password
        </Text>
        <TextInput
          style={inputStyle(!!errors.current)}
          placeholder="Current password"
          placeholderTextColor={theme.colors.textSecondary}
          value={current}
          onChangeText={(v) => { setCurrent(v); setErrors(e => ({ ...e, current: undefined })); }}
          secureTextEntry
        />
        {errors.current && (
          <Text style={[styles.fieldError, { color: theme.colors.error }]}>{errors.current}</Text>
        )}

        {/* New password */}
        <Text style={[theme.typography.label, styles.label, { color: theme.colors.textSecondary }]}>
          New Password
        </Text>
        <TextInput
          style={inputStyle(!!errors.newPw)}
          placeholder="New password"
          placeholderTextColor={theme.colors.textSecondary}
          value={newPw}
          onChangeText={(v) => { setNewPw(v); setErrors(e => ({ ...e, newPw: undefined })); }}
          secureTextEntry
        />
        {errors.newPw && (
          <Text style={[styles.fieldError, { color: theme.colors.error }]}>{errors.newPw}</Text>
        )}
        <PasswordStrengthBar strength={strength} />

        {/* Confirm */}
        <Text style={[theme.typography.label, styles.label, { color: theme.colors.textSecondary }]}>
          Confirm New Password
        </Text>
        <TextInput
          style={inputStyle(!!errors.confirm)}
          placeholder="Confirm new password"
          placeholderTextColor={theme.colors.textSecondary}
          value={confirm}
          onChangeText={(v) => { setConfirm(v); setErrors(e => ({ ...e, confirm: undefined })); }}
          secureTextEntry
        />
        {errors.confirm && (
          <Text style={[styles.fieldError, { color: theme.colors.error }]}>{errors.confirm}</Text>
        )}

        <PrimaryButton
          label="Update Password"
          onPress={handleSubmit}
          loading={mutation.isPending}
          style={{ marginTop: 16 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  label: { marginTop: 16, marginBottom: 6 },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 4,
    fontSize: 15,
  },
  fieldError: { fontSize: 12, marginBottom: 8, marginLeft: 4 },
});
