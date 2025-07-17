import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: number;
  disabled?: boolean;
  onChange?: (rating: number) => void;
}

export default function StarRating({
  rating,
  maxStars = 5,
  size = 24,
  disabled = false,
  onChange,
}: StarRatingProps) {
  const renderStar = (position: number) => {
    const isFilled = position <= rating;
    
    return (
      <Pressable
        key={position}
        onPress={() => !disabled && onChange?.(position)}
        disabled={disabled}
        style={({ pressed }) => [
          styles.starContainer,
          pressed && !disabled && styles.pressed,
        ]}
      >
        <Star
          size={size}
          color={isFilled ? '#FF0050' : '#FFFFFF'}
          fill={isFilled ? '#FF0050' : 'transparent'}
          strokeWidth={1.5}
        />
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {Array.from({ length: maxStars }, (_, i) => renderStar(i + 1))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starContainer: {
    padding: 4,
  },
  pressed: {
    opacity: 0.7,
  },
});