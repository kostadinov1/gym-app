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

export default function LoginScreen() {
  const theme = useTheme();
  const { signIn, guestSignIn } = useAuth();

  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
    },
  });

  const handleSubmit = () => {
    if (!email || !password) {
      Toast.show({
        type: 'error',
        text1: 'Missing Fields',
        text2: 'Please enter both email and password.',
        position: 'top',
      });
      return;
    }
    if (isRegistering) registerMutation.mutate();
    else loginMutation.mutate();
  };

  const isLoading = loginMutation.isPending || registerMutation.isPending;

  const inputStyle = [
    styles.input,
    {
      color: theme.colors.text,
      borderColor: theme.colors.border,
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

            <TextInput
              style={inputStyle}
              placeholder="Email"
              placeholderTextColor={theme.colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <TextInput
              style={inputStyle}
              placeholder="Password"
              placeholderTextColor={theme.colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <PrimaryButton
              label={isRegistering ? 'Sign Up' : 'Log In'}
              onPress={handleSubmit}
              loading={isLoading}
              style={{ marginTop: 8 }}
            />

            <TouchableOpacity
              style={{ marginTop: 20 }}
              onPress={() => setIsRegistering(!isRegistering)}
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
    marginBottom: 14,
    fontSize: 15,
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
