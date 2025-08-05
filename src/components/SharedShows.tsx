import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MessageSquare, User, Clock, CheckCircle, Play } from 'lucide-react-native';
import { useAppContext } from '@/context/AppContext';
import { getShowById } from '../../utils/showCache';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SharedShowsProps {
  visible: boolean;
  onClose: () => void;
}

export function SharedShows({ visible, onClose }: SharedShowsProps) {
  const { sharedShows, markSharedShowAsRead, user } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const { width, height } = useWindowDimensions();

  const handleMarkAsRead = async (sharedShowId: string) => {
    setIsLoading(true);
    try {
      await markSharedShowAsRead(sharedShowId);
    } catch (error) {
      console.error('Error marking as read:', error);
      Alert.alert('Error', 'Failed to mark as read. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const getSharedByInfo = (sharedBy: string) => {
    // This would ideally fetch user info, but for now we'll show a placeholder
    return `@user_${sharedBy.slice(0, 8)}`;
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1A1A1A', '#2A2A2A']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <MessageSquare size={24} color="#fff" />
            <Text style={styles.title}>Shared with You</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {sharedShows.length === 0 ? (
            <View style={styles.emptyState}>
              <MessageSquare size={64} color="rgba(255,255,255,0.3)" />
              <Text style={styles.emptyTitle}>No shared shows yet</Text>
              <Text style={styles.emptySubtitle}>
                When friends share shows with you, they'll appear here
              </Text>
            </View>
          ) : (
            sharedShows.map((sharedShow) => {
              const show = getShowById(sharedShow.showId);
              if (!show) return null;

              return (
                <View key={sharedShow.id} style={styles.sharedShowItem}>
                  {/* Show Info */}
                  <View style={styles.showInfo}>
                    <Text style={styles.showTitle}>{show.title}</Text>
                    <Text style={styles.showMeta}>
                      {show.year} • {show.rating} • {show.duration}
                    </Text>
                    <Text style={styles.showGenres}>
                      {show.genres.join(' • ')}
                    </Text>
                  </View>

                  {/* Shared Info */}
                  <View style={styles.sharedInfo}>
                    <View style={styles.sharedByRow}>
                      <User size={16} color="rgba(255,255,255,0.7)" />
                      <Text style={styles.sharedByText}>
                        Shared by {getSharedByInfo(sharedShow.sharedBy)}
                      </Text>
                    </View>
                    
                    <View style={styles.timeRow}>
                      <Clock size={16} color="rgba(255,255,255,0.7)" />
                      <Text style={styles.timeText}>
                        {formatDate(sharedShow.createdAt)}
                      </Text>
                    </View>

                    {sharedShow.message && (
                      <View style={styles.messageContainer}>
                        <Text style={styles.messageText}>
                          "{sharedShow.message}"
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Actions */}
                  <View style={styles.actions}>
                    {!sharedShow.isRead ? (
                      <TouchableOpacity
                        style={styles.markReadButton}
                        onPress={() => handleMarkAsRead(sharedShow.id)}
                        disabled={isLoading}
                      >
                        <CheckCircle size={16} color="#fff" />
                        <Text style={styles.markReadText}>Mark as Read</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.readIndicator}>
                        <CheckCircle size={16} color="#4CAF50" />
                        <Text style={styles.readText}>Read</Text>
                      </View>
                    )}
                    
                    <TouchableOpacity style={styles.watchButton}>
                      <Play size={16} color="#fff" />
                      <Text style={styles.watchText}>Watch</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    fontFamily: 'Inter-Bold',
  },
  emptySubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
  sharedShowItem: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  showInfo: {
    marginBottom: 16,
  },
  showTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    fontFamily: 'Inter-Bold',
  },
  showMeta: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginBottom: 4,
    fontFamily: 'Inter-Regular',
  },
  showGenres: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  sharedInfo: {
    marginBottom: 16,
  },
  sharedByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  sharedByText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  timeText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  messageContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FF0050',
  },
  messageText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontStyle: 'italic',
    fontFamily: 'Inter-Regular',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  markReadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  markReadText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  readIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  readText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  watchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF0050',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  watchText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
}); 