import type { Show } from '../hooks/useShows';
import AsyncStorage from '@react-native-async-storage/async-storage';

const map = new Map<string, Show>();

export const writeShows = (shows: Show[]) => {
  shows.forEach((s) => map.set(s.id, s));
};

export const getShowById = (id: string) => map.get(id);

// Utility function to reset onboarding status (for testing)
export const resetOnboarding = async () => {
  try {
    await AsyncStorage.removeItem('onboarded');
    await AsyncStorage.removeItem('userGenres');
    console.log('Onboarding status reset successfully');
  } catch (error) {
    console.error('Error resetting onboarding status:', error);
  }
}; 