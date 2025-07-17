import { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Alert, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useAppContext } from '../src/context/AppContext';

const ALL_GENRES = ['Action','Adventure','Comedy','Drama','Fantasy','Horror','Sci-Fi','Romance','Thriller','Animation'];

type OnboardingStep = 'genres' | 'username';

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('username');
  const [selected, setSelected] = useState<string[]>([]);
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const router = useRouter();
  const { checkUsernameAvailability, updateUserProfile, user } = useAppContext();

  const toggle = (g: string) =>
    setSelected((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );

  const checkUsername = async (value: string) => {
    if (!value || value.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    setIsCheckingUsername(true);
    try {
      const available = await checkUsernameAvailability(value);
      setUsernameAvailable(available);
    } catch (error) {
      console.error('Error checking username:', error);
      setUsernameAvailable(false);
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleUsernameChange = (value: string) => {
    const cleanUsername = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(cleanUsername);
    
    // Debounce username check
    if (cleanUsername.length >= 3) {
      setTimeout(() => checkUsername(cleanUsername), 500);
    } else {
      setUsernameAvailable(null);
    }
  };

  const nextStep = () => {
    if (currentStep === 'username') {
      if (!username || username.length < 3) {
        Alert.alert('Username Required', 'Please enter a username (at least 3 characters)');
        return;
      }
      if (usernameAvailable === false) {
        Alert.alert('Username Taken', 'This username is already taken. Please choose another one.');
        return;
      }
      setCurrentStep('genres');
    }
  };

  const prevStep = () => {
    if (currentStep === 'genres') {
      setCurrentStep('username');
    }
  };

  const done = async () => {
    if (selected.length === 0) {
      Alert.alert('Please select at least one genre');
      return;
    }

    setIsLoading(true);
    console.log('🔄 Starting onboarding completion...');
    console.log('🔄 Selected genres:', selected);
    console.log('🔄 Username:', username);
    console.log('🔄 User:', !!user);
    
    try {
      console.log('🔄 Step 1: Saving onboarding status...');
      // Save user-specific onboarding completion status
      const onboardingKey = user ? `onboarded_${user.uid}` : 'onboarded';
      await AsyncStorage.setItem(onboardingKey, 'true');
      console.log('✅ Step 1 complete: Onboarding status saved');
      
      console.log('🔄 Step 2: Saving genres to AsyncStorage...');
      // Save selected genres for future use
      await AsyncStorage.setItem('userGenres', JSON.stringify(selected));
      console.log('✅ Step 2 complete: Genres saved to AsyncStorage');
      
      console.log('🔄 Step 3: Updating user profile...');
      // Update user profile with username and genres
      await updateUserProfile({
        username,
        genres: selected,
      });
      console.log('✅ Step 3 complete: User profile updated');
      
      console.log('🔄 Step 4: Navigating to main app...');
      // Navigate to main app
      router.replace('/(tabs)');
      console.log('✅ Step 4 complete: Navigation initiated');
    } catch (error) {
      console.error('🚨 Error saving onboarding data:', error);
      console.error('🚨 Error details:', JSON.stringify(error, null, 2));
      Alert.alert('Error', `Failed to save your preferences: ${error.message}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderUsernameStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.h1}>Choose your username</Text>
      <Text style={styles.subtitle}>This will be used by friends to find and add you</Text>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.usernameInput,
            usernameAvailable === false && styles.usernameInputError,
            usernameAvailable === true && styles.usernameInputSuccess,
          ]}
          placeholder="Enter username"
          placeholderTextColor="rgba(255,255,255,0.5)"
          value={username}
          onChangeText={handleUsernameChange}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
        />
        {isCheckingUsername && (
          <Text style={styles.statusText}>Checking availability...</Text>
        )}
        {usernameAvailable === true && (
          <Text style={styles.statusTextSuccess}>✓ Username available</Text>
        )}
        {usernameAvailable === false && (
          <Text style={styles.statusTextError}>✗ Username taken</Text>
        )}
      </View>
      
      <Text style={styles.usernameRules}>
        • 3-20 characters long{'\n'}
        • Letters, numbers, and underscores only{'\n'}
        • Must be unique
      </Text>
      
      <Pressable
        onPress={nextStep}
        disabled={!username || username.length < 3 || usernameAvailable === false || isCheckingUsername}
        style={[
          styles.btn,
          (!username || username.length < 3 || usernameAvailable === false || isCheckingUsername) && styles.btnDisabled,
        ]}
      >
        <Text style={styles.btnText}>Continue</Text>
      </Pressable>
    </View>
  );

  const renderGenresStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.h1}>Pick genres you love</Text>
      <Text style={styles.subtitle}>Select your favorite genres to get personalized recommendations</Text>
      
      <View style={styles.grid}>
        {ALL_GENRES.map((g) => (
          <Pressable
            key={g}
            onPress={() => toggle(g)}
            style={[
              styles.chip,
              selected.includes(g) && styles.chipActive,
            ]}
          >
            <Text style={[
              styles.chipText,
              selected.includes(g) && styles.chipTextActive
            ]}>{g}</Text>
          </Pressable>
        ))}
      </View>
      
      <View style={styles.buttonRow}>
        <Pressable
          onPress={prevStep}
          style={[styles.btn, styles.btnSecondary]}
        >
          <Text style={styles.btnTextSecondary}>Back</Text>
        </Pressable>
        
        <Pressable
          onPress={done}
          disabled={!selected.length || isLoading}
          style={[
            styles.btn,
            (!selected.length || isLoading) && styles.btnDisabled,
          ]}
        >
          <Text style={styles.btnText}>
            {isLoading ? 'Saving...' : 'Get Started'}
          </Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      {currentStep === 'username' ? renderUsernameStep() : renderGenresStep()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#000',
    paddingTop: 60,
  },
  h1: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    color: '#888',
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 32,
  },
  chip: {
    borderColor: '#555',
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    backgroundColor: 'transparent',
  },
  chipActive: {
    backgroundColor: '#FF0050',
    borderColor: '#FF0050',
  },
  chipText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  btn: {
    backgroundColor: '#FF0050',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  stepContainer: {
    flex: 1,
    alignItems: 'center',
    padding: 24,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 24,
  },
  usernameInput: {
    backgroundColor: '#333',
    padding: 16,
    borderRadius: 8,
    color: '#fff',
    width: '100%',
  },
  usernameInputError: {
    borderColor: '#FF0050',
    borderWidth: 2,
  },
  usernameInputSuccess: {
    borderColor: '#00FF00',
    borderWidth: 2,
  },
  statusText: {
    color: '#fff',
    marginTop: 8,
  },
  statusTextSuccess: {
    color: '#00FF00',
    marginTop: 8,
  },
  statusTextError: {
    color: '#FF0050',
    marginTop: 8,
  },
  usernameRules: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  btnSecondary: {
    backgroundColor: 'transparent',
    borderColor: '#555',
    borderWidth: 1,
  },
  btnTextSecondary: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 