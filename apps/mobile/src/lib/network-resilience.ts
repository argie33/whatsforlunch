// Network info stub for local testing - in production, use @react-native-community/netinfo
const NetInfo = {
  addEventListener: (callback: (state: any) => void) => {
    // Return unsubscribe function
    return () => {};
  },
  fetch: async () => ({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  }),
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  timeoutMs?: number;
  onRetry?: (attempt: number, error: Error) => void;
  onTimeout?: () => void;
}

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
}

// ─── Network Status ───────────────────────────────────────────────────────────

export class NetworkMonitor {
  private static instance: NetworkMonitor;
  private state: NetworkState = {
    isConnected: true,
    isInternetReachable: true,
    type: 'unknown',
  };
  private listeners: Set<(state: NetworkState) => void> = new Set();

  private constructor() {
    this.initialize();
  }

  static getInstance(): NetworkMonitor {
    if (!NetworkMonitor.instance) {
      NetworkMonitor.instance = new NetworkMonitor();
    }
    return NetworkMonitor.instance;
  }

  private initialize() {
    try {
      // Subscribe to network state changes
      NetInfo.addEventListener((state: any) => {
        this.state = {
          isConnected: state.isConnected ?? true,
          isInternetReachable: state.isInternetReachable,
          type: state.type ?? 'unknown',
        };
        console.log('[NetworkMonitor] Network state changed:', this.state);
        this.notifyListeners();
      });

      // Get initial state
      NetInfo.fetch().then((state) => {
        this.state = {
          isConnected: state.isConnected ?? true,
          isInternetReachable: state.isInternetReachable,
          type: state.type ?? 'unknown',
        };
      });
    } catch (err) {
      console.warn('[NetworkMonitor] Failed to initialize NetInfo:', err);
    }
  }

  getState(): NetworkState {
    return this.state;
  }

  isOnline(): boolean {
    return this.state.isConnected && this.state.isInternetReachable !== false;
  }

  subscribe(listener: (state: NetworkState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.state);
      } catch (err) {
        console.error('[NetworkMonitor] Listener error:', err);
      }
    });
  }
}

// ─── Retry Logic ──────────────────────────────────────────────────────────────

export class NetworkRetry {
  static async withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {},
  ): Promise<T> {
    const {
      maxRetries = 3,
      initialDelayMs = 500,
      maxDelayMs = 4000,
      backoffMultiplier = 2,
      timeoutMs = 10000,
      onRetry,
      onTimeout,
    } = options;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Check if online before attempting
        if (attempt > 0 && !NetworkMonitor.getInstance().isOnline()) {
          throw new Error('Device is offline');
        }

        // Execute with timeout
        const result = await this.executeWithTimeout(fn, timeoutMs);
        return result;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        // Don't retry on non-recoverable errors
        if (this.isNonRecoverable(lastError)) {
          throw lastError;
        }

        // Last attempt failed, throw
        if (attempt === maxRetries) {
          throw lastError;
        }

        // Calculate backoff delay
        const delayMs = Math.min(
          initialDelayMs * Math.pow(backoffMultiplier, attempt),
          maxDelayMs,
        );

        console.warn(
          `[NetworkRetry] Attempt ${attempt + 1}/${maxRetries} failed (${lastError.message}), retrying in ${delayMs}ms`,
        );

        if (onRetry) {
          onRetry(attempt + 1, lastError);
        }

        // Wait before retrying
        await this.delay(delayMs);
      }
    }

    throw lastError ?? new Error('Unknown error');
  }

  private static async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    let timeoutId: NodeJS.Timeout;

    return Promise.race([
      fn(),
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`Request timeout after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]).finally(() => {
      if (timeoutId) clearTimeout(timeoutId);
    });
  }

  private static isNonRecoverable(error: Error): boolean {
    const message = error.message.toLowerCase();

    // Non-recoverable errors
    const nonRecoverable = [
      'unauthorized',
      'forbidden',
      'authentication failed',
      'invalid token',
      'not found',
      'bad request',
      'validation error',
    ];

    return nonRecoverable.some((keyword) => message.includes(keyword));
  }

  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ─── Request Deduplication ────────────────────────────────────────────────────

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

export class RequestDeduplicator {
  private static instance: RequestDeduplicator;
  private pending = new Map<string, PendingRequest<any>>();
  private readonly ttlMs = 5000; // 5 second cache for identical requests

  private constructor() {}

  static getInstance(): RequestDeduplicator {
    if (!RequestDeduplicator.instance) {
      RequestDeduplicator.instance = new RequestDeduplicator();
    }
    return RequestDeduplicator.instance;
  }

  async execute<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // Check for pending request with same key
    const pending = this.pending.get(key);
    if (pending) {
      const age = Date.now() - pending.timestamp;
      if (age < this.ttlMs) {
        console.log(`[RequestDeduplicator] Returning cached result for ${key}`);
        return pending.promise;
      } else {
        // Remove stale request
        this.pending.delete(key);
      }
    }

    // Execute new request and store promise
    const promise = fn();
    this.pending.set(key, {
      promise,
      timestamp: Date.now(),
    });

    try {
      const result = await promise;
      return result;
    } finally {
      // Clean up after short TTL
      setTimeout(() => {
        this.pending.delete(key);
      }, this.ttlMs);
    }
  }

  clear() {
    this.pending.clear();
  }
}

// ─── Graceful Degradation ─────────────────────────────────────────────────────

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

export class LocalCache {
  private static instance: LocalCache;
  private cache = new Map<string, CacheEntry<any>>();

  private constructor() {}

  static getInstance(): LocalCache {
    if (!LocalCache.instance) {
      LocalCache.instance = new LocalCache();
    }
    return LocalCache.instance;
  }

  set<T>(key: string, data: T, ttlMs = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttlMs,
    });
    console.log(`[LocalCache] Cached: ${key}`);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > entry.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    console.log(`[LocalCache] Hit: ${key} (age: ${age}ms)`);
    return entry.data as T;
  }

  clear() {
    this.cache.clear();
  }
}

// ─── GraphQL Error Categorization ─────────────────────────────────────────────

export function categorizeGraphQLError(error: any): 'timeout' | 'network' | 'validation' | 'server' {
  if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
    return 'timeout';
  }

  if (
    error.message?.includes('Network') ||
    error.message?.includes('offline') ||
    error.message?.includes('Failed to fetch')
  ) {
    return 'network';
  }

  if (
    error.graphQLErrors?.some(
      (e: any) => e.extensions?.code === 'BAD_USER_INPUT' || e.message?.includes('validation'),
    )
  ) {
    return 'validation';
  }

  return 'server';
}

// ─── User-Facing Error Messages ───────────────────────────────────────────────

export function getErrorMessage(error: any): string {
  const category = categorizeGraphQLError(error);

  switch (category) {
    case 'timeout':
      return 'Request took too long. Please check your connection and try again.';
    case 'network':
      return 'Network connection error. Please check your internet and try again.';
    case 'validation':
      return 'Invalid request. Please check your input and try again.';
    case 'server':
      return 'Server error. Please try again in a moment.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
