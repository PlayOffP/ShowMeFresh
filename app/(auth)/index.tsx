import { useState } from 'react';
import { View, TextInput, Pressable, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AuthScreen() {
  const { signIn, signUp, sendPasswordReset, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [isLoading, setIsLoading] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    setIsLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
        
        // Add a small delay to ensure auth state is updated
        setTimeout(async () => {
          try {
            // Get the latest user from Firebase auth directly to get the uid
            const currentUser = (await import('../../services/firebase')).auth.currentUser;
            
            if (currentUser) {
              // Check onboarding status and redirect appropriately
              const onboardingKey = `onboarded_${currentUser.uid}`;
              const onboarded = await AsyncStorage.getItem(onboardingKey);
              
              if (onboarded === 'true') {
                // User is onboarded, go to main app
                // User signed in and onboarded, redirecting to tabs
                router.replace('/(tabs)');
              } else {
                // User needs onboarding
                // User signed in but not onboarded, redirecting to onboarding
                router.replace('/onboarding');
              }
            } else {
              // Fallback - force redirect to root which will handle navigation
              // User state not ready, redirecting to root
              router.replace('/');
            }
          } catch (navError) {
            console.error('Navigation error after sign in:', navError);
            // Fallback - force redirect to root
            router.replace('/');
          }
        }, 500); // 500ms delay to ensure auth state is updated
        
      } else {
        await signUp(email.trim(), password);
        // For sign up, user will need to verify email first
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      Alert.alert('Error', error.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address first');
      return;
    }
    setIsLoading(true);
    try {
      await sendPasswordReset(email.trim());
      Alert.alert(
        'Password Reset Sent',
        'Check your email for a password reset link. You can then sign in with your new password.'
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send password reset email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <ArrowLeft size={24} color="#fff" />
      </Pressable>
      <View style={styles.content}>
        <Text style={styles.title}>
          {mode === 'login' ? 'Welcome Back' : 'Create Account'}
        </Text>
        <Text style={styles.subtitle}>
          {mode === 'login'
            ? 'Sign in to continue to ShowMe'
            : 'Join ShowMe to discover great shows'}
        </Text>
        <TextInput
          placeholder="Email"
          placeholderTextColor="rgba(255,255,255,0.5)"
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          editable={!isLoading}
        />
        <TextInput
          placeholder="Password"
          placeholderTextColor="rgba(255,255,255,0.5)"
          secureTextEntry
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          editable={!isLoading}
        />
        {/* Forgot Password Link (only show on login mode) */}
        {mode === 'login' && (
          <Pressable
            style={styles.forgotPasswordButton}
            onPress={handleForgotPassword}
            disabled={isLoading}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </Pressable>
        )}
        <Pressable
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={submit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </Text>
          )}
        </Pressable>
        <Pressable
          style={styles.switchModeButton}
          onPress={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            setEmail('');
            setPassword('');
          }}
          disabled={isLoading}
        >
          <Text style={styles.switchModeText}>
            {mode === 'login'
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 1,
    padding: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    paddingTop: 100,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 40,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    marginBottom: 20,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#FF0050',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  submitButton: {
    backgroundColor: '#FF0050',
    borderRadius: 8,
    paddingVertical: 16,
    marginTop: 20,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  switchModeButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchModeText: {
    color: '#FF0050',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
}); 