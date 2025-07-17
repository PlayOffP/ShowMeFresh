import { UserInteraction } from '@/context/AppContext';
import { getShowById } from '../../utils/showCache';

// Analytics event types for recommendation algorithm
export interface AnalyticsEvent {
  type: 'view' | 'click' | 'save' | 'rate' | 'watch' | 'skip' | 'complete' | 'share' | 'search';
  showId: string;
  timestamp: number;
  userId: string;
  sessionId: string;
  metadata: {
    // Content metadata
    genre?: string;
    runtime?: number;
    rating?: number;
    watchTime?: number;
    
    // User context
    userGenres?: string[];
    userRuntime?: string;
    userLanguage?: string;
    
    // Interaction context
    source?: 'home' | 'must_watch' | 'search' | 'recommendation' | 'friend_share';
    position?: number; // Position in feed
    timeOfDay?: number; // Hour of day (0-23)
    dayOfWeek?: number; // Day of week (0-6)
    
    // Session data
    sessionDuration?: number;
    showsViewedInSession?: number;
    totalWatchTime?: number;
  };
}

// Session tracking
let currentSessionId = Date.now().toString();
let sessionStartTime = Date.now();
let sessionEvents: AnalyticsEvent[] = [];

// Initialize new session
export const startNewSession = () => {
  currentSessionId = Date.now().toString();
  sessionStartTime = Date.now();
  sessionEvents = [];
  console.log('📊 New analytics session started:', currentSessionId);
};

// Track user interaction with rich metadata
export const trackEvent = async (
  type: AnalyticsEvent['type'],
  showId: string,
  userId: string,
  metadata: Partial<AnalyticsEvent['metadata']> = {}
) => {
  const show = getShowById(showId);
  const now = Date.now();
  const sessionDuration = now - sessionStartTime;
  
  const event: AnalyticsEvent = {
    type,
    showId,
    timestamp: now,
    userId,
    sessionId: currentSessionId,
    metadata: {
      // Content metadata
      genre: show?.genres[0],
      runtime: show?.duration ? parseInt(show.duration.replace(/\D/g, '')) : undefined,
      
      // Time context
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      
      // Session context
      sessionDuration,
      showsViewedInSession: sessionEvents.length,
      
      ...metadata,
    },
  };
  
  // Add to session events
  sessionEvents.push(event);
  
  // Log for debugging
  console.log('📊 Analytics Event:', {
    type: event.type,
    showId: event.showId,
    genre: event.metadata.genre,
    watchTime: event.metadata.watchTime,
    sessionDuration: Math.round(sessionDuration / 1000) + 's',
  });
  
  return event;
};

