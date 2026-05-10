/**
 * Performance Benchmark Utility
 * Load-test resolvers and measure latency, throughput, and error rates
 *
 * Usage:
 * const { benchmark } = require('./performance-benchmark');
 * const results = await benchmark(resolver, 1000, { concurrency: 10 });
 */

const { performance } = require('perf_hooks');

// ============================================
// Benchmark Configuration
// ============================================

const BenchmarkConfig = {
  // Standard test sizes
  SMALL: 100, // Quick smoke test
  MEDIUM: 1000, // Standard load test
  LARGE: 10000, // Sustained load
  STRESS: 50000, // Stress test

  // Concurrency levels
  SERIAL: 1, // One at a time
  LOW: 5, // Light concurrent load
  MEDIUM_CONCURRENT: 20, // Moderate load
  HIGH: 100, // Heavy concurrent load

  // Percentiles
  PERCENTILES: [50, 75, 90, 95, 99],
};

// ============================================
// Benchmark Executor
// ============================================

/**
 * Execute resolver benchmark
 * @param {Function} resolver - Resolver function to test
 * @param {number} iterations - Number of test iterations
 * @param {Object} options - Benchmark options
 * @returns {Promise<Object>} Benchmark results
 */
async function benchmark(resolver, iterations = 1000, options = {}) {
  const {
    concurrency = 10,
    eventGenerator = defaultEventGenerator,
    warmup = true,
    timeoutMs = 30000,
  } = options;

  const results = {
    resolver: resolver.name || 'anonymous',
    config: {
      iterations,
      concurrency,
      warmup,
    },
    metrics: {
      duration: 0,
      throughput: 0,
      latency: {
        min: Infinity,
        max: 0,
        mean: 0,
        median: 0,
        percentiles: {},
      },
      errors: {
        total: 0,
        byType: {},
      },
      success: {
        total: 0,
        rate: 0,
      },
    },
    samples: [],
  };

  // Warmup phase
  if (warmup) {
    console.log('[benchmark] Warming up...');
    for (let i = 0; i < Math.min(10, iterations / 100); i++) {
      const event = eventGenerator();
      try {
        await Promise.race([
          resolver(event),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeoutMs)),
        ]);
      } catch (e) {
        // Warmup errors ignored
      }
    }
  }

  // Main benchmark phase
  console.log(`[benchmark] Running ${iterations} iterations with concurrency ${concurrency}`);

  const startTime = performance.now();
  const latencies = [];
  let completed = 0;
  let errorCount = 0;
  const errorTypes = {};

  // Queue for concurrent execution
  const queue = [];
  for (let i = 0; i < iterations; i++) {
    queue.push(i);
  }

  // Execute with concurrency control
  while (queue.length > 0 || completed < iterations) {
    const batch = [];

    // Fill batch up to concurrency limit
    while (batch.length < concurrency && queue.length > 0) {
      const index = queue.shift();
      batch.push(executeTest(resolver, eventGenerator, latencies, errorTypes));
    }

    // Wait for batch to complete
    const batchResults = await Promise.allSettled(batch);

    batchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        completed++;
        if (result.value.error) {
          errorCount++;
        }
      } else {
        errorCount++;
        const errorType = result.reason?.message || 'unknown';
        errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
      }
    });

    // Progress reporting
    if (completed % Math.max(1, Math.floor(iterations / 10)) === 0) {
      const elapsed = (performance.now() - startTime) / 1000;
      const rate = (completed / elapsed).toFixed(2);
      console.log(`[benchmark] ${completed}/${iterations} (${rate} ops/sec)`);
    }
  }

  const endTime = performance.now();
  const duration = (endTime - startTime) / 1000;

  // Calculate statistics
  latencies.sort((a, b) => a - b);

  results.metrics.duration = duration.toFixed(3);
  results.metrics.throughput = (iterations / duration).toFixed(2);
  results.metrics.latency.min = latencies[0];
  results.metrics.latency.max = latencies[latencies.length - 1];
  results.metrics.latency.mean = (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(
    2,
  );
  results.metrics.latency.median = latencies[Math.floor(latencies.length / 2)];

  // Calculate percentiles
  BenchmarkConfig.PERCENTILES.forEach((p) => {
    const index = Math.floor((p / 100) * latencies.length);
    results.metrics.latency.percentiles[`p${p}`] = latencies[index];
  });

  results.metrics.errors.total = errorCount;
  results.metrics.errors.byType = errorTypes;
  results.metrics.success.total = iterations - errorCount;
  results.metrics.success.rate = (((iterations - errorCount) / iterations) * 100).toFixed(2);

  results.samples = latencies.slice(0, 100); // Store first 100 samples for analysis

  return results;
}

