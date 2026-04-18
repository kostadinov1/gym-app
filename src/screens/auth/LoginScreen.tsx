import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  Alert, ActivityIndicator 
} from 'react-native';
// Removed: SafeAreaView, KeyboardAvoidingView, ScrollView imports
import { useMutation } from '@tanstack/react-query';
import { useTheme } from '../../theme';
import { login, register } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import { Container } from '../../components/common/Container'; // <--- Import Wrapper
import Toast from 'react-native-toast-message';

export default function LoginScreen() {
  const theme = useTheme();
  const { signIn, guestSignIn } = useAuth();
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // ... (Mutations and handleSubmit logic remain EXACTLY the same) ...

  const loginMutation = useMutation({
    mutationFn: () => login(email, password),
    onSuccess: (data) => signIn(data.access_token, email),
    // REMOVED onError - App.tsx handles it now!
  });

  const registerMutation = useMutation({
    mutationFn: () => register(email, password),
    onSuccess: () => {
        Toast.show({
            type: 'success',
            text1: 'Welcome! 🎉',
            text2: 'Account created. Please log in.',
            position: 'bottom'
        });
        setIsRegistering(false);
    },
    // REMOVED onError - App.tsx handles it now!
  });
  
  // Update handleSubmit to show Toast validation error
  const handleSubmit = () => {
      if (!email || !password) {
          Toast.show({
              type: 'error',
              text1: 'Missing Fields',
              text2: 'Please enter both email and password',
              position: 'bottom'
          });
          return;
      }
      if (isRegistering) registerMutation.mutate();
      else loginMutation.mutate();
  };
  const isLoading = loginMutation.isPending || registerMutation.isPending;

  return (
    <Container 
      isScrollable={true} 
      style={styles.containerStyle} // <--- Pass alignment styles here
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
            {isRegistering ? "Create Account" : "Welcome Back"}
        </Text>
        <Text style={{ color: theme.colors.textSecondary, marginBottom: 32 }}>
            {isRegistering ? "Sign up to track your progress" : "Sign in to continue"}
        </Text>

        <TextInput
            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
            placeholder="Email"
            placeholderTextColor={theme.colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
        />

        <TextInput
            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
            placeholder="Password"
            placeholderTextColor={theme.colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
        />

        <TouchableOpacity 
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
            onPress={handleSubmit}
            disabled={isLoading}
        >
            {isLoading ? (
                <ActivityIndicator color="white" />
            ) : (
                <Text style={styles.buttonText}>{isRegistering ? "Sign Up" : "Log In"}</Text>
            )}
        </TouchableOpacity>

        <TouchableOpacity
            style={{ marginTop: 20 }}
            onPress={() => setIsRegistering(!isRegistering)}
        >
            <Text style={{ color: theme.colors.primary, textAlign: 'center' }}>
                {isRegistering ? "Already have an account? Log In" : "Don't have an account? Sign Up"}
            </Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
          <Text style={[styles.dividerText, { color: theme.colors.textSecondary }]}>or</Text>
          <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
        </View>

        {/* Guest access */}
        <TouchableOpacity
          style={[styles.guestButton, { borderColor: theme.colors.border }]}
          onPress={guestSignIn}
        >
          <Text style={[styles.guestButtonText, { color: theme.colors.textSecondary }]}>
            Continue as Guest
          </Text>
        </TouchableOpacity>
        <Text style={[styles.guestNote, { color: theme.colors.textSecondary }]}>
          Your data will be saved on this device. Register later to sync to the cloud.
        </Text>
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  // Renamed from scrollContent to be clearer
  containerStyle: {
    flexGrow: 1,
    justifyContent: 'center', // This centers the form vertically
  },
  content: {
    padding: 24,
  },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 8 },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 16,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 12, fontSize: 13 },
  guestButton: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestButtonText: { fontWeight: '600', fontSize: 16 },
  guestNote: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 17,
  },
});