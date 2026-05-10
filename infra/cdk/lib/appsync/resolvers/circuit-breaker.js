// Circuit Breaker Pattern
// Fault tolerance for external service calls

/**
 * Circuit Breaker States
 */
const CircuitState = {
  CLOSED: 'closed', // Normal operation
  OPEN: 'open', // Failing, reject requests
  HALF_OPEN: 'half-open', // Testing recovery
};

/**
 * Circuit Breaker for protecting against cascading failures
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 60000; // 60 seconds
    this.lastFailureTime = null;
    this.name = options.name || 'CircuitBreaker';
  }

  /**
   * Execute function through circuit breaker
   */
  async execute(fn) {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
        console.log(`[circuit-breaker] ${this.name}: Attempting recovery (HALF_OPEN)`);
      } else {
        throw new Error(
          `Circuit breaker ${this.name} is OPEN. Retry after ${this.getRetryAfter()}ms`
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Check if enough time has passed to attempt reset
   */
  shouldAttemptReset() {
    if (!this.lastFailureTime) {
      return true;
    }
    return Date.now() - this.lastFailureTime >= this.timeout;
  }

  /**
   * Get milliseconds until next retry
   */
  getRetryAfter() {
    if (!this.lastFailureTime) {
      return 0;
    }
    const elapsed = Date.now() - this.lastFailureTime;
    return Math.max(0, this.timeout - elapsed);
  }

  /**
   * Handle successful execution
   */
  onSuccess() {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= this.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
        console.log(`[circuit-breaker] ${this.name}: Recovered (CLOSED)`);
      }
    }
  }

  /**
   * Handle failed execution
   */
  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.successCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      console.log(`[circuit-breaker] ${this.name}: Recovery failed, reopening (OPEN)`);
    } else if (this.failureCount >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
      console.log(
        `[circuit-breaker] ${this.name}: Failure threshold reached, opening circuit (OPEN)`
      );
    }
  }

  /**
   * Get current state
   */
  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      retryAfter: this.getRetryAfter(),
    };
  }

  /**
   * Reset breaker
   */
  reset() {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    console.log(`[circuit-breaker] ${this.name}: Reset`);
  }
}

/**
 * Breaker pool for managing multiple breakers
 */
class CircuitBreakerPool {
  constructor() {
    this.breakers = new Map();
  }

  /**
   * Get or create breaker for a service
   */
  getBreaker(serviceName, options = {}) {
    if (!this.breakers.has(serviceName)) {
      this.breakers.set(serviceName, new CircuitBreaker({ ...options, name: serviceName }));
    }
    return this.breakers.get(serviceName);
  }

  /**
   * Execute through named breaker
   */
  async execute(serviceName, fn, options = {}) {
    const breaker = this.getBreaker(serviceName, options);
    return breaker.execute(fn);
  }

  /**
   * Get all breaker states
   */
  getAllStates() {
    const states = {};
    for (const [name, breaker] of this.breakers) {
      states[name] = breaker.getState();
    }
    return states;
  }

  /**
   * Reset specific breaker
   */
  resetBreaker(serviceName) {
    const breaker = this.breakers.get(serviceName);
    if (breaker) {
      breaker.reset();
    }
  }

  /**
   * Reset all breakers
   */
  resetAll() {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
}

module.exports = {
  CircuitState,
  CircuitBreaker,
  CircuitBreakerPool,
};
