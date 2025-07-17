import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, Pressable, Dimensions, Modal, TouchableOpacity, Animated, useWindowDimensions, Share, Clipboard, Alert } from 'react-native';
import { Show } from '../../hooks/useShows';
import { TrailerPlayer } from './TrailerPlayer';
import { LinearGradient } from 'expo-linear-gradient';
import { Bookmark, BookmarkCheck, MessageSquare, Star, Share2 } from 'lucide-react-native';
import { useAppContext } from '@/context/AppContext';
import { ShareModal } from './ShareModal';
import { useShowTrailer } from '../../hooks/useShows';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ASPECT_RATIO = 16 / 9;

// Responsive video sizing defaults
let defaultVideoWidth = SCREEN_WIDTH;
let defaultVideoHeight = SCREEN_WIDTH / ASPECT_RATIO;
if (defaultVideoHeight > SCREEN_HEIGHT) {
  defaultVideoHeight = SCREEN_HEIGHT;
  defaultVideoWidth = SCREEN_HEIGHT * ASPECT_RATIO;
}

type Props = {
  show: Show;
  isFocused: boolean;
  onReviewPress?: (show: Show) => void;
  onRatePress?: (show: Show) => void;
};

// Helper to get a valid YouTube link from trailerUrl
function getYouTubeLink(trailerUrl: string): string | null {
  if (!trailerUrl) return null;
  if (trailerUrl.includes('youtube.com') || trailerUrl.includes('youtu.be')) {
    return trailerUrl;
  }
  return null;
}



