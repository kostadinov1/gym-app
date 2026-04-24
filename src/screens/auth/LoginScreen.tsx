import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, Modal, Pressable,
} from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useMutation } from '@tanstack/react-query';
import { useTheme } from '../../theme';
import { login, register, googleSignIn, googleLink } from '../../api/auth';
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

WebBrowser.maybeCompleteAuthSession();

interface Props {
  onForgotPassword: () => void;
}

export default function LoginScreen({ onForgotPassword }: Props) {
  const theme = useTheme();
  const { signIn, guestSignIn } = useAuth();

  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<AuthFieldErrors & { confirmPassword?: string }>({});

  // Account linking state — shown when Google email matches an existing account
  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [pendingAccessToken, setPendingAccessToken] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState('');
  const [linkPassword, setLinkPassword] = useState('');
  const [linkError, setLinkError] = useState('');

  const passwordStrength = getPasswordStrength(password);
  const clearErrors = () => setErrors({});

  // ── Google auth request ───────────────────────────────────────────────────
  // Native Android flow: Google's OAuth redirects back to the app via the
  // reversed-client-ID scheme, which expo-auth-session registers automatically.
  // Requires: the Android client in Google Cloud Console must have this app's
  // package name (com.gencho.gymlogic) and the dev keystore SHA-1 registered.
  const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const googleAndroidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

  const googleConfig = googleAndroidClientId && googleWebClientId
    ? {
        androidClientId: googleAndroidClientId,
        webClientId: googleWebClientId,
        scopes: ['openid', 'profile', 'email'],
      }
    : {};

  const [, googleResponse, googlePromptAsync] = Google.useAuthRequest(googleConfig);

  useEffect(() => {
    if (!googleResponse) return;
    console.log('[Google v3] type:', googleResponse.type);
    if (googleResponse.type === 'success') {
      const accessToken = googleResponse.authentication?.accessToken;
      console.log('[Google v3] has accessToken:', !!accessToken);
      if (accessToken) handleGoogleToken(accessToken);
    } else if (googleResponse.type === 'error') {
      console.warn('[Google v3] error:', googleResponse.error);
    }
  }, [googleResponse]);

  const googleMutation = useMutation({
    mutationFn: (accessToken: string) => googleSignIn(accessToken),
    onSuccess: async (data) => {
      await signIn(data.access_token, data.email ?? '');
    },
    onError: (err: any) => {
      // 409 → needs_linking
      if (err?.status === 409 || err?.detail?.needs_linking) {
        const detail = err?.detail ?? {};
        setPendingEmail(detail.email ?? '');
        setPendingAccessToken(googleResponse?.type === 'success'
          ? googleResponse.authentication?.accessToken ?? null
          : null);
        setLinkModalVisible(true);
      }
    },
  });

  const linkMutation = useMutation({
    mutationFn: ({ accessToken, pw }: { accessToken: string; pw: string }) =>
      googleLink(accessToken, pw),
    onSuccess: async (data) => {
      setLinkModalVisible(false);
      setLinkPassword('');
      await signIn(data.access_token, data.email ?? pendingEmail);
    },
    onError: () => {
      setLinkError('Incorrect password. Please try again.');
    },
  });

  const handleGoogleToken = (accessToken: string) => {
    googleMutation.mutate(accessToken);
  };

  const handleGooglePress = () => {
    Toast.show({
      type: 'info',
      text1: 'Google sign-in coming soon',
      text2: 'Please use email & password for now.',
      position: 'top',
    });
  };

  // ── Email / password ──────────────────────────────────────────────────────
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

  const isLoading =
    loginMutation.isPending ||
    registerMutation.isPending ||
    googleMutation.isPending;

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

      {/* ── Account linking modal ─────────────────────────────────────────── */}
      <Modal
        visible={linkModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLinkModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setLinkModalVisible(false)}>
          <Pressable style={styles.modalCardWrap} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.modalCard, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Link Your Accounts
              </Text>
              <Text style={[theme.typography.body, { color: theme.colors.textSecondary, marginBottom: 20 }]}>
                A GymLogic account already exists for{' '}
                <Text style={{ fontWeight: '600', color: theme.colors.text }}>{pendingEmail}</Text>.
                {'\n'}Enter your password to link your Google account.
              </Text>

              <TextInput
                style={[styles.modalInput, {
                  color: theme.colors.text,
                  backgroundColor: theme.colors.background,
                  borderColor: linkError ? theme.colors.error : theme.colors.border,
                }]}
                placeholder="Your current password"
                placeholderTextColor={theme.colors.textSecondary}
                value={linkPassword}
                onChangeText={(v) => { setLinkPassword(v); setLinkError(''); }}
                secureTextEntry
                autoFocus
              />
              {linkError ? (
                <Text style={[styles.fieldError, { color: theme.colors.error }]}>{linkError}</Text>
              ) : null}

              <PrimaryButton
                label="Link & Sign In"
                loading={linkMutation.isPending}
                onPress={() => {
                  if (!pendingAccessToken || !linkPassword) return;
                  linkMutation.mutate({ accessToken: pendingAccessToken, pw: linkPassword });
                }}
                style={{ marginTop: 12 }}
              />
              <TouchableOpacity
                style={{ marginTop: 12, padding: 8, alignSelf: 'center' }}
                onPress={() => { setLinkModalVisible(false); setLinkPassword(''); setLinkError(''); }}
              >
                <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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

          {/* Forgot password — login mode only */}
          {!isRegistering && (
            <TouchableOpacity
              style={styles.forgotPasswordRow}
              onPress={onForgotPassword}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[theme.typography.caption, { color: theme.colors.primary }]}>
                Forgot password?
              </Text>
            </TouchableOpacity>
          )}

          {/* Password strength — registration only */}
          {isRegistering && (
            <PasswordStrengthBar strength={passwordStrength} />
          )}

          {/* Confirm password — registration only */}
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

          <TouchableOpacity style={{ marginTop: 20 }} onPress={handleSwitchMode}>
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

          {/* Google Sign-In */}
          <TouchableOpacity
            style={[styles.googleButton, {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            }]}
            onPress={handleGooglePress}
            activeOpacity={0.75}
          >
            <Text style={[styles.googleIcon, { color: theme.colors.text }]}>G</Text>
            <Text style={[theme.typography.body, styles.googleLabel, { color: theme.colors.text }]}>
              Continue with Google
            </Text>
          </TouchableOpacity>

          {/* Guest access */}
          <PrimaryButton
            label="Continue as Guest"
            onPress={guestSignIn}
            variant="ghost"
            style={{ marginTop: 12 }}
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
  forgotPasswordRow: {
    alignSelf: 'flex-end',
    marginTop: 4,
    marginBottom: 8,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 16,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 12 },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: '700',
    fontStyle: 'italic',
  },
  googleLabel: {
    fontWeight: '600',
  },
  guestNote: {
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 17,
  },
  // Link modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCardWrap: { width: '100%' },
  modalCard: {
    width: '100%',
    borderRadius: 20,
    padding: 28,
  },
  modalTitle: { fontSize: 19, fontWeight: '700', marginBottom: 8 },
  modalInput: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 4,
    fontSize: 15,
  },
});
