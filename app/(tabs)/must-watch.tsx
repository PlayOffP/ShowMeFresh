import React, { useState } from 'react';
import { useMemo } from 'react';
import { StyleSheet, View, Text, FlatList, Image, Pressable, Dimensions, Alert } from 'react-native';
import { useAppContext } from '../../src/context/AppContext';
import { Trash2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Show } from '../../hooks/useShows';
import { getShowById } from '../../utils/showCache';
import { useShowPreferenceScore } from '../../hooks/useGenrePrefs';
import { ShowDetailsModal } from '../../src/components/ShowDetailsModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Individual show item component to properly use the hook
const ShowItem = ({ show, onRemove, onPress }: { show: Show; onRemove: (id: string) => void; onPress: (show: Show) => void }) => {
  const preferenceScore = useShowPreferenceScore(show.id);
  
  return (
    <Pressable 
      style={styles.showItem}
      onPress={() => onPress(show)}
      onLongPress={() => onRemove(show.id)}
    >
      <Image source={{ uri: show.posterUrl }} style={styles.poster} />
      <View style={styles.showInfo}>
        <View style={styles.titleRow}>
          <Text style={styles.showTitle}>{show.title}</Text>
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreText}>{preferenceScore}</Text>
          </View>
        </View>
        <Text style={styles.showMeta}>{show.year} • {show.rating}</Text>
        <Text style={styles.showGenre}>{show.genres.join(', ')}</Text>
      </View>
      <Pressable 
        style={styles.removeButton}
        onPress={() => onRemove(show.id)}
      >
        <Trash2 size={20} color="#FF0050" />
      </Pressable>
    </Pressable>
  );
};

export default function MustWatchScreen() {
  const { savedShows, toggleSaved, userProfile } = useAppContext();
  const insets = useSafeAreaInsets();
  const [selectedShow, setSelectedShow] = useState<Show | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  const showsWithScores = savedShows
    .map(id => {
      const show = getShowById(id);
      if (!show) {
        console.warn(`[Must-Watch] Show not found in cache: ${id}`);
        return null;
      }
      return { show, id };
    })
    .filter((item): item is { show: Show; id: string } => item !== null);

  console.log(`[Must-Watch] Found ${showsWithScores.length} of ${savedShows.length} saved shows in cache`);

  const scoredShows = showsWithScores.map(item => {
    let score = 0;
    
    item.show.genres.forEach(genre => {
      score += userProfile.genreWeights[genre] || 0;
    });
    
    if (item.show.duration) {
      const duration = parseInt(item.show.duration.replace(/\D/g, ''));
      if (duration < 30 && userProfile.runtime === 'short') score += 2;
      else if (duration >= 30 && duration <= 60 && userProfile.runtime === 'medium') score += 2;
      else if (duration > 60 && userProfile.runtime === 'long') score += 2;
    }
    
    return { ...item, score };
  });

  const savedShowsData = scoredShows
    .sort((a, b) => b.score - a.score)
    .map(item => item.show);

  const handleRemove = (showId: string) => {
    Alert.alert(
      "Remove from Must-Watch",
      "Are you sure you want to remove this show from your Must-Watch list?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Remove", 
          onPress: () => toggleSaved(showId),
          style: "destructive"
        }
      ]
    );
  };

  const handleShowPress = (show: Show) => {
    setSelectedShow(show);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedShow(null);
  };

  const renderItem = ({ item }: { item: Show }) => (
    <ShowItem show={item} onRemove={handleRemove} onPress={handleShowPress} />
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Must Watch</Text>
      <Text style={styles.subtitle}>Sorted by your preferences</Text>
      
      {savedShowsData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No saved shows yet</Text>
          <Text style={styles.emptySubtext}>
            Go to the For You tab and bookmark shows you want to watch!
          </Text>
        </View>
      ) : (
        <FlatList
          data={savedShowsData}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
      
      <ShowDetailsModal
        show={selectedShow}
        visible={modalVisible}
        onClose={handleCloseModal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  headerTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: 'white',
  },
  listContent: {
    padding: 16,
  },
  showItem: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  poster: {
    width: 100,
    height: 150,
  },
  showInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  showTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: 'white',
    flex: 1,
  },
  scoreContainer: {
    backgroundColor: '#FF0050',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  scoreText: {
    fontFamily: 'Inter-Bold',
    fontSize: 12,
    color: 'white',
  },
  showMeta: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#CCC',
    marginBottom: 4,
  },
  showGenre: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#AAA',
  },
  removeButton: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontFamily: 'Inter-Medium',
    fontSize: 18,
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#AAA',
    textAlign: 'center',
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: 'white',
    padding: 16,
    paddingBottom: 4,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#AAA',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  list: {
    padding: 16,
  },
});