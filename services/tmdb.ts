import Constants from 'expo-constants';

const TMDB = 'https://api.themoviedb.org/3';

// Use expoConfig for newer versions or web environments
const TMDB_API_KEY = Constants.expoConfig?.extra?.TMDB_API_KEY || Constants.manifest?.extra?.TMDB_API_KEY;
const TMDB_BEARER = Constants.expoConfig?.extra?.TMDB_BEARER || Constants.manifest?.extra?.TMDB_BEARER;

const headers = {
  Authorization: `Bearer ${TMDB_BEARER}`,
  accept: 'application/json',
};

export async function fetchTrending(media = 'all', period = 'day') {
  const res = await fetch(`${TMDB}/trending/${media}/${period}?language=en-US`, { headers });
  if (!res.ok) throw new Error('TMDB trending failed');
  return res.json(); // { results: [...] }
}

export async function fetchVideos(media: 'movie' | 'tv', id: number) {
  async function fetchWithParams(baseUrl: string, extraHeaders = {}) {
    const res = await fetch(baseUrl, { headers: { ...headers, ...extraHeaders } });
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  }

  try {
    let allResults: any[] = [];
    
    // Try with Bearer token and language
    const withLang = await fetchWithParams(`${TMDB}/${media}/${id}/videos?language=en-US`);
    if (withLang?.results) {
      allResults.push(...withLang.results);
    }

    // Try without language
    const noLang = await fetchWithParams(`${TMDB}/${media}/${id}/videos`);
    if (noLang?.results) {
      // Filter out duplicates
      const newResults = noLang.results.filter((video: any) => 
        !allResults.some((existing: any) => existing.key === video.key)
      );
      allResults.push(...newResults);
    }

    // If Bearer token failed or we want more results, try with API key
    if (allResults.length === 0 && TMDB_API_KEY) {
      // Try with API key and language
      const withKey = await fetchWithParams(
        `${TMDB}/${media}/${id}/videos?api_key=${TMDB_API_KEY}&language=en-US`,
        {}
      );
      if (withKey?.results) {
        allResults.push(...withKey.results);
      }

      // Try with API key without language
      const withKeyNoLang = await fetchWithParams(
        `${TMDB}/${media}/${id}/videos?api_key=${TMDB_API_KEY}`,
        {}
      );
      if (withKeyNoLang?.results) {
        // Filter out duplicates
        const newResults = withKeyNoLang.results.filter((video: any) => 
          !allResults.some((existing: any) => existing.key === video.key)
        );
        allResults.push(...newResults);
      }
    }

    return { results: allResults };
  } catch (error) {
    console.error('Error in fetchVideos:', error);
    throw error;
  }
}

export async function fetchDiscover(params: Record<string, string>, mediaType: 'movie' | 'tv' = 'tv') {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${TMDB}/discover/${mediaType}?${query}`, { headers });
  if (!res.ok) {
    console.error(`TMDB discover failed for ${mediaType}:`, res.status, res.statusText);
    throw new Error(`TMDB discover failed for ${mediaType}`);
  }
  return res.json(); // { results: [...] }
}