// Get session summary for algorithm
export const getSessionSummary = () => {
  const now = Date.now();
  const sessionDuration = now - sessionStartTime;
  
  const eventsByType = sessionEvents.reduce((acc, event) => {
    acc[event.type] = (acc[event.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const totalWatchTime = sessionEvents
    .filter(e => e.metadata.watchTime && e.metadata.watchTime > 0)
    .reduce((sum, e) => sum + (e.metadata.watchTime || 0), 0);
  
  const uniqueShows = new Set(sessionEvents.map(e => e.showId)).size;
  
  return {
    sessionId: currentSessionId,
    sessionDuration: Math.round(sessionDuration / 1000), // seconds
    totalEvents: sessionEvents.length,
    eventsByType,
    totalWatchTime: Math.round(totalWatchTime), // seconds
    uniqueShows,
    averageWatchTime: uniqueShows > 0 ? Math.round(totalWatchTime / uniqueShows) : 0,
  };
};

// Get user behavior patterns
export const analyzeUserBehavior = (interactions: UserInteraction[]) => {
  const patterns = {
    // Genre preferences
    genreEngagement: {} as Record<string, { views: number; watchTime: number; saves: number; ratings: number }>,
    
    // Time patterns
    timeOfDay: {} as Record<number, number>,
    dayOfWeek: {} as Record<number, number>,
    
    // Content preferences
    runtimePreference: {} as Record<string, number>,
    ratingPattern: {} as Record<number, number>,
    
    // Engagement patterns
    sessionLength: [] as number[],
    watchTimeDistribution: [] as number[],
    skipRate: 0,
    completionRate: 0,
  };
  
  let totalInteractions = 0;
  let totalSkips = 0;
  let totalCompletions = 0;
  let totalWatchTime = 0;
  
  interactions.forEach(interaction => {
    totalInteractions++;
    
    // Genre analysis
    if (interaction.metadata?.genre) {
      const genre = interaction.metadata.genre;
      if (!patterns.genreEngagement[genre]) {
        patterns.genreEngagement[genre] = { views: 0, watchTime: 0, saves: 0, ratings: 0 };
      }
      
      patterns.genreEngagement[genre].views++;
      
      if (interaction.metadata.watchTime) {
        patterns.genreEngagement[genre].watchTime += interaction.metadata.watchTime;
        totalWatchTime += interaction.metadata.watchTime;
      }
      
      if (interaction.type === 'save') {
        patterns.genreEngagement[genre].saves++;
      }
      
      if (interaction.type === 'rate') {
        patterns.genreEngagement[genre].ratings++;
      }
    }
    
    // Time pattern analysis
    const date = new Date(interaction.timestamp);
    const hour = date.getHours();
    const day = date.getDay();
    
    patterns.timeOfDay[hour] = (patterns.timeOfDay[hour] || 0) + 1;
    patterns.dayOfWeek[day] = (patterns.dayOfWeek[day] || 0) + 1;
    
    // Content preference analysis
    if (interaction.metadata?.runtime) {
      const runtime = interaction.metadata.runtime < 30 ? 'short' : 
                     interaction.metadata.runtime < 60 ? 'medium' : 'long';
      patterns.runtimePreference[runtime] = (patterns.runtimePreference[runtime] || 0) + 1;
    }
    
    if (interaction.metadata?.rating) {
      patterns.ratingPattern[interaction.metadata.rating] = (patterns.ratingPattern[interaction.metadata.rating] || 0) + 1;
    }
    
    // Engagement analysis
    if (interaction.type === 'skip') {
      totalSkips++;
    } else if (interaction.type === 'complete') {
      totalCompletions++;
    }
    
    if (interaction.metadata?.watchTime) {
      patterns.watchTimeDistribution.push(interaction.metadata.watchTime);
    }
  });
  
  // Calculate rates
  patterns.skipRate = totalInteractions > 0 ? totalSkips / totalInteractions : 0;
  patterns.completionRate = totalInteractions > 0 ? totalCompletions / totalInteractions : 0;
  
  return {
    patterns,
    summary: {
      totalInteractions,
      totalWatchTime: Math.round(totalWatchTime),
      averageWatchTime: patterns.watchTimeDistribution.length > 0 
        ? Math.round(patterns.watchTimeDistribution.reduce((a, b) => a + b, 0) / patterns.watchTimeDistribution.length)
        : 0,
      skipRate: Math.round(patterns.skipRate * 100),
      completionRate: Math.round(patterns.completionRate * 100),
    }
  };
};

// Get recommendation insights
export const getRecommendationInsights = (userProfile: any, interactions: UserInteraction[]) => {
  const behavior = analyzeUserBehavior(interactions);
  
  // Top genres by engagement
  const topGenres = Object.entries(behavior.patterns.genreEngagement)
    .sort(([, a], [, b]) => (b.watchTime + b.saves * 10 + b.ratings * 5) - (a.watchTime + a.saves * 10 + a.ratings * 5))
    .slice(0, 5)
    .map(([genre, data]) => ({
      genre,
      engagement: data.watchTime + data.saves * 10 + data.ratings * 5,
      watchTime: data.watchTime,
      saves: data.saves,
      ratings: data.ratings,
    }));
  
  // Peak viewing times
  const peakHours = Object.entries(behavior.patterns.timeOfDay)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([hour, count]) => ({ hour: parseInt(hour), count }));
  
  // Content preferences
  const runtimePreference = Object.entries(behavior.patterns.runtimePreference)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || 'medium';
  
  return {
    topGenres,
    peakHours,
    runtimePreference,
    engagementMetrics: behavior.summary,
    recommendations: {
      // Suggest shows in top genres during peak hours
      genreFocus: topGenres.slice(0, 3).map(g => g.genre),
      runtimeFocus: runtimePreference,
      timeOptimization: peakHours.map(p => p.hour),
    }
  };
};

// Export session data for debugging
export const exportSessionData = () => {
  return {
    sessionId: currentSessionId,
    sessionDuration: Math.round((Date.now() - sessionStartTime) / 1000),
    events: sessionEvents,
    summary: getSessionSummary(),
  };
}; 