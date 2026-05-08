export interface EventData {
  [key: string]: any;
}

export interface PageViewData {
  page: string;
  title?: string;
  referrer?: string;
}

export interface UserData {
  id: string;
  email?: string;
  name?: string;
  [key: string]: any;
}

class Analytics {
  private enabled = true;
  private endpoint = '/api/analytics';
  private sessionId = this.generateSessionId();
  private userId: string | null = null;

  initialize(userId?: string): void {
    this.userId = userId || null;
    this.trackPageView();
    this.setupAutoTracking();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  setUser(userData: UserData): void {
    this.userId = userData.id;
    this.trackEvent('user_set', userData);
  }

  trackEvent(eventName: string, data?: EventData): void {
    if (!this.enabled) return;

    const event = {
      name: eventName,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId,
      data,
      url: typeof window !== 'undefined' ? window.location.href : '',
    };

    this.send(event);
    console.debug('Analytics event:', event);
  }

  trackPageView(data?: PageViewData): void {
    if (!this.enabled) return;

    const pageData = data || {
      page: typeof window !== 'undefined' ? window.location.pathname : '',
      title: typeof document !== 'undefined' ? document.title : '',
    };

    this.trackEvent('page_view', pageData);
  }

  trackError(error: Error, context?: EventData): void {
    if (!this.enabled) return;

    this.trackEvent('error', {
      message: error.message,
      stack: error.stack,
      context,
    });
  }

  trackTiming(name: string, duration: number, category?: string): void {
    if (!this.enabled) return;

    this.trackEvent('timing', {
      name,
      duration,
      category,
    });
  }

  trackConversion(conversionName: string, value?: number, metadata?: EventData): void {
    if (!this.enabled) return;

    this.trackEvent('conversion', {
      name: conversionName,
      value,
      metadata,
    });
  }

  private setupAutoTracking(): void {
    if (typeof window === 'undefined') return;

    // Track visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackEvent('app_backgrounded');
      } else {
        this.trackEvent('app_foregrounded');
      }
    });

    // Track navigation
    if (typeof history !== 'undefined' && history.pushState) {
      const originalPushState = history.pushState;
      history.pushState = function (...args) {
        originalPushState.apply(history, args);
        setTimeout(() => {
          this.trackPageView();
        }, 0);
        return undefined;
      };
    }
  }

  private send(event: any): void {
    if (typeof fetch === 'undefined') return;

    fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    }).catch(() => {
      // Silently fail
    });
  }

  disable(): void {
    this.enabled = false;
  }

  enable(): void {
    this.enabled = true;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

export const analytics = new Analytics();

// Performance monitoring
export class PerformanceMonitor {
  private marks = new Map<string, number>();
  private measurements = new Map<string, number>();

  mark(name: string): void {
    this.marks.set(name, performance.now());
  }

  measure(name: string, startMark: string, endMark?: string): number {
    const startTime = this.marks.get(startMark);
    if (!startTime) return 0;

    const endTime = this.marks.get(endMark || '') || performance.now();
    const duration = endTime - startTime;

    this.measurements.set(name, duration);
    analytics.trackTiming(name, duration);

    return duration;
  }

  getMetrics() {
    return {
      marks: Object.fromEntries(this.marks),
      measurements: Object.fromEntries(this.measurements),
      navigationTiming: this.getNavigationMetrics(),
      paintTiming: this.getPaintMetrics(),
      resourceMetrics: this.getResourceMetrics(),
    };
  }

  private getNavigationMetrics() {
    if (typeof window === 'undefined' || !window.performance) return null;

    const timing = performance.timing;
    if (!timing) return null;

    return {
      domContentLoaded: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
      loadComplete: timing.loadEventEnd - timing.loadEventStart,
      pageLoad: timing.loadEventEnd - timing.navigationStart,
      timeToFirstByte: timing.responseStart - timing.navigationStart,
    };
  }

  private getPaintMetrics() {
    if (typeof window === 'undefined' || !window.performance) return null;

    const paintEntries = performance.getEntriesByType('paint');
    const metrics: Record<string, number> = {};

    paintEntries.forEach((entry) => {
      metrics[entry.name] = entry.startTime;
    });

    return metrics;
  }

  private getResourceMetrics() {
    if (typeof window === 'undefined' || !window.performance) return null;

    const resources = performance.getEntriesByType('resource');
    return {
      count: resources.length,
      totalDuration: resources.reduce((sum, r) => sum + r.duration, 0),
      avgDuration: resources.reduce((sum, r) => sum + r.duration, 0) / resources.length,
    };
  }

  clear(): void {
    this.marks.clear();
    this.measurements.clear();
  }
}

export const performanceMonitor = new PerformanceMonitor();

export function trackComponentRender(componentName: string): () => void {
  const startTime = performance.now();

  return () => {
    const duration = performance.now() - startTime;
    analytics.trackTiming(`component_render_${componentName}`, duration);
  };
}

export function trackAsyncOperation<T>(
  operationName: string,
  operation: () => Promise<T>,
): Promise<T> {
  const startTime = performance.now();

  return operation()
    .then((result) => {
      const duration = performance.now() - startTime;
      analytics.trackTiming(`async_${operationName}`, duration);
      return result;
    })
    .catch((error) => {
      const duration = performance.now() - startTime;
      analytics.trackTiming(`async_${operationName}_error`, duration);
      analytics.trackError(error as Error, { operation: operationName });
      throw error;
    });
}
