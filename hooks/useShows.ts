import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { fetchTrending, fetchVideos, fetchDiscover } from '../services/tmdb';
import { useGenrePrefs } from './useGenrePrefs';
import { uniqBy, shuffle } from 'lodash-es';
import { writeShows, getShowById } from '../utils/showCache';
import { useMemo } from 'react';
import { useAppContext } from '../src/context/AppContext';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useCallback, useEffect } from 'react';

// Persistent cache for trailer URLs
const TRAILER_CACHE_KEY = 'trailer_cache_v1';
const trailerCache = new Map<string, string>();
let cacheLoaded = false;

// Load trailer cache from AsyncStorage
async function loadTrailerCache() {
  if (cacheLoaded) return;
  try {
    const cached = await AsyncStorage.getItem(TRAILER_CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      Object.entries(data).forEach(([key, value]) => {
        trailerCache.set(key, value as string);
      });
      console.log(`Loaded ${trailerCache.size} cached trailers from storage`);
    }
    cacheLoaded = true;
  } catch (error) {
    console.warn('Failed to load trailer cache:', error);
    cacheLoaded = true;
  }
}

// Save trailer cache to AsyncStorage
async function saveTrailerCache() {
  try {
    const data = Object.fromEntries(trailerCache);
    await AsyncStorage.setItem(TRAILER_CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save trailer cache:', error);
  }
}

// Initialize cache loading
loadTrailerCache();

const genreMap: Record<number, string> = {
  // Movie genres
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  
  // TV genres (unique to TV)
  10759: 'Action & Adventure',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
};

// Create reverse mapping from genre names to IDs
const genreNameToId: Record<string, number[]> = {};
Object.entries(genreMap).forEach(([id, name]) => {
  if (!genreNameToId[name]) {
    genreNameToId[name] = [];
  }
  genreNameToId[name].push(Number(id));
});

// Helper function to get genre IDs from names
function getGenreIds(genreNames: string[]): number[] {
  const ids: number[] = [];
  genreNames.forEach(name => {
    const genreIds = genreNameToId[name];
    if (genreIds) {
      ids.push(...genreIds);
    }
  });
  return ids;
}

export interface Show {
  id: string;
  title: string;
  trailerUrl: string;
  posterUrl: string;
  synopsis: string;
  genres: string[];
  year: number;
  rating: string;
  duration: string;
  /** added for scoring */
  popularity?: number;
}

/* ───────── helper ───────── */

function getBestTrailerUrl(videos: any[]): string {
  if (!videos || videos.length === 0) return '';

  // Try to find any official trailer first
  const officialTrailer = videos.find(
    (v: any) => v.type?.toLowerCase().includes('trailer') && v.official
  );
  
  if (officialTrailer) {
    if (officialTrailer.site === 'YouTube' && officialTrailer.key) {
      return `https://www.youtube.com/watch?v=${officialTrailer.key}`;
    }
    if (officialTrailer.url) {
      return officialTrailer.url;
    }
  }

  // Try to find any YouTube trailer or teaser
  const youtubeVideo = videos.find(
    (v: any) => v.site === 'YouTube' && v.key && 
    (v.type?.toLowerCase().includes('trailer') || v.type?.toLowerCase().includes('teaser') || v.type?.toLowerCase().includes('promo'))
  );
  
  if (youtubeVideo) {
    return `https://www.youtube.com/watch?v=${youtubeVideo.key}`;
  }

  // Try any video with a URL
  const anyVideo = videos.find((v: any) => v.url || (v.site === 'YouTube' && v.key));
  if (anyVideo) {
    if (anyVideo.site === 'YouTube' && anyVideo.key) {
      return `https://www.youtube.com/watch?v=${anyVideo.key}`;
    }
    if (anyVideo.url) {
      return anyVideo.url;
    }
  }

  return '';
}

/* ───────── Trending Playlist System ───────── */
// Generate a time-based seed that changes every 2 hours for rotation
function getTrendingPlaylistSeed(): number {
  const now = new Date();
  const hoursMultiplier = Math.floor(now.getTime() / (1000 * 60 * 60 * 2)); // Changes every 2 hours
  return hoursMultiplier;
}

// Seeded shuffle function for consistent but rotating results
function seedShuffle<T>(array: T[], seed: number): T[] {
  const shuffled = [...array];
  let m = shuffled.length, t, i;
  
  // Simple seeded random number generator
  let random = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };
  
  while (m) {
    i = Math.floor(random() * m--);
    t = shuffled[m];
    shuffled[m] = shuffled[i];
    shuffled[i] = t;
  }
  
  return shuffled;
}

