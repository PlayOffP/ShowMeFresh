import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { TrailerPlayer } from './TrailerPlayer';
import { Show, useShowTrailer } from '../../hooks/useShows';
import { X } from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ShowDetailsModalProps {
  show: Show | null;
  visible: boolean;
  onClose: () => void;
}

export function ShowDetailsModal({ show, visible, onClose }: ShowDetailsModalProps) {
  // Use on-demand trailer loading for shows that might not have trailerUrl cached
  const { trailerUrl, isLoading, error } = useShowTrailer(show);
  
  if (!show) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={28} color="#fff" />
          </TouchableOpacity>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title}>{show.title}</Text>
            <Text style={styles.meta}>{show.year} • {show.rating} • {show.duration}</Text>
            <Text style={styles.genres}>{show.genres.join(' • ')}</Text>
            <View style={styles.trailerWrapper}>
              {isLoading ? (
                <View style={[styles.loadingContainer, { 
                  width: SCREEN_WIDTH * 0.9, 
                  height: SCREEN_WIDTH * 0.9 * 9 / 16 
                }]}>
                  <Text style={styles.loadingText}>Loading trailer...</Text>
                </View>
              ) : trailerUrl ? (
                <TrailerPlayer
                  url={trailerUrl}
                  isFocused={true}
                  width={SCREEN_WIDTH * 0.9}
                  height={SCREEN_WIDTH * 0.9 * 9 / 16}
                  showId={show.id}
                />
              ) : (
                <View style={[styles.noTrailerContainer, { 
                  width: SCREEN_WIDTH * 0.9, 
                  height: SCREEN_WIDTH * 0.9 * 9 / 16 
                }]}>
                  <Text style={styles.noTrailerText}>
                    {error ? 'Trailer unavailable' : 'No trailer available'}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.synopsis}>{show.synopsis}</Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '95%',
    maxWidth: 500,
    maxHeight: '90%',
    backgroundColor: '#181818',
    borderRadius: 20,
    overflow: 'hidden',
    paddingBottom: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 16,
    padding: 4,
  },
  content: {
    paddingTop: 48,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  meta: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 4,
    textAlign: 'center',
  },
  genres: {
    color: '#FF0050',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  trailerWrapper: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  synopsis: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'left',
    marginBottom: 16,
  },
  loadingContainer: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  noTrailerContainer: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  noTrailerText: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
  },
}); 