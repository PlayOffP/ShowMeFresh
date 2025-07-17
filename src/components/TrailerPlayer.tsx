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

  
  const { logInteraction, updateGenreWeight } = useAppContext();
  const playerRef = useRef<any>(null);

  // Simple auto-play control
  useEffect(() => {
    if (!playerReady) return;
    
    if (isFocused) {
      console.log(`[TrailerPlayer] ${showId} - 🎯 Auto-playing focused video`);
      setPlaying(true);
    } else {
      console.log(`[TrailerPlayer] ${showId} - ⏸️ Pausing unfocused video`);
      setPlaying(false);
    }
  }, [isFocused, playerReady, showId]);

  const handlePlayerReady = useCallback(() => {
    console.log(`[TrailerPlayer] ${showId} - Player ready`);
    setPlayerReady(true);
  }, [showId]);

  const handleStateChange = useCallback((state: string) => {
    console.log(`[TrailerPlayer] ${showId} - 🔔 State changed to: ${state}`);
    setPlayerState(state);
    
    if (state === 'ended' && isFocused) {
      // Auto-loop when video ends
      console.log(`[TrailerPlayer] ${showId} - 🔄 Video ended - looping`);
      setPlaying(true);
    }
  }, [showId, isFocused]);

  const handleError = useCallback((error: any) => {
    console.log(`[TrailerPlayer] ${showId} - ❌ Error:`, error);
  }, [showId]);

  if (!url) {
    return null;
  }

  const youtubeVideoId = getYouTubeVideoId(url);
  
  if (!youtubeVideoId) {
    return (
      <View style={styles.centeredWrapper}>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            Unsupported video format
          </Text>
        </View>
      </View>
    );
  }

  console.log(`[TrailerPlayer] ${showId} - Rendering: videoId=${youtubeVideoId}, playing=${playing}, ready=${playerReady}`);

  return (
    <View style={styles.centeredWrapper}>
      <View style={styles.videoContainer}>
        <YoutubePlayer
          ref={playerRef}
          height={height}
          width={width}
          videoId={youtubeVideoId}
          play={playing}
          onError={handleError}
          onReady={handlePlayerReady}
          onChangeState={handleStateChange}
          onEnd={() => {
            setPlaying(true); // Loop
          }}
          initialPlayerParams={{
            playsinline: true,
            mute: 1,
            controls: 0,
          }}
          webViewStyle={{ 
            backgroundColor: '#000',
          }}
          webViewProps={{
            allowsInlineMediaPlayback: true,
            mediaPlaybackRequiresUserAction: false,
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centeredWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  videoContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
});