export function useTrendingShows(): UseQueryResult<Show[], Error> {
  // Update query key to include time-based seed for rotation
  const playlistSeed = getTrendingPlaylistSeed();
  
  return useQuery<Show[], Error>({
    queryKey: ['trending-playlist', playlistSeed],
    queryFn: async () => {
      console.log('[Trending Playlist] Starting fetch with seed:', playlistSeed);
      
      // Fetch from multiple trending sources for variety
      const [
        dailyTrending,
        weeklyTrending,
        popularTV,
        popularMovies
      ] = await Promise.allSettled([
        fetchTrending('tv', 'day'),
        fetchTrending('tv', 'week'),
        fetchDiscover({ sort_by: 'popularity.desc', page: '1' }, 'tv'),
        fetchDiscover({ sort_by: 'popularity.desc', page: '1' }, 'movie')
      ]);
      
      // Safely extract results from each source
      const safeExtract = (result: PromiseSettledResult<any>, label: string) => {
        if (result.status === 'fulfilled' && result.value?.results) {
          console.log(`[Trending Playlist] ${label}: ${result.value.results.length} shows`);
          return result.value.results;
        }
        console.warn(`[Trending Playlist] ${label}: failed or no results`);
        return [];
      };
      
      // Combine all sources - more content to choose from
      const allCandidates = [
        ...safeExtract(dailyTrending, 'Daily trending'),
        ...safeExtract(weeklyTrending, 'Weekly trending'), 
        ...safeExtract(popularTV, 'Popular TV'),
        ...safeExtract(popularMovies, 'Popular Movies')
      ];
      
      console.log(`[Trending Playlist] Total candidates: ${allCandidates.length}`);
      
      // Remove duplicates by ID and map to our Show format
      const uniqueShows = uniqBy(allCandidates, (item: any) => item.id)
        .map((item: any) => mapTMDBtoShow(item))
        .filter(show => show.title && show.synopsis); // Filter out incomplete data
      
      console.log(`[Trending Playlist] Unique shows after filtering: ${uniqueShows.length}`);
      
      // Apply seeded shuffle for consistent but rotating order
      const shuffledShows = seedShuffle(uniqueShows, playlistSeed);
      
      // Take more shows for a bigger playlist (40 instead of 20)
      const playlistShows = shuffledShows.slice(0, 40);
      
      console.log(`[Trending Playlist] Final playlist: ${playlistShows.length} shows`);
      console.log(`[Trending Playlist] Top 5 shows:`, playlistShows.slice(0, 5).map(s => s.title));
      
      // Load trailers for all shows to filter out those without trailers
      const trailerPromises = playlistShows.map(async (show, index) => {
        await loadTrailerCache(); // Ensure cache is loaded
        const cacheKey = `${show.id}`;
        
        // Check cache first
        if (trailerCache.has(cacheKey)) {
          const cachedUrl = trailerCache.get(cacheKey) || '';
          return { index, trailerUrl: cachedUrl, show };
        }
        
        try {
          const mediaType = show.id.startsWith('movie') ? 'movie' : 'tv';
          const mediaId = Number(show.id.split('-')[1]);
          const videos = await fetchVideos(mediaType, mediaId);
          const trailerUrl = getBestTrailerUrl(videos.results || []);
          
          // Cache the result
          trailerCache.set(cacheKey, trailerUrl);
          
          return { index, trailerUrl, show };
        } catch (error) {
          console.warn(`[Trending Playlist] Failed to fetch trailer for ${show.title}:`, error);
          trailerCache.set(cacheKey, ''); // Cache empty result
          return { index, trailerUrl: '', show };
        }
      });
      
      // Wait for all trailer fetches to complete
      try {
        const trailerResults = await Promise.allSettled(trailerPromises);
        
        // Filter out shows without trailers and apply trailer URLs
        const showsWithTrailers: Show[] = [];
        trailerResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            const { trailerUrl, show } = result.value;
            if (trailerUrl && trailerUrl.trim() !== '') {
              show.trailerUrl = trailerUrl;
              showsWithTrailers.push(show);
            } else {
              console.log(`[Trending Playlist] Filtering out ${show.title} - no trailer available`);
            }
          }
        });
        
        console.log(`[Trending Playlist] Loaded trailers for ${trailerResults.filter(r => r.status === 'fulfilled').length}/${playlistShows.length} shows`);
        console.log(`[Trending Playlist] Filtered to ${showsWithTrailers.length} shows with trailers`);
        
        // Save cache asynchronously
        saveTrailerCache().catch(console.warn);
        
        writeShows(showsWithTrailers);
        
        console.log(`[Trending Playlist] Returning ${showsWithTrailers.length} shows with trailers`);
        return showsWithTrailers;
        
      } catch (error) {
        console.warn('[Trending Playlist] Trailer loading failed:', error);
        // Return original shows if trailer loading fails
        writeShows(playlistShows);
        return playlistShows;
      }
    },
    staleTime: 1_000 * 60 * 30, // Cache for 30 minutes (longer since we have rotation)
  });
}

