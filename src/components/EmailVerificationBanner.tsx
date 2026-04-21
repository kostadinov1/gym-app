import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { useTheme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { sendVerificationEmail } from '../api/auth';
import Toast from 'react-native-toast-message';

export function EmailVerificationBanner() {
  const theme = useTheme();
  const { top } = useSafeAreaInsets();
  const { isEmailVerified, isGuest, userToken, refreshUserInfo } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  const mutation = useMutation({
    mutationFn: sendVerificationEmail,
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Verification email sent', position: 'top' });
    },
  });

  if (isEmailVerified || isGuest || !userToken || dismissed) return null;

  return (
    <View style={[
      styles.banner,
      {
        paddingTop: top + 8,
        backgroundColor: theme.colors.primary + '18',
        borderBottomColor: theme.colors.primary + '40',
      },
    ]}>
      <View style={styles.inner}>
        <Text style={[styles.text, { color: theme.colors.text }]}>
          Please verify your email address.{' '}
          <TouchableOpacity
            onPress={() => mutation.mutate()}
            disabled={mutation.isPending}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            {mutation.isPending ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Text style={[styles.link, { color: theme.colors.primary }]}>Resend</Text>
            )}
          </TouchableOpacity>
        </Text>

        <TouchableOpacity
          onPress={() => { setDismissed(true); refreshUserInfo(); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.dismissBtn}
        >
          <Text style={[styles.dismiss, { color: theme.colors.textSecondary }]}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  text: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  link: {
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  dismissBtn: { paddingLeft: 4 },
  dismiss: { fontSize: 14, fontWeight: '600' },
});
