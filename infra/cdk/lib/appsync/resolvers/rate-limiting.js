// Rate Limiting Middleware
// Protect resolvers from abuse and overload

/**
 * Token bucket rate limiter
 * Classic algorithm for distributed rate limiting
 */
class TokenBucket {
  constructor(capacity = 100, refillRate = 10) {
    this.capacity = capacity; // Max tokens
    this.refillRate = refillRate; // Tokens per second
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  /**
   * Check if request is allowed
   */
  allowRequest(tokensNeeded = 1) {
    this.refill();

    if (this.tokens >= tokensNeeded) {
      this.tokens -= tokensNeeded;
      return {
        allowed: true,
        tokensRemaining: Math.floor(this.tokens),
        resetAt: this.getResetTime(),
      };
    }

    return {
      allowed: false,
      tokensRemaining: Math.floor(this.tokens),
      resetAt: this.getResetTime(),
    };
  }

  /**
   * Refill tokens based on elapsed time
   */
  refill() {
    const now = Date.now();
    const secondsElapsed = (now - this.lastRefill) / 1000;
    const tokensToAdd = secondsElapsed * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Get time until bucket is full
   */
  getResetTime() {
    const tokensNeeded = this.capacity - this.tokens;
    const secondsUntilFull = tokensNeeded / this.refillRate;
    return new Date(Date.now() + secondsUntilFull * 1000);
  }
}

/**
 * Sliding window rate limiter
 * More precise than token bucket
 */
class SlidingWindowLimiter {
  constructor(windowSizeSeconds = 60, maxRequests = 100) {
    this.windowSize = windowSizeSeconds * 1000; // Convert to ms
    this.maxRequests = maxRequests;
    this.requests = [];
  }

  /**
   * Check if request is allowed
   */
  allowRequest(userId) {
    const now = Date.now();
    const windowStart = now - this.windowSize;

    // Remove old requests outside window
    this.requests = this.requests.filter((req) => req.timestamp > windowStart);

    if (this.requests.length >= this.maxRequests) {
      // Find oldest request to calculate reset time
      const oldestRequest = this.requests[0];
      const resetAt = new Date(oldestRequest.timestamp + this.windowSize);

      return {
        allowed: false,
        requestCount: this.requests.length,
        resetAt,
      };
    }

    // Add new request
    this.requests.push({
      userId,
      timestamp: now,
    });

    return {
      allowed: true,
      requestCount: this.requests.length + 1,
      maxRequests: this.maxRequests,
    };
  }
}

/**
 * Per-user rate limiter
 * Track limits per user ID
 */
class PerUserRateLimiter {
  constructor(defaultCapacity = 100, refillRate = 10) {
    this.buckets = new Map();
    this.defaultCapacity = defaultCapacity;
    this.defaultRefillRate = refillRate;
  }

  /**
   * Get or create bucket for user
   */
  getBucket(userId) {
    if (!this.buckets.has(userId)) {
      this.buckets.set(
        userId,
        new TokenBucket(this.defaultCapacity, this.defaultRefillRate)
      );
    }
    return this.buckets.get(userId);
  }

  /**
   * Check if user's request is allowed
   */
  allowRequest(userId, tokensNeeded = 1) {
    const bucket = this.getBucket(userId);
    return bucket.allowRequest(tokensNeeded);
  }

  /**
   * Set custom limits for specific user
   */
  setLimits(userId, capacity, refillRate) {
    this.buckets.set(userId, new TokenBucket(capacity, refillRate));
  }

  /**
   * Reset user's bucket
   */
  reset(userId) {
    this.buckets.delete(userId);
  }
}

/**
 * Resolver rate limiting decorator
 */
function withRateLimit(limiter, tokensPerRequest = 1) {
  return (resolver) => {
    return async (event) => {
      const userId = event.identity?.claims?.sub || event.identity?.sourceIp || 'anonymous';

      const rateLimitCheck = limiter.allowRequest(userId, tokensPerRequest);

      if (!rateLimitCheck.allowed) {
        return {
          errorType: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          resetAt: rateLimitCheck.resetAt,
        };
      }

      // Add rate limit info to response headers
      event.rateLimitInfo = {
        remaining: rateLimitCheck.tokensRemaining,
        resetAt: rateLimitCheck.resetAt,
      };

      return resolver(event);
    };
  };
}

/**
 * Resolver-specific rate limits
 */
const ResolverLimits = {
  // Write operations (expensive)
  createItem: { capacity: 50, refillRate: 5 }, // 50 per 10 sec
  bulkCreateItems: { capacity: 20, refillRate: 2 }, // 20 per 10 sec
  updateItem: { capacity: 100, refillRate: 10 },
  deleteItem: { capacity: 50, refillRate: 5 },

  // Read operations (cheaper)
  listItems: { capacity: 200, refillRate: 20 }, // 200 per 10 sec
  searchItems: { capacity: 100, refillRate: 10 },
  itemsExpiringSoon: { capacity: 150, refillRate: 15 },
  deltaSync: { capacity: 100, refillRate: 10 },

  // Household operations
  inviteToHousehold: { capacity: 20, refillRate: 2 },
  createHousehold: { capacity: 10, refillRate: 1 },

  // Account operations
  deleteAccount: { capacity: 1, refillRate: 0.1 }, // 1 per 10 seconds
  exportData: { capacity: 5, refillRate: 0.5 },
};

/**
 * Rate limit statistics
 */
class RateLimitStats {
  constructor() {
    this.blocked = 0;
    this.allowed = 0;
    this.peakRate = 0;
    this.lastResetTime = Date.now();
  }

  recordBlocked() {
    this.blocked++;
  }

  recordAllowed() {
    this.allowed++;
  }

  getCurrentRate() {
    const elapsedSeconds = (Date.now() - this.lastResetTime) / 1000;
    return elapsedSeconds > 0 ? this.allowed / elapsedSeconds : 0;
  }

  recordPeak() {
    const currentRate = this.getCurrentRate();
    if (currentRate > this.peakRate) {
      this.peakRate = currentRate;
    }
  }

  summary() {
    return {
      blocked: this.blocked,
      allowed: this.allowed,
      blockRate: `${((this.blocked / (this.blocked + this.allowed)) * 100).toFixed(2)}%`,
      currentRate: `${this.getCurrentRate().toFixed(2)} req/s`,
      peakRate: `${this.peakRate.toFixed(2)} req/s`,
    };
  }

  reset() {
    this.blocked = 0;
    this.allowed = 0;
    this.lastResetTime = Date.now();
  }
}

module.exports = {
  TokenBucket,
  SlidingWindowLimiter,
  PerUserRateLimiter,
  withRateLimit,
  ResolverLimits,
  RateLimitStats,
};
