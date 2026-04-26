/**
 * Evaluation script for expiry date OCR model.
 *
 * Loads labeled packaging photos from ground-truth.csv and tests:
 * - Date extraction accuracy
 * - Confidence calibration
 * - Latency (target: < 2s)
 * - Cost per classification
 *
 * Run: pnpm ai:eval ocr-expiry-date
 */

import fs from 'fs';
import path from 'path';
import { calculateAccuracy, calculatePrecisionRecall, calculateLatencyStats, calculateCost, formatEvalReport, EvalResult } from '../shared/metrics';

interface GroundTruth {
  photoPath: string;
  expectedDate: string;
  confidence: number;
}

async function loadGroundTruth(): Promise<GroundTruth[]> {
  const csvPath = path.join(__dirname, 'ground-truth.csv');

  if (!fs.existsSync(csvPath)) {
    console.warn(`⚠️  ground-truth.csv not found at ${csvPath}`);
    console.warn('Phase B will populate this with 50+ labeled packaging photos.');
    return [];
  }

  const csv = fs.readFileSync(csvPath, 'utf-8');
  const lines = csv.split('\n').slice(1); // skip header

  return lines
    .filter((line) => line.trim())
    .map((line) => {
      const [photoPath, expectedDate, confidence] = line.split(',');
      return {
        photoPath: photoPath.trim(),
        expectedDate: expectedDate.trim(),
        confidence: parseFloat(confidence.trim()),
      };
    });
}

async function ocrExpiryDate(photoPath: string): Promise<{
  detectedDate: string | null;
  confidence: number;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
}> {
  // TODO: Phase B - call ocr-expiry-date Lambda
  // For now, return stub response
  return {
    detectedDate: null,
    confidence: 0,
    latencyMs: 0,
    inputTokens: 0,
    outputTokens: 0,
  };
}

export async function evalOcrExpiryDate(): Promise<EvalResult> {
  console.log('🚀 Starting ocr-expiry-date evaluation...\n');

  const groundTruth = await loadGroundTruth();

  if (groundTruth.length === 0) {
    console.log('ℹ️  No ground truth dataset found.');
    console.log('Phase B will populate ground-truth.csv with 50+ labeled packaging photos.');
    return {
      task: 'ocr-expiry-date',
      model: 'textract + haiku-4.5',
      datasetSize: 0,
      accuracy: 0,
      precision: {},
      recall: {},
      latencyMs: { p50: 0, p95: 0, p99: 0, mean: 0 },
      cost: { totalInputTokens: 0, totalOutputTokens: 0, estimatedUsd: 0 },
      regression: { detected: false, message: 'No dataset to evaluate' },
    };
  }

  const predictions: Array<{ correct: boolean; confidence: number }> = [];
  const latencies: number[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (const example of groundTruth) {
    const result = await ocrExpiryDate(example.photoPath);

    predictions.push({
      correct: result.detectedDate === example.expectedDate,
      confidence: result.confidence,
    });

    latencies.push(result.latencyMs);
    totalInputTokens += result.inputTokens;
    totalOutputTokens += result.outputTokens;
  }

  const accuracy = calculateAccuracy(predictions.map((p) => p.correct));
  const { precision, recall } = calculatePrecisionRecall(predictions);
  const latencyStats = calculateLatencyStats(latencies);
  const estimatedCost = calculateCost('haiku', totalInputTokens, totalOutputTokens);

  const result: EvalResult = {
    task: 'ocr-expiry-date',
    model: 'textract + haiku-4.5',
    datasetSize: groundTruth.length,
    accuracy,
    precision,
    recall,
    latencyMs: latencyStats,
    cost: {
      totalInputTokens,
      totalOutputTokens,
      estimatedUsd: estimatedCost,
    },
    regression: {
      detected: latencyStats.p95 > 2000,
      message: latencyStats.p95 > 2000 ? `P95 latency ${latencyStats.p95}ms exceeds 2s target` : undefined,
    },
  };

  console.log(formatEvalReport(result));

  if (result.regression.detected) {
    process.exit(1);
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  evalOcrExpiryDate().catch(console.error);
}
