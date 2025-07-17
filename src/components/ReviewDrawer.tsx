import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Dimensions,
  Keyboard,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { X } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import StarRating from './StarRating';
import { Show } from '../../hooks/useShows';
import { Review } from '../../data/reviews';
import { useAppContext } from '@/context/AppContext';

interface ReviewDrawerProps {
  show: Show | null;
  isVisible: boolean;
  onClose: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_TRANSLATE_Y = -SCREEN_HEIGHT + 100;

export default function ReviewDrawer({ show, isVisible, onClose }: ReviewDrawerProps) {
  const translateY = useSharedValue(0);
  const drawerHeight = useSharedValue(SCREEN_HEIGHT * 0.7);
  const context = useSharedValue({ y: 0 });
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  
  const { addReview, getShowReviews } = useAppContext();
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    if (show) {
      setReviews(getShowReviews(show.id));
    }
  }, [show, getShowReviews]);

  useEffect(() => {
    if (isVisible) {
      translateY.value = withTiming(-drawerHeight.value, { duration: 300 });
    } else {
      translateY.value = withTiming(0, { duration: 300 });
      resetForm();
    }
  }, [isVisible]);

  const resetForm = () => {
    setRating(0);
    setComment('');
  };

  const gesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      translateY.value = Math.max(
        Math.min(event.translationY + context.value.y, 0),
        MAX_TRANSLATE_Y
      );
    })
    .onEnd(() => {
      if (translateY.value > -drawerHeight.value / 3) {
        translateY.value = withTiming(0, { duration: 300 });
        runOnJS(onClose)();
      } else {
        translateY.value = withTiming(-drawerHeight.value, { duration: 300 });
      }
    });

  const rStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const handleClose = () => {
    onClose();
  };

  const isSubmitDisabled = rating === 0 || comment.trim() === '';

  const handleSubmit = () => {
    if (isSubmitDisabled || !show) return;
    
    setIsSubmitting(true);
    
    addReview({
      showId: show.id,
      authorName: 'You',
      rating,
      text: comment.trim(),
    });
    
    // Update the local reviews list
    const updatedReviews = getShowReviews(show.id);
    setReviews(updatedReviews);
    
    // Reset form
    resetForm();
    setIsSubmitting(false);
    
    // Scroll to top to show the new review
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, 100);
  };

  if (!show) return null;

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.drawerContainer, rStyle]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
          style={styles.keyboardView}
        >
          <View style={styles.drawer}>
            <View style={styles.handle} />
            
            <View style={styles.header}>
              <Text style={styles.title}>{show.title} Reviews</Text>
              <Pressable style={styles.closeButton} onPress={handleClose}>
                <X size={24} color="white" />
              </Pressable>
            </View>
            
            <View style={styles.ratingContainer}>
              <Text style={styles.label}>Your Rating:</Text>
              <StarRating
                rating={rating}
                onChange={setRating}
              />
            </View>
            
            <TextInput
              style={styles.commentInput}
              placeholder="Write your review..."
              placeholderTextColor="#888"
              value={comment}
              onChangeText={setComment}
              multiline
              maxLength={500}
            />
            
            <Pressable
              style={[styles.submitButton, isSubmitDisabled && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitDisabled || isSubmitting}
            >
              <Text style={styles.submitText}>
                {isSubmitting ? 'Posting...' : 'Post Review'}
              </Text>
            </Pressable>
            
            <View style={styles.separator} />
            
            <Text style={styles.reviewsTitle}>
              {reviews.length > 0 ? `${reviews.length} Reviews` : 'No reviews yet'}
            </Text>
            
            <ScrollView 
              ref={scrollViewRef}
              style={styles.reviewsList}
              showsVerticalScrollIndicator={false}
            >
              {reviews.map((review) => (
                <View key={review.id} style={styles.reviewItem}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewAuthor}>{review.authorName}</Text>
                    <StarRating
                      rating={review.rating}
                      size={16}
                      disabled
                    />
                  </View>
                  <Text style={styles.reviewText}>{review.text}</Text>
                  <Text style={styles.reviewDate}>
                    {new Date(review.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  drawerContainer: {
    height: SCREEN_HEIGHT,
    width: '100%',
    position: 'absolute',
    top: SCREEN_HEIGHT,
    backgroundColor: 'transparent',
    zIndex: 1000,
  },
  keyboardView: {
    flex: 1,
  },
  drawer: {
    height: SCREEN_HEIGHT * 0.7,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: 'white',
  },
  closeButton: {
    padding: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: 'white',
    marginRight: 12,
  },
  commentInput: {
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    padding: 12,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: 'white',
    height: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#FF0050',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButtonDisabled: {
    backgroundColor: '#444',
    opacity: 0.7,
  },
  submitText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: 'white',
  },
  separator: {
    height: 1,
    backgroundColor: '#333',
    marginBottom: 16,
  },
  reviewsTitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: 'white',
    marginBottom: 12,
  },
  reviewsList: {
    flex: 1,
  },
  reviewItem: {
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewAuthor: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: 'white',
  },
  reviewText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: 'white',
    marginBottom: 8,
    lineHeight: 20,
  },
  reviewDate: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#888',
  },
});