import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Switch, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppContext } from '../../src/context/AppContext';
import { useAuth } from '../../src/context/AuthContext';
import { ChevronRight, LogIn, LogOut, User, Settings } from 'lucide-react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GENRES = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary',
  'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Music',
  'Mystery', 'Romance', 'Sci-Fi', 'Thriller', 'War', 'Western'
];

const RUNTIMES = [
  { value: 'short', label: 'Short (< 30 min)', description: 'Quick episodes' },
  { value: 'medium', label: 'Medium (30-60 min)', description: 'Standard episodes' },
  { value: 'long', label: 'Long (> 60 min)', description: 'Extended content' }
];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'hi', name: 'Hindi' }
];

export default function ProfileScreen() {
  const { userProfile, updateUserProfile, logout } = useAppContext();
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [selectedGenres, setSelectedGenres] = useState<string[]>(userProfile.genres);
  const [selectedRuntime, setSelectedRuntime] = useState(userProfile.runtime);
  const [selectedLanguage, setSelectedLanguage] = useState(userProfile.language);
  const [developerMode, setDeveloperMode] = useState(false);
  const [debugTapCount, setDebugTapCount] = useState(0);

  // Load developer mode setting
  useEffect(() => {
    const loadDeveloperMode = async () => {
      try {
        const devMode = await AsyncStorage.getItem('developerMode');
        setDeveloperMode(devMode === 'true');
      } catch (error) {
        console.warn('Failed to load developer mode setting:', error);
      }
    };
    loadDeveloperMode();
  }, []);

  // Handle secret tap sequence to enable developer mode
  const handleSecretTap = async () => {
    const newCount = debugTapCount + 1;
    setDebugTapCount(newCount);
    
    if (newCount >= 7) {
      setDebugTapCount(0);
      const newDevMode = !developerMode;
      setDeveloperMode(newDevMode);
      
      try {
        await AsyncStorage.setItem('developerMode', newDevMode.toString());
        Alert.alert(
          newDevMode ? '🧑‍💻 Developer Mode Enabled' : '👤 Developer Mode Disabled',
          newDevMode 
            ? 'Advanced settings and debug tools are now available.' 
            : 'Advanced settings have been hidden.'
        );
      } catch (error) {
        console.warn('Failed to save developer mode setting:', error);
      }
    }
    
    // Reset count after 3 seconds of no taps
    setTimeout(() => {
      setDebugTapCount(0);
    }, 3000);
  };

  const handleSignOut = async () => {
    try {
      await logout();
      // Auth state change will handle redirect
    } catch (error) {
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  const toggleGenre = (genre: string) => {
    const newGenres = selectedGenres.includes(genre)
      ? selectedGenres.filter(g => g !== genre)
      : [...selectedGenres, genre];
    setSelectedGenres(newGenres);
    updateUserProfile({ genres: newGenres });
  };

  const selectRuntime = (runtime: 'short' | 'medium' | 'long') => {
    setSelectedRuntime(runtime);
    updateUserProfile({ runtime });
  };

  const selectLanguage = (language: string) => {
    setSelectedLanguage(language);
    updateUserProfile({ language });
  };

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]}>
      <Pressable onPress={handleSecretTap}>
        <Text style={styles.title}>Profile Settings</Text>
      </Pressable>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.authInfo}>
          <View style={styles.userInfo}>
            <User size={20} color="#FF0050" />
            <Text style={styles.userEmail}>{user?.email || 'Guest User'}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.authButton,
              pressed && { opacity: 0.7 }
            ]}
            onPress={handleSignOut}
          >
            <LogOut size={16} color="#FF0050" />
            <Text style={styles.authButtonText}>Sign Out</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Favorite Genres</Text>
        <Text style={styles.sectionDescription}>
          Select your preferred genres to improve recommendations
        </Text>
        <View style={styles.genreGrid}>
          {GENRES.map(genre => (
            <Pressable
              key={genre}
              style={[
                styles.genreChip,
                selectedGenres.includes(genre) && styles.genreChipSelected
              ]}
              onPress={() => toggleGenre(genre)}
            >
              <Text style={[
                styles.genreText,
                selectedGenres.includes(genre) && styles.genreTextSelected
              ]}>
                {genre}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferred Runtime</Text>
        <Text style={styles.sectionDescription}>
          Choose your preferred episode length
        </Text>
        {RUNTIMES.map(runtime => (
          <Pressable
            key={runtime.value}
            style={[
              styles.runtimeOption,
              selectedRuntime === runtime.value && styles.runtimeOptionSelected
            ]}
            onPress={() => selectRuntime(runtime.value as 'short' | 'medium' | 'long')}
          >
            <View style={styles.runtimeInfo}>
              <Text style={[
                styles.runtimeLabel,
                selectedRuntime === runtime.value && styles.runtimeLabelSelected
              ]}>
                {runtime.label}
              </Text>
              <Text style={[
                styles.runtimeDescription,
                selectedRuntime === runtime.value && styles.runtimeDescriptionSelected
              ]}>
                {runtime.description}
              </Text>
            </View>
            {selectedRuntime === runtime.value && (
              <View style={styles.checkmark}>
                <Text style={styles.checkmarkText}>✓</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferred Language</Text>
        <Text style={styles.sectionDescription}>
          Select your preferred content language
        </Text>
        {LANGUAGES.map(language => (
          <Pressable
            key={language.code}
            style={[
              styles.languageOption,
              selectedLanguage === language.code && styles.languageOptionSelected
            ]}
            onPress={() => selectLanguage(language.code)}
          >
            <Text style={[
              styles.languageText,
              selectedLanguage === language.code && styles.languageTextSelected
            ]}>
              {language.name}
            </Text>
            {selectedLanguage === language.code && (
              <View style={styles.checkmark}>
                <Text style={styles.checkmarkText}>✓</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      {/* Advanced Settings - Only show in developer mode */}
      {developerMode && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Advanced Settings</Text>
          <Text style={styles.sectionDescription}>
            Developer tools and debugging options
          </Text>
          
          <Pressable
            style={({ pressed }) => [
              styles.advancedOption,
              pressed && { opacity: 0.7 }
            ]}
            onPress={() => router.push('/test')}
          >
            <View style={styles.advancedOptionContent}>
              <Settings size={20} color="#007AFF" />
              <View style={styles.advancedOptionText}>
                <Text style={styles.advancedOptionTitle}>Data Collection Debug</Text>
                <Text style={styles.advancedOptionDescription}>
                  View collected data and test Firebase connection
                </Text>
              </View>
            </View>
            <ChevronRight size={16} color="#007AFF" />
          </Pressable>
          
          <View style={styles.advancedInfo}>
            <Text style={styles.advancedInfoText}>
              💡 Tip: Tap the "Profile Settings" title 7 times to toggle developer mode
            </Text>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Genre Preferences</Text>
        <Text style={styles.sectionDescription}>
          Based on your viewing behavior
        </Text>
        {Object.entries(userProfile.genreWeights)
          .filter(([_, weight]) => weight > 0)
          .sort(([_, a], [__, b]) => b - a)
          .slice(0, 10)
          .map(([genre, weight]) => (
            <View key={genre} style={styles.weightRow}>
              <Text style={styles.weightGenre}>{genre}</Text>
              <View style={styles.weightBar}>
                <View 
                  style={[
                    styles.weightFill, 
                    { width: `${Math.min(100, (weight / 10) * 100)}%` }
                  ]} 
                />
              </View>
              <Text style={styles.weightValue}>{weight}</Text>
            </View>
          ))}
        {Object.keys(userProfile.genreWeights).length === 0 && (
          <Text style={styles.emptyText}>
            Watch some trailers to build your preferences!
          </Text>
        )}
      </View>
      
      <View style={styles.attributionContainer}>
        <Text style={styles.attributionText}>
          This product uses the TMDB API but is not endorsed or certified by TMDB.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: 'white',
    padding: 16,
    paddingBottom: 8,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  sectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: 'white',
    marginBottom: 8,
  },
  sectionDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#AAA',
    marginBottom: 16,
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#444',
  },
  genreChipSelected: {
    backgroundColor: '#FF0050',
    borderColor: '#FF0050',
  },
  genreText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#CCC',
  },
  genreTextSelected: {
    color: 'white',
  },
  runtimeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#111',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  runtimeOptionSelected: {
    borderColor: '#FF0050',
    backgroundColor: '#1a1a1a',
  },
  runtimeInfo: {
    flex: 1,
  },
  runtimeLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: 'white',
    marginBottom: 4,
  },
  runtimeLabelSelected: {
    color: '#FF0050',
  },
  runtimeDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#AAA',
  },
  runtimeDescriptionSelected: {
    color: '#CCC',
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#111',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  languageOptionSelected: {
    borderColor: '#FF0050',
    backgroundColor: '#1a1a1a',
  },
  languageText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: 'white',
  },
  languageTextSelected: {
    color: '#FF0050',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF0050',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  weightGenre: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: 'white',
    width: 80,
  },
  weightBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    marginHorizontal: 12,
  },
  weightFill: {
    height: '100%',
    backgroundColor: '#FF0050',
    borderRadius: 4,
  },
  weightValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 12,
    color: '#FF0050',
    width: 30,
    textAlign: 'right',
  },
  emptyText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#AAA',
    textAlign: 'center',
    paddingVertical: 16,
  },
  attributionContainer: {
    padding: 16,
    alignItems: 'center',
  },
  attributionText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  authInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userEmail: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: 'white',
    marginLeft: 8,
  },
  authButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  authButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: 'white',
    marginLeft: 8,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#AAA',
    marginBottom: 16,
  },

  advancedOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 12,
  },
  advancedOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  advancedOptionText: {
    marginLeft: 12,
    flex: 1,
  },
  advancedOptionTitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: 'white',
    marginBottom: 2,
  },
  advancedOptionDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#AAA',
  },
  advancedInfo: {
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  advancedInfoText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
}); 