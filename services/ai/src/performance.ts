/**
 * Performance profiling utilities for AI Lambdas.
 * Measures latency, throughput, and identifies bottlenecks.
 */

export interface LatencyMetrics {
  min: number;
  max: number;
  mean: number;
  p50: number;
  p95: number;
  p99: number;
  stdDev: number;
}

export interface ThroughputMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  requestsPerSecond: number;
  avgLatencyMs: number;
}

export class PerformanceProfiler {
  private measurements: number[] = [];
  private startTime: number = 0;
  private requestCount: number = 0;
  private errorCount: number = 0;

  constructor(private label: string = 'Lambda') {}

  start(): void {
    this.startTime = performance.now();
  }

  end(): number {
    const duration = performance.now() - this.startTime;
    this.measurements.push(duration);
    this.requestCount++;
    return duration;
  }

  recordError(): void {
    this.errorCount++;
  }

  getLatencyMetrics(): LatencyMetrics {
    if (this.measurements.length === 0) {
      return {
        min: 0,
        max: 0,
        mean: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        stdDev: 0,
      };
    }

    const sorted = [...this.measurements].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const mean = sum / sorted.length;

    const variance = sorted.reduce((sum, val) => sum + (val - mean) ** 2, 0) / sorted.length;
    const stdDev = Math.sqrt(variance);

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      stdDev,
    };
  }

  getThroughputMetrics(durationSeconds: number): ThroughputMetrics {
    return {
      totalRequests: this.requestCount,
      successfulRequests: this.requestCount - this.errorCount,
      failedRequests: this.errorCount,
      requestsPerSecond: this.requestCount / durationSeconds,
      avgLatencyMs: this.measurements.length > 0
        ? this.measurements.reduce((a, b) => a + b, 0) / this.measurements.length
        : 0,
    };
  }

  report(): string {
    const latency = this.getLatencyMetrics();
    return `
Performance Report: ${this.label}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Latency (ms):
  Min:     ${latency.min.toFixed(2)}
  Mean:    ${latency.mean.toFixed(2)}
  P50:     ${latency.p50.toFixed(2)}
  P95:     ${latency.p95.toFixed(2)}
  P99:     ${latency.p99.toFixed(2)}
  Max:     ${latency.max.toFixed(2)}
  StdDev:  ${latency.stdDev.toFixed(2)}

Requests: ${this.requestCount}
Errors:   ${this.errorCount}
Success:  ${this.requestCount - this.errorCount}
    `;
  }

  clear(): void {
    this.measurements = [];
    this.requestCount = 0;
    this.errorCount = 0;
  }
}

// Target benchmarks for each Lambda
export const PERFORMANCE_TARGETS = {
  'classify-food': {
    p95LatencyMs: 3000,
    p99LatencyMs: 5000,
    minSuccessRate: 0.98,
  },
  'ocr-expiry-date': {
    p95LatencyMs: 2000,
    p99LatencyMs: 4000,
    minSuccessRate: 0.98,
  },
  'image-resize': {
    p95LatencyMs: 10000,
    p99LatencyMs: 15000,
    minSuccessRate: 0.99,
  },
};

export function validatePerformance(
  lambdaName: keyof typeof PERFORMANCE_TARGETS,
  metrics: LatencyMetrics,
  successRate: number,
): { passed: boolean; violations: string[] } {
  const targets = PERFORMANCE_TARGETS[lambdaName];
  const violations: string[] = [];

  if (metrics.p95 > targets.p95LatencyMs) {
    violations.push(`P95 latency ${metrics.p95.toFixed(0)}ms exceeds target ${targets.p95LatencyMs}ms`);
  }

  if (metrics.p99 > targets.p99LatencyMs) {
    violations.push(`P99 latency ${metrics.p99.toFixed(0)}ms exceeds target ${targets.p99LatencyMs}ms`);
  }

  if (successRate < targets.minSuccessRate) {
    violations.push(`Success rate ${(successRate * 100).toFixed(1)}% below target ${(targets.minSuccessRate * 100).toFixed(1)}%`);
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}
