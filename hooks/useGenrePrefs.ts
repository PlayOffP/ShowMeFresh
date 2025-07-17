import { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppContext } from '@/context/AppContext';
import { getShowById } from '../utils/showCache';

export function useGenrePrefs(): string[] {
  const { savedShows, reviews, userProfile } = useAppContext();

  // one-time onboarding genres
  const [userGenres, setUserGenres] = useState<string[]>([]);
  useEffect(() => {
    AsyncStorage.getItem('userGenres').then((raw) => {
      if (raw) setUserGenres(JSON.parse(raw));
    });
  }, []);

  return useMemo(() => {
    const scores: Record<string, number> = {};

    // boost onboarding genres
    userGenres.forEach((g) => (scores[g] = (scores[g] ?? 0) + 5));

    // user profile genres
    userProfile.genres.forEach((g) => (scores[g] = (scores[g] ?? 0) + 3));

    // implicit feedback weights (most important)
    Object.entries(userProfile.genreWeights).forEach(([genre, weight]) => {
      scores[genre] = (scores[genre] ?? 0) + weight;
    });

    // saved list
    savedShows.forEach((id) => {
      getShowById(id)?.genres.forEach(
        (g) => (scores[g] = (scores[g] ?? 0) + 2)
      );
    });

    // reviews
    reviews.forEach((r) => {
      const delta = r.rating - 2;
      getShowById(r.showId)?.genres.forEach(
        (g) => (scores[g] = (scores[g] ?? 0) + delta)
      );
    });

    const sortedGenres = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .map(([g]) => g);

    // Fallback to popular genres if no preferences are calculated
    if (sortedGenres.length === 0) {
      return ['Drama', 'Comedy', 'Action', 'Thriller', 'Sci-Fi'];
    }

    // Add some diversity by including secondary genres
    const topGenres = sortedGenres.slice(0, 3);
    const secondaryGenres = sortedGenres.slice(3, 8);
    
    // Randomly select some secondary genres to add diversity
    const shuffledSecondary = [...secondaryGenres].sort(() => Math.random() - 0.5);
    const selectedSecondary = shuffledSecondary.slice(0, 2);
    
    const finalGenres = [...topGenres, ...selectedSecondary];
    
    console.log('Genre preferences:', {
      topGenres,
      secondaryGenres,
      selectedSecondary,
      finalGenres
    });

    return finalGenres;
  }, [savedShows, reviews, userGenres, userProfile]);
}

// New hook for calculating preference scores for shows
export function useShowPreferenceScore(showId: string): number {
  const { userProfile } = useAppContext();
  
  return useMemo(() => {
    const show = getShowById(showId);
    if (!show) return 0;
    
    let score = 0;
    
    // Add genre weights
    show.genres.forEach(genre => {
      score += userProfile.genreWeights[genre] || 0;
    });
    
    // Runtime preference (if show has duration info)
    if (show.duration) {
      const duration = parseInt(show.duration.replace(/\D/g, ''));
      if (duration < 30 && userProfile.runtime === 'short') score += 2;
      else if (duration >= 30 && duration <= 60 && userProfile.runtime === 'medium') score += 2;
      else if (duration > 60 && userProfile.runtime === 'long') score += 2;
    }
    
    return score;
  }, [showId, userProfile.genreWeights, userProfile.runtime]);
}
