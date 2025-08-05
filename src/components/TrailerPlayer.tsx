import { useRef, useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Dimensions, Text, Linking, Pressable, Image } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { useAppContext } from '@/context/AppContext';
import { getShowById } from '../../utils/showCache';
import { ExternalLink, Play, Info } from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Calculate the largest 16:9 rectangle that fits the screen
const ASPECT_RATIO = 16 / 9;
let videoWidth = SCREEN_WIDTH;
let videoHeight = SCREEN_WIDTH / ASPECT_RATIO;
if (videoHeight > SCREEN_HEIGHT) {
  videoHeight = SCREEN_HEIGHT;
  videoWidth = SCREEN_HEIGHT * ASPECT_RATIO;
}

// Helper function to extract YouTube video ID from URL
function getYouTubeVideoId(url: string): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // Handle various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^#&?]*)/,
    /youtube\.com\/watch\?.*v=([^#&?]*)/,
    /youtu\.be\/([^#&?]*)/,
    /youtube\.com\/embed\/([^#&?]*)/,
    /youtube\.com\/v\/([^#&?]*)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1] && match[1].length === 11) {
      return match[1];
    }
  }

  return null;
}

// Helper function to check if URL is a direct video file
function isDirectVideoUrl(url: string): boolean {
  const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
  return videoExtensions.some(ext => url.toLowerCase().includes(ext));
}

export function TrailerPlayer({
  url,
  isFocused,
  width,
  height,
  showId,
}: {
  url: string;
  isFocused: boolean;
  width: number;
  height: number;
  showId: string;
}) {
  
  const [playing, setPlaying] = useState(false);
  const [playerState, setPlayerState] = useState('unknown');
  const [playerReady, setPlayerReady] = useState(false);

  // Removed debug logging

  // Removed debug logging





  
  const { logInteraction, updateGenreWeight } = useAppContext();
  const playerRef = useRef<any>(null);

  // TikTok-style focus control: immediate pause when focus lost, aggressive auto-play when gained
  useEffect(() => {
    // Focus state changed
    
    if (isFocused) {
      // AGGRESSIVE: Start playing immediately when focused
      // Video gained focus - starting playback
      setPlaying(true);
      
      // Try to trigger play via player reference immediately
      if (playerRef.current) {
        setTimeout(() => {
          try {
            // Direct player control: seekTo(0) and play
            playerRef.current?.seekTo?.(0);
          } catch (e) {
            // Direct player control failed
          }
        }, 100);
      }
      
      // Additional auto-play attempts with more aggressive timing
      setTimeout(() => {
        if (isFocused) {
          // Auto-play retry 1
          setPlaying(true);
          // Try player reference again
          if (playerRef.current) {
            try {
              playerRef.current?.seekTo?.(0);
            } catch (e) {
              // Retry 1 player ref failed
            }
          }
        }
      }, 300);
      
      setTimeout(() => {
        if (isFocused) {
          // Auto-play retry 2
          setPlaying(true);
        }
      }, 600);
      
      setTimeout(() => {
        if (isFocused) {
                      // Auto-play retry 3 (final)
          setPlaying(true);
        }
      }, 1000);
    } else {
      // IMMEDIATE pause when focus is lost - like TikTok
      // Focus lost - pausing
      setPlaying(false);
      // No timeouts for pause - instant response
    }
  }, [isFocused, showId]); // Removed playerReady dependency - be more aggressive

  const handlePlayerReady = useCallback(() => {
    // Player ready
    setPlayerReady(true);
    
    // AGGRESSIVE: Start playback immediately if focused when ready
    if (isFocused) {
      // Player ready and focused, starting playback
      setPlaying(true);
      
      // Multiple aggressive attempts to trigger play
      setTimeout(() => {
        if (playerRef.current && isFocused) {
          // Ready callback: Direct player control
          try {
            playerRef.current?.seekTo?.(0);
          } catch (e) {
            // Ready callback player control failed
          }
        }
      }, 50);
      
      setTimeout(() => {
        if (isFocused) {
          // Ready callback retry 1
          setPlaying(true);
        }
      }, 200);
      
      setTimeout(() => {
        if (isFocused) {
          // Ready callback retry 2
          setPlaying(true);
        }
      }, 500);
    } else {
      // Player ready but not focused, staying paused
      setPlaying(false);
    }
  }, [showId, isFocused]);

  const handleStateChange = useCallback((state: string) => {
    // State changed
    setPlayerState(state);
    
    if (state === 'ended' && isFocused) {
      // Auto-loop when video ends (only if still focused)
      // Video ended - looping
      setPlaying(true);
    }
    
    // Log when video actually starts playing
    if (state === 'playing') {
      // Video is now playing
    }
    
    // Log when video is paused (but don't auto-retry to avoid conflicts)
    if (state === 'paused') {
      // Video paused
    }
  }, [showId, isFocused, playing]);

  const handleError = useCallback((error: any) => {
    // Player error occurred
  }, [showId]);

  if (!url) {
    return null;
  }

  const youtubeVideoId = getYouTubeVideoId(url);
  
  if (!youtubeVideoId) {
    return (
      <View style={{
        width: width,
        height: height,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
      }}>
        <Text style={styles.placeholderText}>
          Unsupported video format
        </Text>
      </View>
    );
  }

      // Rendering player

  return (
    <View style={{
      width: width,
      height: height,
      backgroundColor: '#000',
    }}>
      {/* Debug overlay removed */}
      
      <YoutubePlayer
        key={youtubeVideoId}
        ref={playerRef}
        height={height}
        width={width}
        videoId={youtubeVideoId}
        play={playing}
        onError={handleError}
        onReady={handlePlayerReady}
        onChangeState={handleStateChange}
        onEnd={() => {
          if (isFocused) {
            setPlaying(true); // Only loop if still focused
          }
        }}
        initialPlayerParams={{
          playsinline: true,
          mute: 0, // Unmute since audio is working anyway
          controls: 0,
          autoplay: 1, // Enable autoplay for better immediate start
          rel: 0, // Don't show related videos
          modestbranding: 1, // Modest branding
          fs: 0, // Disable fullscreen
          cc_load_policy: 0, // Disable captions
          iv_load_policy: 3, // Disable annotations
          enablejsapi: 1, // Enable JS API for better control
        }}
        webViewStyle={{ 
          backgroundColor: '#000',
          width: width,
          height: height,
        }}
        webViewProps={{
          allowsInlineMediaPlayback: true,
          mediaPlaybackRequiresUserAction: false,
          bounces: false,
          scrollEnabled: false,
          startInLoadingState: false,
          javaScriptEnabled: true,
          domStorageEnabled: true,
          allowsFullscreenVideo: false,
          mixedContentMode: 'compatibility',
          // Force webview to reload for each video
          key: `webview-${youtubeVideoId}`,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  placeholderText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});



