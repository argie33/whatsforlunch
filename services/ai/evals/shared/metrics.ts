/**
 * Shared evaluation metrics for AI models.
 * Used by all eval scripts to calculate accuracy, calibration, latency, and cost.
 */

export interface EvalResult {
  task: string;
  model: string;
  datasetSize: number;
  accuracy: number; // 0-1
  precision: Record<number, number>; // threshold -> precision
  recall: Record<number, number>; // threshold -> recall
  latencyMs: {
    p50: number;
    p95: number;
    p99: number;
    mean: number;
  };
  cost: {
    totalInputTokens: number;
    totalOutputTokens: number;
    estimatedUsd: number;
  };
  regression: {
    detected: boolean;
    message?: string;
  };
}

export interface ModelCosts {
  haiku: {
    inputTokens: number; // per 1M tokens
    outputTokens: number; // per 1M tokens
    cacheCreationTokens?: number; // per 1M tokens
    cacheReadTokens?: number; // per 1M tokens
  };
  sonnet: {
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens?: number;
    cacheReadTokens?: number;
  };
}

const MODEL_COSTS: ModelCosts = {
  haiku: {
    inputTokens: 0.8,
    outputTokens: 4.0,
    cacheCreationTokens: 4.0,
    cacheReadTokens: 0.1,
  },
  sonnet: {
    inputTokens: 3.0,
    outputTokens: 15.0,
    cacheCreationTokens: 15.0,
    cacheReadTokens: 0.3,
  },
};

export function calculateAccuracy(predictions: boolean[]): number {
  if (predictions.length === 0) return 0;
  const correct = predictions.filter((p) => p).length;
  return correct / predictions.length;
}

export function calculatePrecisionRecall(
  predictions: Array<{ confidence: number; correct: boolean }>,
  thresholds: number[] = [0.5, 0.6, 0.7, 0.8, 0.9],
): {
  precision: Record<number, number>;
  recall: Record<number, number>;
} {
  const precision: Record<number, number> = {};
  const recall: Record<number, number> = {};

  for (const threshold of thresholds) {
    const atThreshold = predictions.filter((p) => p.confidence >= threshold);
    const correctAtThreshold = atThreshold.filter((p) => p.correct).length;

    const totalCorrect = predictions.filter((p) => p.correct).length;

    precision[threshold] = atThreshold.length > 0 ? correctAtThreshold / atThreshold.length : 0;
    recall[threshold] = totalCorrect > 0 ? correctAtThreshold / totalCorrect : 0;
  }

  return { precision, recall };
}

export function calculateLatencyStats(latencies: number[]): {
  p50: number;
  p95: number;
  p99: number;
  mean: number;
} {
  if (latencies.length === 0) {
    return { p50: 0, p95: 0, p99: 0, mean: 0 };
  }

  const sorted = [...latencies].sort((a, b) => a - b);
  const mean = latencies.reduce((a, b) => a + b, 0) / latencies.length;

  return {
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
    mean: Math.round(mean),
  };
}

export function calculateCost(
  model: 'haiku' | 'sonnet',
  inputTokens: number,
  outputTokens: number,
  cacheCreationTokens: number = 0,
  cacheReadTokens: number = 0,
): number {
  const costs = MODEL_COSTS[model];

  const inputCost = (inputTokens / 1_000_000) * costs.inputTokens;
  const outputCost = (outputTokens / 1_000_000) * costs.outputTokens;

  let cacheCost = 0;
  if (cacheCreationTokens > 0 && costs.cacheCreationTokens) {
    cacheCost += (cacheCreationTokens / 1_000_000) * costs.cacheCreationTokens;
  }
  if (cacheReadTokens > 0 && costs.cacheReadTokens) {
    cacheCost += (cacheReadTokens / 1_000_000) * costs.cacheReadTokens;
  }

  return inputCost + outputCost + cacheCost;
}

export function formatEvalReport(result: EvalResult): string {
  const regressionWarning = result.regression.detected ? `⚠️  ${result.regression.message}` : '✓ No regression detected';

  return `
╔══════════════════════════════════════════════════════════╗
║ AI Evaluation Report                                     ║
╚══════════════════════════════════════════════════════════╝

Task:        ${result.task}
Model:       ${result.model}
Dataset:     ${result.datasetSize} examples

📊 Accuracy
   Overall:  ${(result.accuracy * 100).toFixed(2)}%

⏱️  Latency (ms)
   P50:      ${result.latencyMs.p50}
   P95:      ${result.latencyMs.p95}
   P99:      ${result.latencyMs.p99}
   Mean:     ${result.latencyMs.mean}

💰 Cost
   Input:    ${result.cost.totalInputTokens.toLocaleString()} tokens
   Output:   ${result.cost.totalOutputTokens.toLocaleString()} tokens
   USD:      $${result.cost.estimatedUsd.toFixed(4)}

📈 Regression Check
   ${regressionWarning}
`;
}