export const VideoCard = React.memo(({ show, isFocused, onReviewPress, onRatePress }: Props) => {
  const { toggleSaved, isShowSaved } = useAppContext();
  const [infoVisible, setInfoVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  // Use on-demand trailer loading with preloading
  const { trailerUrl, isLoading, error, refetch } = useShowTrailer(show);

  // Debug logging (reduced frequency to prevent spam)
  useEffect(() => {
    if (show && (isLoading || error || trailerUrl)) {
      console.log(`[VideoCard] ${show.title} - loading: ${isLoading}, error: ${!!error}, hasTrailer: ${!!trailerUrl}`);
    }
  }, [show.id, isLoading, error, !!trailerUrl]); // Optimized dependencies

  // Preload trailer when focused, but don't block UI
  useEffect(() => {
    if (isFocused && !trailerUrl && !isLoading) {
      // Start loading the trailer when this card becomes focused (non-blocking)
      console.log(`[VideoCard] Preloading trailer for ${show.title}`);
      // Use setTimeout to make it non-blocking
      setTimeout(() => refetch(), 0);
    }
  }, [isFocused, trailerUrl, isLoading, refetch, show.title]);

  // Title fade logic
  const [showTitle, setShowTitle] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Info fade logic
  const infoFadeAnim = useRef(new Animated.Value(0)).current;

  // Interpolate opacity for the "More Info" button
  const buttonOpacity = infoFadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 1], // Stays at 70% opacity when info fades
  });

  const [shareOptionsVisible, setShareOptionsVisible] = useState(false);

  useEffect(() => {
    if (isFocused) {
      setShowTitle(true);
      fadeAnim.setValue(1);
      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start(() => setShowTitle(false));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isFocused, fadeAnim]); // Removed show.title to prevent unnecessary re-runs

  // Info fade logic for portrait mode
  useEffect(() => {
    let animation: Animated.CompositeAnimation;

    if (isFocused) {
      animation = Animated.sequence([
        Animated.timing(infoFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(2700),
        Animated.timing(infoFadeAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]);
      animation.start();
    } else {
      infoFadeAnim.setValue(0);
    }
    return () => {
      animation?.stop();
    };
  }, [isFocused, infoFadeAnim]);

  // Responsive video sizing
  let videoWidth = width;
  let videoHeight = width / ASPECT_RATIO;
  
  if (videoHeight > height) {
    videoHeight = height;
    videoWidth = height * ASPECT_RATIO;
  }
  
  if (isLandscape) {
    // In landscape, fit video to screen height, maintaining aspect ratio
    videoHeight = height;
    videoWidth = height * ASPECT_RATIO;
  }

  const handleSavePress = useCallback(() => {
    console.log(`[VideoCard] Save button pressed for ${show.title}`);
    toggleSaved(show.id);
  }, [show.title, show.id, toggleSaved]);

  const handleReviewPress = useCallback(() => {
    console.log(`[VideoCard] Review button pressed for ${show.title}`);
    onReviewPress?.(show);
  }, [show.title, show, onReviewPress]);

  const handleRatePress = useCallback(() => {
    console.log(`[VideoCard] Rate button pressed for ${show.title}`);
    onRatePress?.(show);
  }, [show.title, show, onRatePress]);

  const handleNativeShare = async () => {
    try {
      const youtubeLink = getYouTubeLink(trailerUrl);
      const shareUrl = youtubeLink || '';
      const message = `${show.title}\n\n${show.synopsis || ''}${shareUrl ? `\n\nWatch: ${shareUrl}` : ''}`;
      await Share.share({
        message,
        url: shareUrl,
        title: show.title,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleCopyLink = async () => {
    try {
      const shareUrl = trailerUrl || '';
      await Clipboard.setStringAsync(shareUrl);
      Alert.alert('Link Copied', 'The show link has been copied to your clipboard.');
    } catch (error) {
      console.error('Error copying link:', error);
    }
  };

  const handleSharePress = useCallback(() => {
    console.log(`[VideoCard] Share button pressed for ${show.title}`);
    setShareOptionsVisible(true);
  }, [show.title]);

  return (
    <View style={[
      styles.container,
      { height: height, width: width },
    ]}>
      {/* Trending/For You Tabs always visible, overlaid at the top */}
      <View style={[styles.tabsOverlay, isLandscape && { width: width }]}> 
        {/* You may want to move the actual tab bar here if not already overlaid */}
      </View>
      {/* Fading Title Overlay */}
      {showTitle && (
        <Animated.View style={[styles.fadingTitleBar, isLandscape && { width: width }, { opacity: fadeAnim }]}> 
          <Text style={styles.topTitleText}>{show.title}</Text>
        </Animated.View>
      )}
      {/* Wrapper for centering content */}
      <View style={[
        isLandscape 
          ? styles.landscapeWrapper 
          : styles.centeredWrapper
      ]}>
        <View style={[
          styles.videoFrame,
          { width: videoWidth, height: videoHeight },
        ]}>
          {isLoading ? (
            <View style={styles.loadingFallback}>
              <Text style={styles.loadingTitle}>{show.title}</Text>
              <Text style={styles.loadingSubtitle}>Loading trailer...</Text>
            </View>
          ) : trailerUrl ? (
            <TrailerPlayer url={trailerUrl} isFocused={isFocused} width={videoWidth} height={videoHeight} showId={show.id} />
          ) : (
            <View style={styles.noTrailerFallback}>
              <Text style={styles.noTrailerTitle}>{show.title}</Text>
              <Text style={styles.noTrailerSubtitle}>
                {error ? 'Trailer unavailable' : 'No trailer available'}
              </Text>
              <Text style={styles.noTrailerSynopsis}>{show.synopsis}</Text>
            </View>
          )}

          {/* Overlay gradient and meta info */}
          <View
            style={[
              styles.overlay,
              isLandscape && {
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                width: '100%',
                zIndex: 50,
                paddingBottom: 20,
              },
            ]}
            pointerEvents="box-none"
          >
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.9)']}
              style={[
                styles.gradient,
                isLandscape && {
                  height: 160,
                  paddingBottom: 24,
                  paddingHorizontal: 24,
                },
              ]}
              pointerEvents="box-none"
            >
              <View
                style={[
                  styles.titleContainer,
                  isLandscape && {
                    paddingHorizontal: 16,
                    width: '100%',
                  },
                ]}
              >
                {/* More Info Button */}
                <Animated.View style={{ opacity: buttonOpacity }} pointerEvents="auto">
                  <Pressable
                    style={[
                      styles.moreInfoButton,
                      isLandscape && {
                        paddingHorizontal: 24,
                        paddingVertical: 12,
                        borderRadius: 8,
                        backgroundColor: '#FF0050',
                        marginTop: 8,
                      },
                    ]}
                    onPress={() => setInfoVisible(true)}
                  >
                    <Text style={[styles.moreInfoText, isLandscape && { fontSize: 16, fontWeight: '600' }]}>
                      More Info
                    </Text>
                  </Pressable>
                </Animated.View>
              </View>
            </LinearGradient>
          </View>

          {/* Action buttons - now always bottom right, floating above video */}
          <View style={[
            styles.actionStack,
            isLandscape
              ? {
                  position: 'absolute',
                  right: 24,
                  top: '50%',
                  bottom: undefined,
                  transform: [{ translateY: -100 }],
                  zIndex: 60,
                  gap: 24,
                }
              : {
                  position: 'absolute',
                  right: 24,
                  bottom: 32,
                  top: undefined,
                  transform: [],
                  zIndex: 60,
                  gap: 16,
                }
          ]} pointerEvents="box-none">
            <Pressable 
              style={[styles.actionButton, !isLandscape && styles.actionButtonPortrait]}
              onPress={handleSavePress}
            >
              {isShowSaved(show.id)
                ? <BookmarkCheck size={isLandscape ? 32 : 24} color="#FF0050" fill="#FF0050" />
                : <Bookmark size={isLandscape ? 32 : 24} color="white" />}
            </Pressable>

            <Pressable 
              style={[styles.actionButton, !isLandscape && styles.actionButtonPortrait]}
              onPress={handleReviewPress}
            >
              <MessageSquare size={isLandscape ? 32 : 24} color="white" />
            </Pressable>

            <Pressable 
              style={[styles.actionButton, !isLandscape && styles.actionButtonPortrait]}
              onPress={handleRatePress}
            >
              <Star size={isLandscape ? 32 : 24} color="white" />
            </Pressable>

            {/* Share Button (opens share options modal) */}
            <Pressable 
              style={[styles.actionButton, !isLandscape && styles.actionButtonPortrait]}
              onPress={handleSharePress}
            >
              <Share2 size={isLandscape ? 32 : 24} color="white" />
            </Pressable>
          </View>
        </View>
      </View>
      {/* More Info Modal */}
      <Modal
        visible={infoVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoVisible(false)}
        supportedOrientations={['portrait', 'landscape']}
      >
        <TouchableOpacity 
          style={[
            styles.modalBackdrop,
            isLandscape && {
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }
          ]} 
          activeOpacity={1} 
          onPressOut={() => setInfoVisible(false)}
        >
          <View style={[
            styles.infoModal,
            isLandscape && {
              flexDirection: 'row',
              width: '95%',
              maxWidth: 900,
              padding: 32,
              gap: 24
            }
          ]}>
            {/* Left side in landscape - Title and Platforms */}
            <View style={[
              isLandscape && {
                flex: 1,
                alignItems: 'flex-start',
                justifyContent: 'center',
                borderRightWidth: 1,
                borderRightColor: 'rgba(255,255,255,0.1)',
                paddingRight: 24
              }
            ]}>
              <Text style={[
                styles.infoTitle,
                isLandscape && {
                  fontSize: 28,
                  textAlign: 'left',
                  marginBottom: 16
                }
              ]}>{show.title}</Text>
              
              {/* Meta information */}
              <Text style={[
                styles.infoMeta,
                isLandscape && {
                  textAlign: 'left',
                  marginBottom: 12,
                  fontSize: 16
                }
              ]}>
                {show.year} • {show.rating} • {show.duration}
              </Text>
              
              <Text style={[
                styles.infoGenres,
                isLandscape && {
                  textAlign: 'left',
                  marginBottom: 24,
                  fontSize: 16
                }
              ]}>
                {show.genres.join(' • ')}
              </Text>
              
              <Text style={[
                styles.infoPlatforms,
                isLandscape && {
                  textAlign: 'left',
                  marginBottom: 0
                }
              ]}>
                Available on: {Array.isArray((show as any)?.platforms) ? (show as any).platforms.join(', ') : 'Netflix, Prime Video, Hulu'}
              </Text>
            </View>

            {/* Right side in landscape - Synopsis and Close Button */}
            <View style={[
              isLandscape && {
                flex: 2,
                alignItems: 'flex-start',
                justifyContent: 'space-between'
              }
            ]}>
              <Text style={[
                styles.infoSynopsis,
                isLandscape && {
                  textAlign: 'left',
                  marginBottom: 32,
                  fontSize: 18,
                  lineHeight: 28
                }
              ]}>{show.synopsis}</Text>
              
              <TouchableOpacity 
                style={[
                  styles.closeButton,
                  isLandscape && {
                    alignSelf: 'flex-end',
                    paddingHorizontal: 32,
                    paddingVertical: 14
                  }
                ]} 
                onPress={() => setInfoVisible(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Share Options Modal */}
      <Modal
        visible={shareOptionsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setShareOptionsVisible(false)}
        supportedOrientations={['portrait', 'landscape']}
      >
        <TouchableOpacity
          style={[
            styles.shareOptionsBackdrop,
            isLandscape && styles.shareOptionsBackdropLandscape
          ]}
          activeOpacity={1}
          onPressOut={() => setShareOptionsVisible(false)}
        >
          <View style={[
            styles.shareOptionsModal,
            isLandscape && styles.shareOptionsModalLandscape
          ]}>
            <Text style={styles.shareOptionsTitle}>Share</Text>
            <TouchableOpacity
              style={styles.shareOption}
              onPress={() => {
                setShareOptionsVisible(false);
                setShareModalVisible(true);
              }}
            >
              <Text style={styles.shareOptionText}>Share to Friends</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.shareOption}
              onPress={async () => {
                await handleNativeShare();
                setShareOptionsVisible(false);
              }}
            >
              <Text style={styles.shareOptionText}>Share via...</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.shareOptionCancel}
              onPress={() => setShareOptionsVisible(false)}
            >
              <Text style={styles.shareOptionCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Share Modal */}
      <ShareModal
        show={show}
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
      />
    </View>
  );
}, (prevProps, nextProps) => {
  // Simple comparison - re-render only when show or focus changes
  return (
    prevProps.show.id === nextProps.show.id &&
    prevProps.isFocused === nextProps.isFocused
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    pointerEvents: 'box-none',
  },
  fadingTitleBar: {
    position: 'absolute',
    top: 144,
    left: 0,
    right: 0,
    zIndex: 25,
    alignItems: 'center',
    paddingHorizontal: 20,
    pointerEvents: 'box-none',
  },
  topTitleText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    textAlign: 'center',
  },
  centeredWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  landscapeWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  videoFrame: {
    width: defaultVideoWidth,
    height: defaultVideoHeight,
    position: 'relative',
    backgroundColor: '#000',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
  },
  gradient: {
    minHeight: 120,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  titleContainer: {
    width: '100%',
    paddingBottom: 8,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  meta: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  genre: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 12,
  },
  moreInfoButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    zIndex: 45,
  },
  moreInfoText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  infoModal: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 500,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  infoTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'Inter-Bold',
  },
  infoMeta: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'Inter-Medium',
  },
  infoGenres: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
  infoSynopsis: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
  infoPlatforms: {
    color: '#fff',
    fontSize: 15,
    marginBottom: 24,
    textAlign: 'center',
    fontWeight: '600',
    opacity: 0.9,
    fontFamily: 'Inter-Medium',
  },
  closeButton: {
    backgroundColor: '#FF0050',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'Inter-Bold',
  },
  actionStack: {
    position: 'absolute',
    right: 16,
    top: '40%',
    transform: [{ translateY: -60 }],
    alignItems: 'center',
    gap: 24,
    zIndex: 45,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonPortrait: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  loadingFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  loadingSubtitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  noTrailerFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noTrailerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  noTrailerSubtitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  noTrailerSynopsis: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  shareOptionsBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  shareOptionsBackdropLandscape: {
    justifyContent: 'center',
  },
  shareOptionsModal: {
    width: '100%',
    backgroundColor: '#222',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  shareOptionsModalLandscape: {
    width: '60%',
    maxWidth: 400,
    borderRadius: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  shareOptionsTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  shareOption: {
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  shareOptionText: {
    color: '#fff',
    fontSize: 18,
  },
  shareOptionCancel: {
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
  },
  shareOptionCancelText: {
    color: '#FF0050',
    fontSize: 18,
    fontWeight: 'bold',
  },
});