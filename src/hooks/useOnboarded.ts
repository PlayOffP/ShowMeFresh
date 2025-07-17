import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppContext } from '@/context/AppContext';

export type OnboardingStatus = 'loading' | 'onboarded' | 'not_onboarded';

export default function useOnboarded() {
  const [status, setStatus] = useState<OnboardingStatus>('loading');
  const { user, userProfile } = useAppContext();

  useEffect(() => {
    let mounted = true;
    
    const checkOnboardingStatus = async () => {
      try {
        console.log('Checking onboarding status for user:', user?.uid || 'no user');
        
        if (!user) {
          // No user - check global onboarding status (for anonymous users)
          const flag = await AsyncStorage.getItem('onboarded');
          console.log('Global onboarding flag =', flag);
          
          if (mounted) {
            setStatus(flag === 'true' ? 'onboarded' : 'not_onboarded');
          }
        } else {
          // Authenticated user - check user-specific onboarding status
          const userOnboardingKey = `onboarded_${user.uid}`;
          const flag = await AsyncStorage.getItem(userOnboardingKey);
          console.log('User-specific onboarding flag =', flag);
          
          // Also check if user has a username (required for onboarding completion)
          const hasUsername = userProfile?.username && userProfile.username.length >= 3;
          console.log('User has username =', hasUsername, 'Username =', userProfile?.username);
          
          if (mounted) {
            // User is only considered onboarded if they have both the flag AND a username
            const isOnboarded = flag === 'true' && hasUsername;
            setStatus(isOnboarded ? 'onboarded' : 'not_onboarded');
          }
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        if (mounted) {
          setStatus('not_onboarded');
        }
      }
    };

    checkOnboardingStatus();
    
    return () => { 
      mounted = false; 
    };
  }, [user, userProfile]);

  return status;
} 