/**
 * Execute single test
 */
async function executeTest(resolver, eventGenerator, latencies, errorTypes) {
  const event = eventGenerator();
  const startTime = performance.now();

  try {
    const result = await resolver(event);
    const latency = performance.now() - startTime;
    latencies.push(latency);
    return { error: false, latency };
  } catch (error) {
    const latency = performance.now() - startTime;
    const errorType = error.message || 'unknown';
    errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
    return { error: true, latency };
  }
}

// ============================================
// Default Event Generator
// ============================================

function defaultEventGenerator() {
  return {
    arguments: {
      input: {
        householdId: `house-${Math.random()}`,
        name: `item-${Math.random()}`,
      },
    },
    identity: {
      claims: {
        sub: `user-${Math.random()}`,
      },
    },
    requestContext: {
      requestId: `req-${Date.now()}`,
    },
  };
}

// ============================================
// Concurrent Load Test
// ============================================

/**
 * Run multiple concurrent benchmarks
 * @param {Function} resolver - Resolver to test
 * @param {Object} loadProfile - Load profile configuration
 * @returns {Promise<Object>} Load test results
 */
async function loadTest(resolver, loadProfile = {}) {
  const {
    duration = 60, // seconds
    rampUp = 10, // seconds to reach full load
    maxConcurrency = 100,
    targetRPS = 1000, // requests per second
  } = loadProfile;

  const results = {
    resolver: resolver.name || 'anonymous',
    loadProfile,
    phases: [],
    summary: {
      totalRequests: 0,
      totalErrors: 0,
      duration: duration,
      avgThroughput: 0,
    },
  };

  console.log(`[load-test] Starting ${duration}s load test (ramp-up: ${rampUp}s)`);

  const startTime = performance.now();
  let totalRequests = 0;
  let totalErrors = 0;
  const latencies = [];

  // Main load test loop
  const testEnd = startTime + duration * 1000;
  let currentPhase = 0;
  const phaseInterval = (rampUp * 1000) / Math.min(10, maxConcurrency); // Divide ramp-up into phases

  let activeRequests = 0;
  let currentConcurrency = 1;
  let phaseStartTime = performance.now();

  while (performance.now() < testEnd) {
    // Ramp up concurrency
    if (performance.now() - phaseStartTime > phaseInterval && currentConcurrency < maxConcurrency) {
      currentConcurrency = Math.min(currentConcurrency + 1, maxConcurrency);
      currentPhase++;

      results.phases.push({
        phase: currentPhase,
        concurrency: currentConcurrency,
        throughput: (totalRequests / ((performance.now() - startTime) / 1000)).toFixed(2),
        errors: totalErrors,
      });

      phaseStartTime = performance.now();
    }

    // Fire requests
    const batch = [];
    for (let i = 0; i < currentConcurrency && performance.now() < testEnd; i++) {
      batch.push(
        executeTest(resolver, defaultEventGenerator, latencies, {})
          .then(() => {
            totalRequests++;
          })
          .catch(() => {
            totalErrors++;
          }),
      );
    }

    await Promise.allSettled(batch);

    // Progress
    if (totalRequests % 100 === 0) {
      const elapsed = (performance.now() - startTime) / 1000;
      console.log(
        `[load-test] ${totalRequests} requests (${(totalRequests / elapsed).toFixed(2)} rps)`,
      );
    }
  }

  const totalDuration = (performance.now() - startTime) / 1000;
  results.summary.totalRequests = totalRequests;
  results.summary.totalErrors = totalErrors;
  results.summary.avgThroughput = (totalRequests / totalDuration).toFixed(2);
  results.summary.errorRate = ((totalErrors / totalRequests) * 100 || 0).toFixed(2);

  return results;
}

