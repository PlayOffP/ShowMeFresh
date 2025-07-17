import { createContext, useContext, useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  User as FirebaseUser,
  signOut as firebaseSignOut,
  sendEmailVerification,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../../services/firebase';

type AuthCtx = {
  user: FirebaseUser | null;
  loading: boolean;
  signIn: (email: string, pwd: string) => Promise<void>;
  signUp: (email: string, pwd: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInAnonymously: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  isEmailVerified: boolean;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Debug Firebase connection
  console.log('🔧 AuthProvider initializing - Firebase auth object:', !!auth);

  // Remove emergency timeout since Firebase is working properly

  useEffect(() => {
    console.log('🔄 Setting up Firebase Auth listener...');
    console.log('🔄 Firebase auth object exists:', !!auth);
    console.log('🔄 Firebase auth currentUser:', auth?.currentUser?.email || 'No current user');
    
    let timeoutId: NodeJS.Timeout;
    let unsubscribe: (() => void) | null = null;
    
    try {
      console.log('🔄 Calling onAuthStateChanged...');
      unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        console.log('🔄 Auth state changed:', currentUser?.email || 'No user');
        console.log('🔄 Email verified:', currentUser?.emailVerified);
        
        setUser(currentUser);
        setLoading(false);
        setError(null);
        setIsInitialized(true);
        
        // Clear timeout since auth state loaded successfully
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      });

      console.log('🔄 onAuthStateChanged listener attached successfully');

      // Set a timeout to prevent infinite loading
      timeoutId = setTimeout(() => {
        console.warn('⚠️ Firebase Auth initialization timeout - forcing initialization');
        setLoading(false);
        setIsInitialized(true);
        setUser(auth?.currentUser || null); // Try to get current user directly
        setError('Firebase connection timeout. App will continue in offline mode.');
      }, 10000); // 10 second timeout

      return () => {
        console.log('🔄 Cleaning up Firebase Auth listener');
        if (unsubscribe) unsubscribe();
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    } catch (err: any) {
      console.error('🚨 Firebase Auth initialization error:', err);
      setError(`Firebase Auth Error: ${err.message}`);
      setLoading(false);
      setIsInitialized(true);
    }
  }, []);

  const handleSignOut = async () => {
    try {
      // Clear onboarding status to show welcome screen again
      await AsyncStorage.removeItem('onboarded');
      await AsyncStorage.removeItem('userGenres');
      
      // Sign out from Firebase
      await firebaseSignOut(auth);
      
      // Redirect to welcome screen
      router.replace('/(welcome)');
    } catch (error) {
      console.error('Error during sign out:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Check if email is verified
      if (!userCredential.user.emailVerified) {
        throw new Error('Please verify your email address before signing in. Check your inbox for a verification link.');
      }
      
      // Email is verified, proceed with sign in
      console.log('User signed in successfully:', userCredential.user.email);
    } catch (error: any) {
      console.error('Sign in error:', error);
      let errorMessage = 'Sign in failed. Please try again.';
      
      if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password. Please check your credentials.';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email. Please sign up instead.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message?.includes('verify your email')) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Send verification email
      await sendEmailVerification(userCredential.user);
      
      console.log('Verification email sent to:', email);
      throw new Error('Account created! Please check your email and click the verification link before signing in.');
    } catch (error: any) {
      console.error('Sign up error:', error);
      let errorMessage = 'Sign up failed. Please try again.';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists. Please sign in instead.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please choose a stronger password.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message?.includes('verification link')) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  };

  const signInAnonymouslyUser = async () => {
    console.log('🔄 signInAnonymously called - checking Firebase auth...');
    console.log('🔄 Firebase auth available:', !!auth);
    console.log('🔄 IsInitialized:', isInitialized);
    
    try {
      console.log('🔄 Attempting anonymous sign in...');
      const result = await signInAnonymously(auth);
      console.log('✅ Anonymous sign in successful:', !!result.user);
      // Auth state change will handle the redirect
    } catch (error: any) {
      console.error('🚨 Anonymous sign in error:', error);
      let errorMessage = 'Anonymous sign in failed. Please try again.';
      
      if (error.code === 'auth/admin-restricted-operation') {
        errorMessage = 'Anonymous sign in is currently disabled. Please use email sign in instead.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message === 'Auth not ready') {
        errorMessage = 'Firebase is still initializing. Please wait a moment and try again.';
      }
      
      throw new Error(errorMessage);
    }
  };

  const sendVerificationEmail = async () => {
    if (!user) {
      throw new Error('No user is signed in.');
    }
    
    try {
      await sendEmailVerification(user);
      console.log('Verification email sent to:', user.email);
    } catch (error: any) {
      console.error('Error sending verification email:', error);
      throw new Error('Failed to send verification email. Please try again.');
    }
  };

  const sendPasswordReset = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      console.log('Password reset email sent to:', email);
    } catch (error: any) {
      console.error('Error sending password reset email:', error);
      throw new Error('Failed to send password reset email. Please check your email address.');
    }
  };

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: 'red', fontSize: 16, textAlign: 'center' }}>
          Authentication Error: {error}
        </Text>
      </View>
    );
  }

  // Don't render children until AuthProvider is initialized
  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <Text style={{ color: 'white', fontSize: 16 }}>Initializing...</Text>
        <Text style={{ color: '#888', fontSize: 12, marginTop: 10 }}>
          {loading ? 'Loading Authentication...' : 'Setting up...'}
        </Text>
      </View>
    );
  }

  return (
    <Ctx.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut: handleSignOut,
        signInAnonymously: signInAnonymouslyUser,
        sendVerificationEmail,
        sendPasswordReset,
        isEmailVerified: user?.emailVerified || false,
      }}
    >
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(Ctx);
  if (context === undefined) {
    // Instead of throwing an error immediately, return safe defaults
    console.warn('useAuth called before AuthProvider is ready, returning safe defaults');
    return {
      user: null,
      loading: false, // Changed to false to prevent infinite loading
      signIn: async () => { throw new Error('Auth not ready'); },
      signUp: async () => { throw new Error('Auth not ready'); },
      signOut: async () => { throw new Error('Auth not ready'); },
      signInAnonymously: async () => { throw new Error('Auth not ready'); },
      sendVerificationEmail: async () => { throw new Error('Auth not ready'); },
      sendPasswordReset: async () => { throw new Error('Auth not ready'); },
      isEmailVerified: false,
    };
  }
  return context;
}; 