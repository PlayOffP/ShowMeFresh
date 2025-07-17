import { View, Text, Pressable, StyleSheet, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { useState } from 'react';

export default function WelcomeScreen() {
  const router = useRouter();
  const { signInAnonymously } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleGetStarted = () => {
    router.push('/onboarding');
  };

  const handleEmailSignIn = () => {
    router.push('/(auth)');
  };

  const handleAnonymousSignIn = async () => {
    setIsLoading(true);
    try {
      await signInAnonymously();
      // Auth state change will handle redirect to main app
    } catch (error: any) {
      console.error('Anonymous sign in error:', error);
      
      // If anonymous auth is disabled, suggest email sign in instead
      if (error.message?.includes('Anonymous sign in is currently disabled')) {
        Alert.alert(
          'Anonymous Sign In Disabled',
          'Anonymous sign in is currently not available. Please use email sign in instead.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign in with Email', onPress: handleEmailSignIn }
          ]
        );
      } else {
        Alert.alert('Error', error.message || 'Failed to sign in anonymously');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Logo */}
      <Image source={require('../../assets/images/icon.png')} style={styles.logo} />
      {/* Tagline */}
      <Text style={styles.tagline}>Discover, share, and rate the best shows.</Text>
      
      {/* Email Sign In Button */}
      <Pressable 
        style={styles.secondaryBtn} 
        onPress={handleEmailSignIn}
        disabled={isLoading}
      >
        <Text style={styles.secondaryBtnText}>Sign in with Email</Text>
      </Pressable>
      
      {/* Anonymous Sign In Button */}
      <Pressable 
        style={styles.skipBtn} 
        onPress={handleAnonymousSignIn}
        disabled={isLoading}
      >
        <Text style={styles.skipBtnText}>
          {isLoading ? 'Signing in...' : 'Continue as Guest'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 32,
    borderRadius: 20,
  },
  tagline: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 40,
    textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: '#FF0050',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryBtn: {
    backgroundColor: '#222',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  skipBtn: {
    marginTop: 16,
    alignItems: 'center',
  },
  skipBtnText: {
    color: '#888',
    fontSize: 15,
    textDecorationLine: 'underline',
  },
}); 