/* ───────── For-You builder ───────── */
async function buildForYouList(prefs: string[], userProfile: any, userInteractions: any[] = [], recentlyRecommended: string[] = []): Promise<Show[]> {
  // Fallback to popular genres if no preferences are set
  const fallbackGenres = ['Drama', 'Comedy', 'Action'];
  const genresToUse = prefs.length > 0 ? prefs : fallbackGenres;
  
  // Filter out Animation genre if user hasn't explicitly selected it
  const userSelectedGenres = userProfile.genres || [];
  const hasAnimationPreference = userSelectedGenres.includes('Animation') || 
                                Object.keys(userProfile.genreWeights).includes('Animation');
  
  // If user hasn't selected Animation, exclude it from recommendations
  const filteredGenres = hasAnimationPreference ? genresToUse : genresToUse.filter(g => g !== 'Animation');
  
  // Convert genre names to IDs - use fewer genres for faster initial load
  const genreIds = getGenreIds(filteredGenres.slice(0, 3)); // Reduced back to 3 for speed
  const top = genreIds.join(',');
  
  // Optimized: Fetch fewer pages initially for faster load (2 pages instead of 6)
  console.log('[ForYou] Fetching content for genres:', filteredGenres, 'Genre IDs:', genreIds, 'Query:', top);
  
  const [tvPage1, moviePage1] = await Promise.all([
    fetchDiscover({ with_genres: top, sort_by: 'popularity.desc', page: '1' }, 'tv').catch(e => {
      console.error('[ForYou] Failed to fetch TV page 1:', e.message);
      return { results: [] };
    }),
    fetchDiscover({ with_genres: top, sort_by: 'popularity.desc', page: '1' }, 'movie').catch(e => {
      console.error('[ForYou] Failed to fetch Movie page 1:', e.message);
      return { results: [] };
    }),
  ]);

  // Defensive checks and logging for TMDB API responses
  function safeResults(resp: any, label: string) {
    if (!resp || !Array.isArray(resp.results)) {
      console.warn(`TMDB response for ${label} is missing or invalid.`, resp);
      return [];
    }
    return resp.results;
  }

  const candidates = [
    ...safeResults(tvPage1, 'tvPage1'),
    ...safeResults(moviePage1, 'moviePage1'),
  ];

  console.log('[ForYou] Candidates fetched from TMDB:', candidates.length);

  // Simple scoring based on popularity and genre match
  type Scored = { show: Show; score: number; reasons: string[] };
  const scored: Scored[] = candidates.map((itm: any) => {
    const baseGenres = (itm.genre_ids ?? []).map((id: number) => genreMap[id] || 'Unknown');
    const show = mapTMDBtoShow(itm);
    let score = 0;
    const reasons: string[] = [];
    
    // Base popularity score
    score += Math.min(itm.popularity || 0, 100) / 10;
    reasons.push('popularity');
    
    // Genre match bonus
    const genreMatches = baseGenres.filter(g => filteredGenres.includes(g));
    score += genreMatches.length * 10;
    if (genreMatches.length > 0) {
      reasons.push(`genre-match(${genreMatches.length})`);
    }
    
    // User profile genre weights
    const genreWeights = userProfile.genreWeights || {};
    baseGenres.forEach(genre => {
      const weight = genreWeights[genre] || 0;
      score += weight * 2;
      if (weight > 0) {
        reasons.push(`weighted-${genre}(${weight})`);
      }
    });
    
    // Avoid recently recommended shows
    if (recentlyRecommended.includes(show.id)) {
      score -= 50;
      reasons.push('recently-recommended');
    }
    
    return { show, score: Math.max(0, score), reasons };
  });

  console.log('[ForYou] Scored shows:', scored.length);

  // Only keep the top N scored shows
  const rankedBase = uniqBy(scored, (o) => o.show.title.toLowerCase())
    .sort((a, b) => b.score - a.score)
    .slice(0, 25); // Reduced from 40 to 25 for faster processing

  console.log('[ForYou] Top ranked shows:', rankedBase.slice(0, 5).map(s => `${s.show.title} (${s.score})`));

  // Map to shows and load trailers to filter out shows without them
  const candidateShows = rankedBase.map(s => s.show).slice(0, 25); // Get more candidates to account for filtering
  
  // Load trailers for all candidate shows
  const trailerPromises = candidateShows.map(async (show) => {
    await loadTrailerCache(); // Ensure cache is loaded
    const cacheKey = `${show.id}`;
    
    // Check cache first
    if (trailerCache.has(cacheKey)) {
      const cachedUrl = trailerCache.get(cacheKey) || '';
      return { show, trailerUrl: cachedUrl };
    }
    
    try {
      const mediaType = show.id.startsWith('movie') ? 'movie' : 'tv';
      const mediaId = Number(show.id.split('-')[1]);
      const videos = await fetchVideos(mediaType, mediaId);
      const trailerUrl = getBestTrailerUrl(videos.results || []);
      
      // Cache the result
      trailerCache.set(cacheKey, trailerUrl);
      
      return { show, trailerUrl };
    } catch (error) {
      console.warn(`[ForYou] Failed to fetch trailer for ${show.title}:`, error);
      trailerCache.set(cacheKey, ''); // Cache empty result
      return { show, trailerUrl: '' };
    }
  });
  
  // Wait for all trailer fetches to complete
  try {
    const trailerResults = await Promise.allSettled(trailerPromises);
    
    // Filter out shows without trailers and apply trailer URLs
    const showsWithTrailers: Show[] = [];
    trailerResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        const { trailerUrl, show } = result.value;
        if (trailerUrl && trailerUrl.trim() !== '') {
          show.trailerUrl = trailerUrl;
          showsWithTrailers.push(show);
        } else {
          console.log(`[ForYou] Filtering out ${show.title} - no trailer available`);
        }
      }
    });
    
    console.log(`[ForYou] Loaded trailers for ${trailerResults.filter(r => r.status === 'fulfilled').length}/${candidateShows.length} shows`);
    console.log(`[ForYou] Filtered to ${showsWithTrailers.length} shows with trailers`);
    
    // Save cache asynchronously
    saveTrailerCache().catch(console.warn);
    
    // Take up to 15 shows with trailers
    const finalShows = showsWithTrailers.slice(0, 15);
    
    // Cache the shows so they can be found by Must-Watch tab
    writeShows(finalShows);
    console.log('[ForYou] Cached', finalShows.length, 'shows with trailers for Must-Watch access');
    
    return finalShows;
    
  } catch (error) {
    console.warn('[ForYou] Trailer loading failed:', error);
    // Return original shows if trailer loading fails
    const fallbackShows = candidateShows.slice(0, 15);
    writeShows(fallbackShows);
    return fallbackShows;
  }
}