// ============================================
// Reporting
// ============================================

function formatBenchmarkResults(results) {
  let output = '\n';
  output += '='.repeat(70) + '\n';
  output += 'RESOLVER PERFORMANCE BENCHMARK\n';
  output += '='.repeat(70) + '\n\n';

  output += `Resolver: ${results.resolver}\n`;
  output += `Iterations: ${results.config.iterations}\n`;
  output += `Concurrency: ${results.config.concurrency}\n\n`;

  // Throughput
  output += 'THROUGHPUT\n';
  output += '-'.repeat(70) + '\n';
  output += `Total Duration: ${results.metrics.duration}s\n`;
  output += `Requests/sec: ${results.metrics.throughput}\n\n`;

  // Latency
  output += 'LATENCY (milliseconds)\n';
  output += '-'.repeat(70) + '\n';
  output += `Min:    ${results.metrics.latency.min.toFixed(2)}ms\n`;
  output += `Mean:   ${results.metrics.latency.mean}ms\n`;
  output += `Median: ${results.metrics.latency.median.toFixed(2)}ms\n`;
  output += `Max:    ${results.metrics.latency.max.toFixed(2)}ms\n`;
  output += `\nPercentiles:\n`;

  Object.entries(results.metrics.latency.percentiles).forEach(([p, value]) => {
    output += `  ${p}: ${value.toFixed(2)}ms\n`;
  });

  output += '\n';

  // Success Rate
  output += 'SUCCESS RATE\n';
  output += '-'.repeat(70) + '\n';
  output += `Successful: ${results.metrics.success.total}/${results.config.iterations}\n`;
  output += `Success Rate: ${results.metrics.success.rate}%\n\n`;

  // Errors
  if (results.metrics.errors.total > 0) {
    output += 'ERRORS\n';
    output += '-'.repeat(70) + '\n';
    output += `Total Errors: ${results.metrics.errors.total}\n`;
    output += `Error Types:\n`;

    Object.entries(results.metrics.errors.byType).forEach(([type, count]) => {
      output += `  ${type}: ${count}\n`;
    });

    output += '\n';
  }

  output += '='.repeat(70) + '\n';

  return output;
}

function formatLoadTestResults(results) {
  let output = '\n';
  output += '='.repeat(70) + '\n';
  output += 'RESOLVER LOAD TEST\n';
  output += '='.repeat(70) + '\n\n';

  output += `Resolver: ${results.resolver}\n`;
  output += `Duration: ${results.loadProfile.duration}s\n`;
  output += `Ramp-up: ${results.loadProfile.rampUp}s\n`;
  output += `Max Concurrency: ${results.loadProfile.maxConcurrency}\n\n`;

  output += 'PHASES\n';
  output += '-'.repeat(70) + '\n';
  results.phases.forEach((phase) => {
    output += `Phase ${phase.phase} (Concurrency: ${phase.concurrency})\n`;
    output += `  Throughput: ${phase.throughput} rps\n`;
    output += `  Errors: ${phase.errors}\n`;
  });

  output += '\nSUMMARY\n';
  output += '-'.repeat(70) + '\n';
  output += `Total Requests: ${results.summary.totalRequests}\n`;
  output += `Average Throughput: ${results.summary.avgThroughput} rps\n`;
  output += `Total Errors: ${results.summary.totalErrors}\n`;
  output += `Error Rate: ${results.summary.errorRate}%\n`;

  output += '='.repeat(70) + '\n';

  return output;
}

// ============================================
// CLI
// ============================================

if (require.main === module) {
  const args = process.argv.slice(2);
  const iterations = parseInt(args[0]) || 1000;
  const concurrency = parseInt(args[1]) || 10;

  console.log(`Performance Benchmark - ${iterations} iterations, ${concurrency} concurrent`);
  console.log(
    "No resolver specified. Use as library: const {benchmark} = require('./performance-benchmark')",
  );
}

// ============================================
// Exports
// ============================================

module.exports = {
  benchmark,
  loadTest,
  formatBenchmarkResults,
  formatLoadTestResults,
  BenchmarkConfig,
  defaultEventGenerator,
};
