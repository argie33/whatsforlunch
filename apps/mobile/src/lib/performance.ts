import { useEffect, useRef } from 'react';
import { useAnalytics } from './posthog';

/**
 * Performance budgets (milliseconds) for W5 Phase C
 */
export const PERFORMANCE_BUDGETS = {
  coldStart: 3000, // App launch to first screen interactive
  screenTransition: 300, // Navigation between screens
  listScroll: 60, // 60fps = 16.67ms per frame
  componentRender: 100, // Individual component render time
  imageLoad: 500, // Image load from network/cache
};

/**
 * Track app cold start time (from app launch to first screen interactive)
 * Call once at root layout mount
 */
export function useColdStartPerformance() {
  const { track } = useAnalytics();
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    // Measure Time to Interactive (TTI)
    const tti = Date.now() - startTimeRef.current;
    track('performance_cold_start', {
      tti_ms: tti,
      budget_exceeded: tti > PERFORMANCE_BUDGETS.coldStart,
      budget_ms: PERFORMANCE_BUDGETS.coldStart,
    });
  }, [track]);
}

/**
 * Track screen transition time
 * Usage:
 * const measure = usePerformanceMarker('dashboard');
 * // ... navigation happens ...
 * measure.end();
 */
export function usePerformanceMarker(screenName: string) {
  const { track } = useAnalytics();
  const startTimeRef = useRef(Date.now());

  return {
    end: () => {
      const duration = Date.now() - startTimeRef.current;
      track('performance_screen_transition', {
        screen: screenName,
        duration_ms: duration,
        budget_exceeded: duration > PERFORMANCE_BUDGETS.screenTransition,
        budget_ms: PERFORMANCE_BUDGETS.screenTransition,
      });
    },
  };
}

/**
 * Measure component render time (for Storybook perf tests)
 */
export function measureComponentRender(componentName: string, fn: () => void) {
  const start = performance.now();
  fn();
  const duration = performance.now() - start;

  return {
    duration_ms: duration,
    budget_exceeded: duration > PERFORMANCE_BUDGETS.componentRender,
    budget_ms: PERFORMANCE_BUDGETS.componentRender,
  };
}

/**
 * List scroll FPS monitor (60fps target = 16.67ms per frame)
 * Integrate with @shopify/flash-list onScroll
 */
export class ScrollPerformanceMonitor {
  private lastFrameTime = 0;
  private frames = 0;
  private droppedFrames = 0;

  onScroll = () => {
    const now = performance.now();
    const frameTime = now - this.lastFrameTime;

    if (frameTime > PERFORMANCE_BUDGETS.listScroll) {
      this.droppedFrames++;
    }
    this.frames++;
    this.lastFrameTime = now;
  };

  getMetrics() {
    const fps = 1000 / (this.lastFrameTime / this.frames);
    return {
      fps: Math.round(fps),
      dropped_frames: this.droppedFrames,
      total_frames: this.frames,
      jank_percentage: (this.droppedFrames / this.frames) * 100,
    };
  }
}

/**
 * Image load time tracking
 * Usage:
 * <FastImage
 *   source={{ uri }}
 *   onLoad={() => trackImageLoad('item_photo', Date.now() - startTime)}
 * />
 */
export function trackImageLoad(imageType: string, loadTimeMs: number) {
  // Will be wired to analytics in Phase B
  return {
    imageType,
    loadTimeMs,
    budget_exceeded: loadTimeMs > PERFORMANCE_BUDGETS.imageLoad,
    budget_ms: PERFORMANCE_BUDGETS.imageLoad,
  };
}
