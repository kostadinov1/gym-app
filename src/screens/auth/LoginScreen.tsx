import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
} from 'react-native';
import { TouchableOpacity } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { useTheme } from '../../theme';
import { login, register } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PasswordStrengthBar } from '../../components/ui/PasswordStrengthBar';
import {
  validateAuthFields,
  getPasswordStrength,
  type AuthFieldErrors,
} from '../../utils/validation';

export default function LoginScreen() {
  const theme = useTheme();
  const { signIn, guestSignIn } = useAuth();

  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<AuthFieldErrors & { confirmPassword?: string }>({});

  const passwordStrength = getPasswordStrength(password);

  const clearErrors = () => setErrors({});

  const loginMutation = useMutation({
    mutationFn: () => login(email, password),
    onSuccess: (data) => signIn(data.access_token, email),
  });

  const registerMutation = useMutation({
    mutationFn: () => register(email, password),
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: 'Account created',
        text2: 'Please log in.',
        position: 'top',
      });
      setIsRegistering(false);
      setPassword('');
      setConfirmPassword('');
      clearErrors();
    },
  });

  const handleSubmit = () => {
    const fieldErrors: typeof errors = validateAuthFields(email, password, isRegistering);
    if (isRegistering && confirmPassword !== password) {
      fieldErrors.confirmPassword = 'Passwords do not match.';
    }
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    clearErrors();
    if (isRegistering) registerMutation.mutate();
    else loginMutation.mutate();
  };

  const handleSwitchMode = () => {
    setIsRegistering(!isRegistering);
    setPassword('');
    setConfirmPassword('');
    clearErrors();
  };

  const isLoading = loginMutation.isPending || registerMutation.isPending;

  const inputStyle = (hasError: boolean) => [
    styles.input,
    {
      color: theme.colors.text,
      borderColor: hasError ? theme.colors.error : theme.colors.border,
      backgroundColor: theme.colors.card,
    },
  ];

  return (
    <SafeAreaView edges={['bottom']} style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={[theme.typography.display, styles.title, { color: theme.colors.text }]}>
            {isRegistering ? 'Create Account' : 'Welcome Back'}
          </Text>
          <Text style={[theme.typography.body, styles.subtitle, { color: theme.colors.textSecondary }]}>
            {isRegistering ? 'Sign up to track your progress' : 'Sign in to continue'}
          </Text>

          {/* Email */}
          <TextInput
            style={inputStyle(!!errors.email)}
            placeholder="Email"
            placeholderTextColor={theme.colors.textSecondary}
            value={email}
            onChangeText={(v) => { setEmail(v); if (errors.email) setErrors(e => ({ ...e, email: undefined })); }}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          {errors.email && (
            <Text style={[styles.fieldError, { color: theme.colors.error }]}>{errors.email}</Text>
          )}

          {/* Password */}
          <TextInput
            style={inputStyle(!!errors.password)}
            placeholder="Password"
            placeholderTextColor={theme.colors.textSecondary}
            value={password}
            onChangeText={(v) => { setPassword(v); if (errors.password) setErrors(e => ({ ...e, password: undefined })); }}
            secureTextEntry
          />
          {errors.password && (
            <Text style={[styles.fieldError, { color: theme.colors.error }]}>{errors.password}</Text>
          )}

          {/* Password strength — only during registration */}
          {isRegistering && (
            <PasswordStrengthBar strength={passwordStrength} />
          )}

          {/* Confirm password — only during registration */}
          {isRegistering && (
            <>
              <TextInput
                style={inputStyle(!!errors.confirmPassword)}
                placeholder="Confirm Password"
                placeholderTextColor={theme.colors.textSecondary}
                value={confirmPassword}
                onChangeText={(v) => { setConfirmPassword(v); if (errors.confirmPassword) setErrors(e => ({ ...e, confirmPassword: undefined })); }}
                secureTextEntry
              />
              {errors.confirmPassword && (
                <Text style={[styles.fieldError, { color: theme.colors.error }]}>{errors.confirmPassword}</Text>
              )}
            </>
          )}

          <PrimaryButton
            label={isRegistering ? 'Sign Up' : 'Log In'}
            onPress={handleSubmit}
            loading={isLoading}
            style={{ marginTop: 8 }}
          />

          <TouchableOpacity
            style={{ marginTop: 20 }}
            onPress={handleSwitchMode}
          >
            <Text style={[theme.typography.body, { color: theme.colors.primary, textAlign: 'center' }]}>
              {isRegistering
                ? 'Already have an account? Log In'
                : "Don't have an account? Sign Up"}
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
            <Text style={[theme.typography.caption, styles.dividerText, { color: theme.colors.textSecondary }]}>
              or
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
          </View>

          {/* Guest access */}
          <PrimaryButton
            label="Continue as Guest"
            onPress={guestSignIn}
            variant="ghost"
          />
          <Text style={[theme.typography.caption, styles.guestNote, { color: theme.colors.textSecondary }]}>
            Your data will be saved on this device. Register later to sync to the cloud.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center' },
  content: { padding: 24 },
  title: { marginBottom: 8 },
  subtitle: { marginBottom: 32 },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 4,
    fontSize: 15,
  },
  fieldError: {
    fontSize: 12,
    marginBottom: 10,
    marginLeft: 4,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 16,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 12 },
  guestNote: {
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 17,
  },
});
