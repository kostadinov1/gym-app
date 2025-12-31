import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { useTheme } from '../../theme';
import { login, register } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';

export default function LoginScreen() {
  const theme = useTheme();
  const { signIn } = useAuth();
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Login Mutation
  const loginMutation = useMutation({
    mutationFn: () => login(email, password),
    onSuccess: (data) => {
        signIn(data.access_token); // Save token -> App switches to Main Navigator
    },
    onError: (err) => Alert.alert("Login Failed", (err as Error).message)
  });

  // Register Mutation
  const registerMutation = useMutation({
    mutationFn: () => register(email, password),
    onSuccess: () => {
        Alert.alert("Success", "Account created! Please log in.");
        setIsRegistering(false); // Switch back to login view
    },
    onError: (err) => Alert.alert("Registration Failed", (err as Error).message)
  });

  const handleSubmit = () => {
      if (!email || !password) {
          Alert.alert("Error", "Please enter email and password");
          return;
      }
      if (isRegistering) {
          registerMutation.mutate();
      } else {
          loginMutation.mutate();
      }
  };

  const isLoading = loginMutation.isPending || registerMutation.isPending;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', padding: 24 },
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