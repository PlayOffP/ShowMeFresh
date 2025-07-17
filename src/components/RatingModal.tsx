import { useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import StarRating from './StarRating';
import { X } from 'lucide-react-native';
import { Show } from '../../hooks/useShows';
import { useAppContext } from '@/context/AppContext';

interface RatingModalProps {
  show: Show | null;
  visible: boolean;
  onClose: () => void;
}

export default function RatingModal({ show, visible, onClose }: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const { addReview } = useAppContext();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  if (!show) return null;

  const handleRate = () => {
    if (rating === 0) return;
    
    addReview({
      showId: show.id,
      authorName: 'You',
      rating,
      text: `Rated ${rating} stars`, // Simple comment for quick rating
    });
    
    // Reset and close
    setRating(0);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      supportedOrientations={['portrait', 'landscape']}
    >
      <View style={[
        styles.container,
        isLandscape && styles.containerLandscape
      ]}>
        <View style={[
          styles.modal,
          isLandscape && styles.modalLandscape
        ]}>
          <View style={styles.header}>
            <Text style={styles.title}>Rate this show</Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <X size={20} color="white" />
            </Pressable>
          </View>
          
          <Text style={styles.showTitle}>{show.title}</Text>
          
          <View style={styles.ratingContainer}>
            <StarRating
              rating={rating}
              onChange={setRating}
              size={36}
            />
          </View>
          
          <View style={styles.buttonContainer}>
            <Pressable 
              style={[styles.button, styles.cancelButton]} 
              onPress={onClose}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </Pressable>
            
            <Pressable 
              style={[styles.button, styles.submitButton, rating === 0 && styles.disabledButton]} 
              onPress={handleRate}
              disabled={rating === 0}
            >
              <Text style={styles.buttonText}>Submit</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  containerLandscape: {
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
  },
  modalLandscape: {
    width: '60%',
    maxWidth: 450,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: 'white',
  },
  closeButton: {
    padding: 4,
  },
  showTitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: 'white',
    marginBottom: 20,
  },
  ratingContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#333',
    marginRight: 8,
  },
  submitButton: {
    backgroundColor: '#FF0050',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#444',
    opacity: 0.7,
  },
  buttonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: 'white',
  },
});