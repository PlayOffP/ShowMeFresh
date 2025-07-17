import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, Dimensions, Pressable, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useDerivedValue,
  runOnJS,
} from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { VideoCard } from '../../src/components/VideoCard';
import ReviewDrawer from '../../src/components/ReviewDrawer';
import RatingModal from '../../src/components/RatingModal';
import { useAppContext } from '../../src/context/AppContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useOnboarded from '../../src/hooks/useOnboarded';
import { useTrendingShows, useForYouShows, Show } from '../../hooks/useShows';

type FeedType = 'trending' | 'for-you';

interface ShowRowProps {
  show: Show;
  index: number;
  isFocused: boolean;
  onReviewPress: (s: Show) => void;
  onRatePress: (s: Show) => void;
  onUnavailable: (id: string) => void;
}

const ShowRow = React.memo(({
  show,
  index,
  isFocused,
  onReviewPress,
  onRatePress,
  onUnavailable,
}: ShowRowProps) => {
  const { height: screenHeight } = useWindowDimensions();
  
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
});

export default function HomeScreen() {
  const { savedShows, isShowSaved, userProfile } = useAppContext();
  
  const [selectedShow, setSelectedShow] = useState<Show | null>(null);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [isRatingModalVisible, setIsRatingModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<FeedType>('for-you');
  const [badIds, setBadIds] = useState<Set<string>>(new Set());
  const scrollY = useSharedValue(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { height: screenHeight } = useWindowDimensions();
  const scrollRef = useRef<Animated.ScrollView>(null);
  const insets = useSafeAreaInsets();

  const handleUnavailable = (id: string) => setBadIds(prev => new Set(prev).add(id));

  const { data: trendingShows = [] } = useTrendingShows();
  const { data: forYouShows = [] } = useForYouShows();
  const shows: Show[] = activeTab === 'trending' ? trendingShows : forYouShows;

  // Update current index based on scroll position
  const updateCurrentIndex = (newIndex: number) => {
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
    }
  };

  // SIMPLE SCROLL HANDLER: Update scroll position and current index
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
      const newIndex = Math.max(0, Math.round(event.contentOffset.y / screenHeight));
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
    setCurrentIndex(0);
  };

  const status = useOnboarded();

  if (status === 'loading') return null;

  return (
    <GestureHandlerRootView style={[styles.container, { paddingTop: insets.top }]}> 
      <View style={styles.container}>
        <View style={styles.tabContainer}>
          <Pressable
            style={[styles.tab, activeTab === 'trending' && styles.activeTab]}
            onPress={() => handleTabPress('trending')}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'trending' && styles.activeTabText
            ]}>
              Trending
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'for-you' && styles.activeTab]}
            onPress={() => handleTabPress('for-you')}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'for-you' && styles.activeTabText
            ]}>
              For You
            </Text>
          </Pressable>
        </View>

        <Animated.ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          snapToInterval={screenHeight}
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          bounces={false}
          scrollEventThrottle={16}
          onScroll={scrollHandler}
          pagingEnabled
          contentContainerStyle={shows.length <= 1 ? { flex: 1 } : undefined}
        >
          {shows.filter(s => !badIds.has(s.id)).map((show, index) => {
            return (
              <ShowRow
                key={show.id}
                show={show}
                index={index}
                isFocused={currentIndex === index}
                onReviewPress={handleReviewPress}
                onRatePress={handleRatePress}
                onUnavailable={handleUnavailable}
              />
            );
          })}
          {/* Add empty space if only one show to prevent scroll issues */}
          {shows.filter(s => !badIds.has(s.id)).length <= 1 && (
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
});