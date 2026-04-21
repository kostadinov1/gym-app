import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
} from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { forgotPassword } from '../../api/auth';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { isEmailValid } from '../../utils/validation';

interface Props {
  onBack: () => void;
}

export default function ForgotPasswordScreen({ onBack }: Props) {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [sent, setSent] = useState(false);

  const mutation = useMutation({
    mutationFn: () => forgotPassword(email.trim()),
    onSuccess: () => setSent(true),
  });

  const handleSubmit = () => {
    if (!isEmailValid(email)) {
      setEmailError('Please enter a valid email.');
      return;
    }
    setEmailError('');
    mutation.mutate();
  };

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.safe, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.content}>
        {/* Back */}
        <TouchableOpacity onPress={onBack} style={styles.backRow}>
          <Text style={[theme.typography.body, { color: theme.colors.primary }]}>← Back</Text>
        </TouchableOpacity>

        <Text style={[theme.typography.display, styles.title, { color: theme.colors.text }]}>
          Forgot Password
        </Text>

        {sent ? (
          <View style={styles.sentBox}>
            <Text style={[theme.typography.body, { color: theme.colors.text, textAlign: 'center' }]}>
              Check your inbox! If an account exists for{' '}
              <Text style={{ fontWeight: '600' }}>{email}</Text>, we've sent a reset link.
            </Text>
            <TouchableOpacity onPress={onBack} style={{ marginTop: 24 }}>
              <Text style={[theme.typography.body, { color: theme.colors.primary, textAlign: 'center' }]}>
                Back to Login
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={[theme.typography.body, styles.subtitle, { color: theme.colors.textSecondary }]}>
              Enter your email address and we'll send you a link to reset your password.
            </Text>

            <TextInput
              style={[styles.input, {
                color: theme.colors.text,
                borderColor: emailError ? theme.colors.error : theme.colors.border,
                backgroundColor: theme.colors.card,
              }]}
              placeholder="Email"
              placeholderTextColor={theme.colors.textSecondary}
              value={email}
              onChangeText={(v) => { setEmail(v); setEmailError(''); }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoFocus
            />
            {emailError ? (
              <Text style={[styles.fieldError, { color: theme.colors.error }]}>{emailError}</Text>
            ) : null}

            <PrimaryButton
              label="Send Reset Link"
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
  backRow: { marginBottom: 24 },
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
  sentBox: { flex: 1, justifyContent: 'center' },
});
