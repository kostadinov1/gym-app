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
  const { signIn } = useAuth();
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // ... (Mutations and handleSubmit logic remain EXACTLY the same) ...

  const loginMutation = useMutation({
    mutationFn: () => login(email, password),
    onSuccess: (data) => signIn(data.access_token),
    onError: (err) => {
        // --- REPLACED ALERT WITH TOAST ---
        Toast.show({
            type: 'error',
            text1: 'Login Failed',
            text2: (err as Error).message, // e.g. "Incorrect email or password"
            position: 'bottom' // Optional: Toasts at bottom look nice on forms
        });
    }
  });

  const registerMutation = useMutation({
    mutationFn: () => register(email, password),
    onSuccess: () => {
        // --- REPLACED ALERT WITH TOAST ---
        Toast.show({
            type: 'success',
            text1: 'Welcome! 🎉',
            text2: 'Account created. Please log in.',
            position: 'bottom'
        });
        setIsRegistering(false);
    },
    onError: (err) => {
        // --- REPLACED ALERT WITH TOAST ---
        Toast.show({
            type: 'error',
            text1: 'Registration Failed',
            text2: (err as Error).message,
            position: 'bottom'
        });
    }
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
});