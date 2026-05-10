import React, { useState, useEffect } from 'react';
import { Image, ImageProps, ActivityIndicator, View } from 'react-native';
import { useOptimizedImage, OptimizedImageOptions } from '../lib/useOptimizedImage';

interface OptimizedImageComponentProps extends Omit<ImageProps, 'source'> {
  imageKey: string | undefined;
  options?: OptimizedImageOptions;
  placeholderColor?: string;
  showLoader?: boolean;
}

export const OptimizedImage = React.forwardRef<View, OptimizedImageComponentProps>(
  (
    {
      imageKey,
      options = {},
      placeholderColor = '#f0f0f0',
      showLoader = true,
      style,
      onLoad,
      onError,
      ...props
    },
    ref,
  ) => {
    const optimized = useOptimizedImage(imageKey, options);
    const [loading, setLoading] = useState(!imageKey ? false : true);
    const [error, setError] = useState(false);

    useEffect(() => {
      if (!imageKey) {
        setLoading(false);
        setError(false);
      } else {
        setLoading(true);
        setError(false);
      }
    }, [imageKey]);

    if (!imageKey || !optimized) {
      return (
        <View
          ref={ref}
          style={[
            {
              backgroundColor: placeholderColor,
              justifyContent: 'center',
              alignItems: 'center',
            },
            style,
          ]}
        >
          {showLoader && <ActivityIndicator size="small" />}
        </View>
      );
    }

    const handleLoad = (event: any) => {
      setLoading(false);
      setError(false);
      onLoad?.(event);
    };

    const handleError = (error: any) => {
      setLoading(false);
      setError(true);
      onError?.(error);
    };

    if (error) {
      return (
        <View
          ref={ref}
          style={[
            {
              backgroundColor: placeholderColor,
              justifyContent: 'center',
              alignItems: 'center',
            },
            style,
          ]}
        />
      );
    }

    return (
      <View
        ref={ref}
        style={[
          {
            backgroundColor: placeholderColor,
            justifyContent: 'center',
            alignItems: 'center',
          },
          style,
        ]}
      >
        <Image
          source={{ uri: optimized.webp }}
          style={[
            {
              width: '100%',
              height: '100%',
              position: 'absolute',
            },
          ]}
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
        {loading && showLoader && <ActivityIndicator size="small" />}
      </View>
    );
  },
);

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage;
