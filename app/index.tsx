import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, Text } from 'react-native';

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Check onboarding status
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const onboardingKey = user ? `onboarded_${user.uid}` : 'onboarded';
        const onboarded = await AsyncStorage.getItem(onboardingKey);
        setIsOnboarded(onboarded === 'true');
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setIsOnboarded(false);
      } finally {
        setIsInitializing(false);
      }
    };

    // Only check onboarding after auth is loaded
    if (!authLoading) {
      checkOnboardingStatus();
    }
  }, [user, authLoading]);

  // Handle navigation based on auth and onboarding state
  useEffect(() => {
    // Navigation logic check
    
    // Wait for everything to be ready
    if (authLoading || isInitializing) {
      // Still loading, waiting
      return;
    }

    if (!user) {
      // User not authenticated - go to welcome
      // No user, redirecting to welcome
      router.replace('/(welcome)');
    } else {
      // User is authenticated
      // User authenticated
      
      if (isOnboarded === null) {
        // Onboarding status still loading
        return;
      }
      
      if (!isOnboarded) {
        // User needs onboarding
        // User not onboarded, redirecting to onboarding
        router.replace('/onboarding');
      } else {
        // User is authenticated and onboarded - go to main app
        // User ready, redirecting to tabs
        router.replace('/(tabs)');
      }
    }
  }, [user, authLoading, isOnboarded, isInitializing]);

  // Show loading screen while everything initializes
  if (authLoading || isInitializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#FF0050" />
        <Text style={{ color: 'white', marginTop: 20, fontSize: 16 }}>
          {authLoading ? 'Loading authentication...' : 'Checking onboarding...'}
        </Text>
      </View>
    );
  }

  // Fallback (should not be reached due to navigation above)
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
      <ActivityIndicator size="large" color="#FF0050" />
      <Text style={{ color: 'white', marginTop: 20 }}>Redirecting...</Text>
    </View>
  );
}