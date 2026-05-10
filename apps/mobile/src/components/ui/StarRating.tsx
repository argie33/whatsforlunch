import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Star } from 'lucide-react-native';
import { XStack, YStack, Text } from 'tamagui';

interface StarRatingProps {
  rating?: number | null;
  count?: number;
  onRate?: (rating: number) => void;
  readOnly?: boolean;
  size?: number;
  interactive?: boolean;
}

export function StarRating({
  rating = 0,
  count = 0,
  onRate,
  readOnly = false,
  size = 16,
  interactive = true,
}: StarRatingProps) {
  const displayRating = rating ?? 0;

  const renderStar = (index: number) => {
    const isFilled = index < Math.floor(displayRating);
    const isPartial = index < displayRating && displayRating % 1 !== 0;

    return (
      <TouchableOpacity
        key={index}
        onPress={() => interactive && onRate?.(index + 1)}
        disabled={readOnly || !interactive}
        activeOpacity={interactive && !readOnly ? 0.7 : 1}
      >
        <Star
          size={size}
          fill={isFilled ? '$brand/primary' : 'none'}
          color={isFilled ? '$brand/primary' : isPartial ? '$brand/primary' : '$border/subtle'}
          strokeWidth={1.5}
        />
      </TouchableOpacity>
    );
  };

  return (
    <YStack gap="$1">
      <XStack gap="$1" alignItems="center">
        {[0, 1, 2, 3, 4].map(renderStar)}
      </XStack>
      {count > 0 && (
        <Text fontSize={12} color="$textTertiary">
          {rating ? rating.toFixed(1) : '—'} • {count} {count === 1 ? 'rating' : 'ratings'}
        </Text>
      )}
      {!readOnly && interactive && onRate && !rating && (
        <Text fontSize={12} color="$brand/primary" fontWeight="600">
          Tap to rate
        </Text>
      )}
    </YStack>
  );
}
