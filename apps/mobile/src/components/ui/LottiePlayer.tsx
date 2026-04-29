import React, { useRef, useEffect } from 'react';
import LottieView, { type LottieViewProps } from 'lottie-react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useReduceMotion } from '@/lib/accessibility';

type LottieSource = LottieViewProps['source'];

// LottieView is a class component whose internal Props type has a resolution quirk
// with some TypeScript configs — cast to a functional component type to get clean props.
const LottieComponent = LottieView as unknown as React.ComponentClass<
  LottieViewProps & { accessible?: boolean }
>;

interface LottiePlayerProps {
  source: LottieSource;
  loop?: boolean;
  autoPlay?: boolean;
  style?: StyleProp<ViewStyle>;
  onAnimationFinish?: () => void;
  speed?: number;
  accessible?: boolean;
}

export function LottiePlayer({
  source,
  loop = true,
  autoPlay = true,
  style,
  onAnimationFinish,
  speed = 1,
  accessible = false,
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
    <LottieComponent
      ref={ref as React.Ref<LottieView>}
      source={source}
      loop={loop}
      autoPlay={autoPlay}
      speed={speed}
      style={style}
      onAnimationFinish={onAnimationFinish}
      accessible={accessible}
    />
  );
}
