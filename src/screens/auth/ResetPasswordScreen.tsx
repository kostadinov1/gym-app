import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { resetPassword } from '../../api/auth';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { PasswordStrengthBar } from '../../components/ui/PasswordStrengthBar';
import { getPasswordStrength, isPasswordValid } from '../../utils/validation';

interface Props {
  token: string;
  onDone: () => void;
}

export default function ResetPasswordScreen({ token, onDone }: Props) {
  const theme = useTheme();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [done, setDone] = useState(false);

  const strength = getPasswordStrength(password);

  const mutation = useMutation({
    mutationFn: () => resetPassword(token, password),
    onSuccess: () => setDone(true),
  });

  const handleSubmit = () => {
    const next: typeof errors = {};
    if (!isPasswordValid(password)) next.password = 'Password is too weak.';
    if (confirm !== password) next.confirm = 'Passwords do not match.';
    if (Object.keys(next).length) { setErrors(next); return; }
    setErrors({});
    mutation.mutate();
  };

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.safe, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.content}>
        <Text style={[theme.typography.display, styles.title, { color: theme.colors.text }]}>
          Reset Password
        </Text>

        {done ? (
          <View style={styles.doneBox}>
            <Text style={[theme.typography.body, { color: theme.colors.text, textAlign: 'center' }]}>
              Your password has been updated. You can now log in.
            </Text>
            <TouchableOpacity onPress={onDone} style={{ marginTop: 24 }}>
              <Text style={[theme.typography.body, { color: theme.colors.primary, textAlign: 'center' }]}>
                Back to Login
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={[theme.typography.body, styles.subtitle, { color: theme.colors.textSecondary }]}>
              Choose a new strong password.
            </Text>

            <TextInput
              style={[styles.input, {
                color: theme.colors.text,
                borderColor: errors.password ? theme.colors.error : theme.colors.border,
                backgroundColor: theme.colors.card,
              }]}
              placeholder="New Password"
              placeholderTextColor={theme.colors.textSecondary}
              value={password}
              onChangeText={(v) => { setPassword(v); setErrors(e => ({ ...e, password: undefined })); }}
              secureTextEntry
              autoFocus
            />
            {errors.password && (
              <Text style={[styles.fieldError, { color: theme.colors.error }]}>{errors.password}</Text>
            )}

            <PasswordStrengthBar strength={strength} />

            <TextInput
              style={[styles.input, {
                color: theme.colors.text,
                borderColor: errors.confirm ? theme.colors.error : theme.colors.border,
                backgroundColor: theme.colors.card,
              }]}
              placeholder="Confirm New Password"
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
              style={{ marginTop: 8 }}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flex: 1, padding: 24 },
  title: { marginBottom: 8 },
  subtitle: { marginBottom: 28 },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 4,
    fontSize: 15,
  },
  fieldError: { fontSize: 12, marginBottom: 10, marginLeft: 4 },
  doneBox: { flex: 1, justifyContent: 'center' },
});
