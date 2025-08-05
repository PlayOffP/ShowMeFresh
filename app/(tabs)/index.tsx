import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Text, Pressable, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedScrollHandler, runOnJS } from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { VideoCard } from '../../src/components/VideoCard';
import ReviewDrawer from '../../src/components/ReviewDrawer';
import RatingModal from '../../src/components/RatingModal';
import { useAppContext } from '../../src/context/AppContext';
import { useTrendingShows, useForYouShows, Show } from '../../hooks/useShows';
import useOnboarded from '../../src/hooks/useOnboarded';

type FeedType = 'trending' | 'for-you';

interface ShowRowProps {
  show: Show;
  index: number;
  isFocused: boolean;
  onReviewPress: (show: Show) => void;
  onRatePress: (show: Show) => void;
  onUnavailable: (id: string) => void;
}

const ShowRow = ({ 
  show,
  index,
  isFocused,
  onReviewPress,
  onRatePress,
  onUnavailable,
}: ShowRowProps) => {
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  

  
  return (
    <Animated.View
      style={[
        styles.videoContainer,
        { height: screenHeight },
      ]}
    >
      <VideoCard
        show={show}
        isFocused={isFocused}
        onReviewPress={onReviewPress}
        onRatePress={onRatePress}
      />
    </Animated.View>
  );
};

export default function HomeScreen() {
  const { savedShows, isShowSaved, userProfile } = useAppContext();
  
  const [selectedShow, setSelectedShow] = useState<Show | null>(null);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [isRatingModalVisible, setIsRatingModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<FeedType>('for-you');
  const [badIds, setBadIds] = useState<Set<string>>(new Set());
  const scrollY = useSharedValue(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Get screen dimensions and refs first
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const scrollRef = useRef<Animated.ScrollView>(null);
  const insets = useSafeAreaInsets();
  
  // Landscape detection
  const isLandscape = screenWidth > screenHeight;
  
  // Ensure first video auto-plays immediately on mount
  useEffect(() => {
    setCurrentIndex(0);
  }, []);

  // Removed rotation handling logic as app is now portrait-only

  const handleUnavailable = (id: string) => setBadIds(prev => new Set(prev).add(id));

  const { data: trendingShows = [] } = useTrendingShows();
  const { data: forYouShows = [] } = useForYouShows();
  const shows: Show[] = activeTab === 'trending' ? trendingShows : forYouShows;
  
  // Ensure first video gets focused when shows load
  useEffect(() => {
    if (shows && shows.length > 0 && currentIndex === 0) {
      // Force re-render to ensure focus is properly applied
      setCurrentIndex(0);
    }
  }, [shows?.length, currentIndex]);

  // Update current index based on scroll position with immediate video control
  const updateCurrentIndex = (newIndex: number) => {
    // Safety check: ensure shows exist before filtering
    if (!shows || !Array.isArray(shows)) {
      return;
    }
    
    const validShows = shows.filter(s => !badIds.has(s.id));
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < validShows.length) {
      setCurrentIndex(newIndex);
    }
  };

  // TikTok-style scroll handler: focus changes at 50% mark
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
      
      // Removed rotation handling as app is now portrait-only
      
      // Simple TikTok-style focus: whichever video occupies >50% of screen gets focus
      const exactIndex = event.contentOffset.y / screenHeight;
      const newIndex = Math.max(0, Math.round(exactIndex));
      
      // Track scroll position
      
      // Update focus immediately when crossing the 50% threshold
      runOnJS(updateCurrentIndex)(newIndex);
    },
    onMomentumEnd: (event) => {
      // Ensure final position is set correctly when scrolling stops
      const exactIndex = event.contentOffset.y / screenHeight;
      const newIndex = Math.max(0, Math.round(exactIndex));
      // Scroll ended
      runOnJS(updateCurrentIndex)(newIndex);
    },
  });

  const handleReviewPress = (show: Show) => {
    setSelectedShow(show);
    setIsDrawerVisible(true);
  };

  const handleRatePress = (show: Show) => {
    setSelectedShow(show);
    setIsRatingModalVisible(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerVisible(false);
  };

  const handleCloseRatingModal = () => {
    setIsRatingModalVisible(false);
  };

  const handleTabPress = (tab: FeedType) => {
    setActiveTab(tab);
    // Reset scroll position when switching tabs
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    // Immediately set current index to 0 to ensure proper video focus
    setCurrentIndex(0);
    // Tab switched, reset to first video
  };



  const status = useOnboarded();

  if (status === 'loading') return null;

  return (
    <GestureHandlerRootView style={[
      styles.container, 
      { paddingTop: insets.top },
    ]}> 
      <View style={[
        styles.container,
      ]}>
        <View style={[
          styles.tabContainer,
          isLandscape && styles.tabContainerLandscape
        ]}>
          <Pressable
            style={[
              styles.tab, 
              activeTab === 'trending' && styles.activeTab,
              isLandscape && styles.tabLandscape
            ]}
            onPress={() => handleTabPress('trending')}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'trending' && styles.activeTabText,
              isLandscape && styles.tabTextLandscape
            ]}>
              Trending
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.tab, 
              activeTab === 'for-you' && styles.activeTab,
              isLandscape && styles.tabLandscape
            ]}
            onPress={() => handleTabPress('for-you')}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'for-you' && styles.activeTabText,
              isLandscape && styles.tabTextLandscape
            ]}>
              For You
            </Text>
          </Pressable>
        </View>

        <Animated.ScrollView
          ref={scrollRef}
          style={[
            styles.scrollView,
          ]}
          snapToInterval={screenHeight}
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          bounces={false}
          scrollEventThrottle={1}
          onScroll={scrollHandler}
          pagingEnabled
          contentContainerStyle={shows && shows.length <= 1 ? { flex: 1 } : undefined}
        >
          {(shows || []).filter(s => !badIds.has(s.id)).map((show, index) => {
            const isFocused = currentIndex === index;

            
            return (
              <ShowRow
                key={show.id}
                show={show}
                index={index}
                isFocused={isFocused}
                onReviewPress={handleReviewPress}
                onRatePress={handleRatePress}
                onUnavailable={handleUnavailable}
              />
            );
          })}
          {/* Add empty space if only one show to prevent scroll issues */}
          {(shows || []).filter(s => !badIds.has(s.id)).length <= 1 && (
            <View style={{ height: screenHeight }} />
          )}
        </Animated.ScrollView>

        <ReviewDrawer
          show={selectedShow}
          isVisible={isDrawerVisible}
          onClose={handleCloseDrawer}
        />

        <RatingModal
          show={selectedShow}
          visible={isRatingModalVisible}
          onClose={handleCloseRatingModal}
        />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  tabContainer: {
    flexDirection: 'row',
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginHorizontal: 8,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  activeTab: {
    backgroundColor: 'rgba(255,0,80,0.8)',
    borderColor: '#FF0050',
  },
  tabText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    opacity: 0.7,
  },
  activeTabText: {
    opacity: 1,
    fontFamily: 'Inter-Bold',
  },
  scrollView: {
    flex: 1,
  },
  videoContainer: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Landscape-specific styles
  tabContainerLandscape: {
    top: 10,
    paddingHorizontal: 16,
  },
  tabLandscape: {
    paddingVertical: 8,
    marginHorizontal: 6,
    borderRadius: 20,
  },
  tabTextLandscape: {
    fontSize: 14,
  },

});