// Fetch user interactions from Firestore
async function fetchUserInteractions(userId: string): Promise<any[]> {
  try {
    const interactionsRef = collection(db, 'users', userId, 'interactions');
    const q = query(
      interactionsRef,
      orderBy('timestamp', 'desc'),
      limit(100) // Get last 100 interactions
    );
    
    const snapshot = await getDocs(q);
    const interactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`Fetched ${interactions.length} user interactions`);
    return interactions;
  } catch (error: any) {
    console.warn('Failed to fetch user interactions:', error);
    // Handle offline error gracefully
    if (error.message?.includes('offline') || error.message?.includes('Failed to get document')) {
      console.log('Device appears to be offline, using profile data only');
    }
    return [];
  }
}

// Get recently recommended shows to avoid repetition
async function getRecentlyRecommendedShows(userId?: string): Promise<string[]> {
  if (!userId) return [];
  
  try {
    const recentlyRecommended = await AsyncStorage.getItem(`recentlyRecommended_${userId}`);
    if (recentlyRecommended) {
      const shows = JSON.parse(recentlyRecommended);
      // Only return shows from the last 24 hours
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      return shows.filter((show: any) => show.timestamp > oneDayAgo).map((show: any) => show.showId);
    }
    return [];
  } catch (error) {
    console.warn('Failed to get recently recommended shows:', error);
    return [];
  }
}

