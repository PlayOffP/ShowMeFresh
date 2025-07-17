import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function useGenrePrefs() {
  const [genres, setGenres] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGenres();
  }, []);

  const loadGenres = async () => {
    try {
      const savedGenres = await AsyncStorage.getItem('userGenres');
      if (savedGenres) {
        setGenres(JSON.parse(savedGenres));
      }
    } catch (error) {
      console.error('Error loading user genres:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateGenres = async (newGenres: string[]) => {
    try {
      await AsyncStorage.setItem('userGenres', JSON.stringify(newGenres));
      setGenres(newGenres);
    } catch (error) {
      console.error('Error saving user genres:', error);
    }
  };

  return {
    genres,
    loading,
    updateGenres,
  };
} 