import React, { useRef, useEffect } from 'react';
import LottieView from 'lottie-react-native';
import { useReduceMotion } from '@/lib/accessibility';

type LottieSource = Parameters<typeof LottieView>[0]['source'];

interface LottiePlayerProps {
  source: LottieSource;
  loop?: boolean;
  autoPlay?: boolean;
  style?: React.ComponentProps<typeof LottieView>['style'];
  onAnimationFinish?: () => void;
  speed?: number;
}

export function LottiePlayer({
  source,
  loop = true,
  autoPlay = true,
  style,
  onAnimationFinish,
  speed = 1,
}: LottiePlayerProps) {
  const ref = useRef<LottieView>(null);
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (!ref.current) return;
    if (reduceMotion) {
      ref.current.pause();
    } else if (autoPlay) {
      ref.current.play();
    }
  }, [reduceMotion, autoPlay]);

  if (reduceMotion) {
    return null;
  }

  return (
    <LottieView
      ref={ref}
      source={source}
      loop={loop}
      autoPlay={autoPlay}
      speed={speed}
      style={style}
      onAnimationFinish={onAnimationFinish}
      accessible={false}
    />
  );
}