// Store recently recommended shows
async function storeRecentlyRecommendedShows(userId: string, showIds: string[]) {
  try {
    const recentlyRecommended = await AsyncStorage.getItem(`recentlyRecommended_${userId}`);
    const existing = recentlyRecommended ? JSON.parse(recentlyRecommended) : [];
    
    const newEntries = showIds.map(showId => ({
      showId,
      timestamp: Date.now()
    }));
    
    const updated = [...newEntries, ...existing].slice(0, 50); // Keep last 50 recommendations
    await AsyncStorage.setItem(`recentlyRecommended_${userId}`, JSON.stringify(updated));
  } catch (error) {
    console.warn('Failed to store recently recommended shows:', error);
  }
}

export const useForYouShows = (): UseQueryResult<Show[], Error> => {
  const prefs = useGenrePrefs();
  const { userProfile, user } = useAppContext();
  
  // Create a STABLE query key that doesn't change with immediate bookmark toggles
  const queryKey = useMemo(() => {
    // SIMPLIFIED: Only use static elements to prevent bookmark-triggered refetches
    return [
      'for-you', 
      user?.uid, // Only track user changes, not preferences
      // Refresh only every hour to prevent frequent invalidation
      Math.floor(Date.now() / (60 * 60 * 1000)), // Every hour instead of 10 minutes
    ];
  }, [user?.uid]); // REMOVED: prefs, userProfile.genreWeights, userProfile.runtime

  return useQuery<Show[], Error>({
    queryKey,
    queryFn: async () => {
      console.log('[ForYou] Building For You list with preferences:', prefs);
      const startTime = Date.now();
      
      try {
        // Skip user interactions for faster initial load
        const userInteractions: any[] = [];
        
        // Get recently recommended shows to avoid repetition (now safe after query key fix)
        const recentlyRecommended = await getRecentlyRecommendedShows(user?.uid);
        console.log('[ForYou] Recently recommended shows to avoid:', recentlyRecommended.length);
        
        const result = await buildForYouList(prefs, userProfile, userInteractions, recentlyRecommended);
        
        const endTime = Date.now();
        console.log(`[ForYou] List built successfully in ${endTime - startTime}ms, found ${result.length} shows`);
        
        // Store recently recommended shows asynchronously (now safe after query key fix)
        if (user?.uid) {
          storeRecentlyRecommendedShows(user.uid, result.map(s => s.id)).catch(console.warn);
        }
        
        return result;
      } catch (error) {
        console.error('[ForYou] Error building For You list:', error);
        return getFallbackShows();
      }
    },
    staleTime: 1_000 * 60 * 10, // 10 minutes for better performance
    gcTime: 1_000 * 60 * 30, // 30 minutes
    // Enable background refetching but reduce frequency
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
};

// Fallback shows when API fails or returns no results
function getFallbackShows(): Show[] {
  return [
    {
      id: 'fallback-1',
      title: 'Popular Shows',
      trailerUrl: '',
      posterUrl: 'https://images.pexels.com/photos/10513822/pexels-photo-10513822.jpeg?auto=compress&cs=tinysrgb&w=800',
      synopsis: 'Discover trending content and popular shows across all genres.',
      genres: ['Drama', 'Comedy'],
      year: 2024,
      rating: 'TV-14',
      duration: '45m',
      popularity: 1000,
    },
    {
      id: 'fallback-2',
      title: 'New Releases',
      trailerUrl: '',
      posterUrl: 'https://images.pexels.com/photos/4381392/pexels-photo-4381392.jpeg?auto=compress&cs=tinysrgb&w=800',
      synopsis: 'Check out the latest releases and fresh content.',
      genres: ['Action', 'Thriller'],
      year: 2024,
      rating: 'TV-MA',
      duration: '50m',
      popularity: 950,
    },
    {
      id: 'fallback-3',
      title: 'Recommended for You',
      trailerUrl: '',
      posterUrl: 'https://images.pexels.com/photos/5935232/pexels-photo-5935232.jpeg?auto=compress&cs=tinysrgb&w=800',
      synopsis: 'Personalized recommendations based on your preferences.',
      genres: ['Sci-Fi', 'Drama'],
      year: 2024,
      rating: 'TV-14',
      duration: '55m',
      popularity: 900,
    },
  ];
}

/* ───────── helpers ───────── */
function mapTMDBtoShow(item: any, trailerUrl = ''): Show {
  // Determine media type - check both explicit media_type and presence of specific fields
  const mediaType = item.media_type || (item.first_air_date ? 'tv' : item.release_date ? 'movie' : 'tv');
  
  console.log(`Mapping show: ${item.name || item.title} (${mediaType}-${item.id})`);
  console.log('Item data:', {
    mediaType,
    hasFirstAirDate: !!item.first_air_date,
    hasReleaseDate: !!item.release_date,
    genres: item.genre_ids,
  });

  return {
    id: `${mediaType}-${item.id}`,
    title: item.name || item.title,
    trailerUrl,
    posterUrl: item.backdrop_path
      ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}`
      : '',
    synopsis: item.overview,
    genres: (item.genre_ids ?? []).map((id: number) => genreMap[id] || 'Unknown'),
    year: (item.first_air_date || item.release_date)
      ? Number((item.first_air_date || item.release_date).split('-')[0])
      : 0,
    rating: item.adult ? 'R' : 'PG',
    duration: '',
    popularity: item.popularity,
  };
}

// Optimized hook for on-demand video loading with persistent caching
export const useShowTrailer = (show: Show | null) => {
  const [trailerUrl, setTrailerUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrailer = useCallback(async () => {
    if (!show) {
      setTrailerUrl('');
      return;
    }

    // If show already has a trailer URL, use it immediately
    if (show.trailerUrl) {
      setTrailerUrl(show.trailerUrl);
      return;
    }

    // Ensure cache is loaded
    await loadTrailerCache();

    // Check cache first
    const cacheKey = `${show.id}`;
    if (trailerCache.has(cacheKey)) {
      const cachedUrl = trailerCache.get(cacheKey) || '';
      console.log(`[VideoCard] Using cached trailer for ${show.title}: ${cachedUrl ? 'found' : 'empty'}`);
      setTrailerUrl(cachedUrl);
      return;
    }

    // Don't fetch if we already have a trailer URL from previous fetch
    if (trailerUrl && trailerUrl !== '') {
      return;
    }

    console.log(`[VideoCard] Loading trailer for ${show.title}...`);
    setIsLoading(true);
    setError(null);

    try {
      const mediaType = show.id.startsWith('movie') ? 'movie' : 'tv';
      const mediaId = Number(show.id.split('-')[1]);
      
      const videos = await fetchVideos(mediaType, mediaId);
      const bestTrailerUrl = getBestTrailerUrl(videos.results || []);
      
      // Cache the result
      trailerCache.set(cacheKey, bestTrailerUrl);
      
      // Save cache asynchronously
      saveTrailerCache().catch(console.warn);
      
      setTrailerUrl(bestTrailerUrl);
      console.log(`[VideoCard] Trailer for ${show.title}:`, bestTrailerUrl ? 'found' : 'not found');
    } catch (e) {
      console.warn(`[VideoCard] Failed to fetch trailer for ${show.title}:`, e);
      setError('Failed to load trailer');
      // Cache empty result to avoid retrying
      trailerCache.set(cacheKey, '');
      saveTrailerCache().catch(console.warn);
    } finally {
      setIsLoading(false);
    }
  }, [show, trailerUrl]);

  // Initialize trailer URL immediately if available
  useEffect(() => {
    if (show) {
      // Check if show already has trailer or is cached before triggering fetch
      if (show.trailerUrl) {
        setTrailerUrl(show.trailerUrl);
      } else {
        loadTrailerCache().then(() => {
          const cacheKey = `${show.id}`;
          if (trailerCache.has(cacheKey)) {
            const cachedUrl = trailerCache.get(cacheKey) || '';
            setTrailerUrl(cachedUrl);
          } else {
            // Only fetch if not already loading and no URL available
            if (!isLoading) {
              fetchTrailer();
            }
          }
        });
      }
    }
  }, [show?.id, show?.trailerUrl]);

  return {
    trailerUrl: show?.trailerUrl || trailerUrl,
    isLoading,
    error,
    refetch: fetchTrailer
  };
};
