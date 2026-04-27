// Observability & Monitoring
// Metrics, logging, and performance tracking

/**
 * Metrics collector for resolvers
 */
class MetricsCollector {
  constructor() {
    this.metrics = new Map();
    this.timers = new Map();
  }

  /**
   * Start timing a resolver
   */
  startTimer(resolverId) {
    this.timers.set(resolverId, {
      startTime: Date.now(),
      startMemory: process.memoryUsage().heapUsed,
    });
  }

  /**
   * End timer and record metrics
   */
  endTimer(resolverId, success = true) {
    const timer = this.timers.get(resolverId);
    if (!timer) {
      return null;
    }

    const duration = Date.now() - timer.startTime;
    const memoryUsed = process.memoryUsage().heapUsed - timer.startMemory;

    const metric = {
      resolverId,
      duration,
      memoryUsed,
      success,
      timestamp: new Date().toISOString(),
    };

    // Store metric
    if (!this.metrics.has(resolverId)) {
      this.metrics.set(resolverId, []);
    }
    this.metrics.get(resolverId).push(metric);

    this.timers.delete(resolverId);
    return metric;
  }

  /**
   * Get metrics for a resolver
   */
  getMetrics(resolverId) {
    return this.metrics.get(resolverId) || [];
  }

  /**
   * Get aggregated stats for a resolver
   */
  getStats(resolverId) {
    const metrics = this.getMetrics(resolverId);

    if (metrics.length === 0) {
      return null;
    }

    const durations = metrics.map((m) => m.duration);
    const memoryUsages = metrics.map((m) => m.memoryUsed);
    const successCount = metrics.filter((m) => m.success).length;

    const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const min = (arr) => Math.min(...arr);
    const max = (arr) => Math.max(...arr);
    const p95 = (arr) => {
      const sorted = [...arr].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length * 0.95)];
    };

    return {
      resolverId,
      requestCount: metrics.length,
      successRate: `${((successCount / metrics.length) * 100).toFixed(2)}%`,
      duration: {
        min: min(durations),
        max: max(durations),
        avg: Math.floor(avg(durations)),
        p95: Math.floor(p95(durations)),
      },
      memory: {
        min: Math.floor(min(memoryUsages)),
        max: Math.floor(max(memoryUsages)),
        avg: Math.floor(avg(memoryUsages)),
      },
    };
  }

  /**
   * Get all metrics summary
   */
  summary() {
    const summary = {};
    for (const [resolverId] of this.metrics) {
      summary[resolverId] = this.getStats(resolverId);
    }
    return summary;
  }

  /**
   * Clear metrics
   */
  clear() {
    this.metrics.clear();
    this.timers.clear();
  }
}

/**
 * Structured logging helper
 */
class Logger {
  constructor(context = {}) {
    this.context = context;
  }

  /**
   * Format log entry with structured data
   */
  format(level, message, data = {}) {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.context,
      ...data,
    };
  }

  debug(message, data) {
    console.log(JSON.stringify(this.format('DEBUG', message, data)));
  }

  info(message, data) {
    console.log(JSON.stringify(this.format('INFO', message, data)));
  }

  warn(message, data) {
    console.warn(JSON.stringify(this.format('WARN', message, data)));
  }

  error(message, data) {
    console.error(JSON.stringify(this.format('ERROR', message, data)));
  }

  /**
   * Log resolver invocation
   */
  logResolverInvocation(resolverId, userId, householdId, args) {
    this.info('Resolver invoked', {
      resolverId,
      userId,
      householdId,
      argsKeys: Object.keys(args || {}),
    });
  }

  /**
   * Log resolver completion
   */
  logResolverCompletion(resolverId, duration, success = true) {
    const level = success ? 'info' : 'error';
    this[level]('Resolver completed', {
      resolverId,
      duration,
      success,
    });
  }

  /**
   * Log error with context
   */
  logError(resolverId, error, context = {}) {
    this.error('Resolver error', {
      resolverId,
      errorType: error.name,
      errorMessage: error.message,
      errorStack: error.stack?.split('\n').slice(0, 3),
      ...context,
    });
  }
}

/**
 * Performance tracer
 */
class PerformanceTracer {
  constructor(logger) {
    this.logger = logger;
    this.traces = [];
  }

  /**
   * Trace a function execution
   */
  async trace(name, fn, data = {}) {
    const start = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    try {
      const result = await fn();
      const duration = Date.now() - start;
      const memoryUsed = process.memoryUsage().heapUsed - startMemory;

      const trace = {
        name,
        duration,
        memoryUsed,
        success: true,
        timestamp: new Date().toISOString(),
        ...data,
      };

      this.traces.push(trace);
      this.logger.debug(`Trace: ${name}`, trace);

      return result;
    } catch (error) {
      const duration = Date.now() - start;

      const trace = {
        name,
        duration,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        ...data,
      };

      this.traces.push(trace);
      this.logger.error(`Trace failed: ${name}`, trace);

      throw error;
    }
  }

  /**
   * Get traces
   */
  getTraces() {
    return this.traces;
  }

  /**
   * Clear traces
   */
  clear() {
    this.traces = [];
  }
}

/**
 * Health check reporter
 */
class HealthChecker {
  constructor() {
    this.checks = new Map();
  }

  /**
   * Register a health check
   */
  register(name, checkFn) {
    this.checks.set(name, checkFn);
  }

  /**
   * Run all health checks
   */
  async runAll() {
    const results = {};

    for (const [name, checkFn] of this.checks) {
      try {
        const result = await Promise.race([
          checkFn(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000)),
        ]);

        results[name] = {
          status: result ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        results[name] = {
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString(),
        };
      }
    }

    return results;
  }

  /**
   * Overall health status
   */
  async getStatus() {
    const checks = await this.runAll();
    const healthy = Object.values(checks).every((c) => c.status === 'healthy');

    return {
      status: healthy ? 'healthy' : 'unhealthy',
      checks,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Monitoring middleware for resolvers
 */
function withMonitoring(metrics, logger, resolverId) {
  return (resolver) => {
    return async (event) => {
      const userId = event.identity?.claims?.sub || 'anonymous';

      metrics.startTimer(resolverId);
      logger.logResolverInvocation(resolverId, userId, event.arguments?.householdId, event.arguments);

      try {
        const result = await resolver(event);
        const metric = metrics.endTimer(resolverId, !result?.errorType);

        logger.logResolverCompletion(resolverId, metric?.duration, !result?.errorType);

        return result;
      } catch (error) {
        metrics.endTimer(resolverId, false);
        logger.logError(resolverId, error, {
          userId,
          arguments: event.arguments,
        });

        throw error;
      }
    };
  };
}

module.exports = {
  MetricsCollector,
  Logger,
  PerformanceTracer,
  HealthChecker,
  withMonitoring,
};
