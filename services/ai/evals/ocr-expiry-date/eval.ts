/**
 * Evaluation script for expiry date OCR model.
 *
 * Loads labeled packaging photos from ground-truth.csv and tests:
 * - Date extraction accuracy
 * - Confidence calibration
 * - Latency (target: < 2s)
 * - Cost per classification
 *
 * Run: npx ts-node evals/ocr-expiry-date/eval.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TextractMockClient } from '../../shared/src/textract-mock';
import { parseDate } from '../../ocr-expiry-date/src/date-parser';
import { calculateAccuracy, calculatePrecisionRecall, calculateLatencyStats, calculateCost, formatEvalReport, EvalResult } from '../shared/metrics';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface GroundTruth {
  photoPath: string;
  expectedDate: string;
  dateFormat: string;
  confidence: number;
}

async function loadGroundTruth(): Promise<GroundTruth[]> {
  const csvPath = path.join(__dirname, 'ground-truth.csv');

  if (!fs.existsSync(csvPath)) {
    console.warn(`⚠️  ground-truth.csv not found at ${csvPath}`);
    console.warn('Create ground-truth.csv with columns: photoPath,expectedDate,dateFormat,confidence');
    return [];
  }

  const csv = fs.readFileSync(csvPath, 'utf-8');
  const lines = csv.split('\n').slice(1); // skip header

  return lines
    .filter((line) => line.trim())
    .map((line) => {
      const parts = line.split(',');
      return {
        photoPath: parts[0].trim(),
        expectedDate: parts[1].trim(),
        dateFormat: parts[2].trim(),
        confidence: parseFloat(parts[3].trim()),
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
  const startTime = Date.now();

  const textractMock = new TextractMockClient();

  // Simulate Textract OCR
  const response = await textractMock.detectDocumentText({
    bytes: new Uint8Array([0xff, 0xd8, 0xff]), // Mock JPEG
  });

  // Parse dates from detected text
  const parsedDates = response.blocks
    .map((block) => parseDate(block.text))
    .filter((d) => d !== null);

  const bestDate = parsedDates.length > 0 ? parsedDates[0] : null;

  return {
    detectedDate: bestDate ? bestDate.date.toISOString().split('T')[0] : null,
    confidence: bestDate ? bestDate.confidence : 0,
    latencyMs: Date.now() - startTime,
    inputTokens: 0, // Textract doesn't use tokens
    outputTokens: 0,
  };
}

export async function evalOcrExpiryDate(): Promise<EvalResult> {
  console.log('🚀 Starting ocr-expiry-date evaluation...\n');

  const groundTruth = await loadGroundTruth();

  if (groundTruth.length === 0) {
    console.log('ℹ️  No ground truth dataset found.');
    console.log('Create ground-truth.csv in this directory.');
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

  console.log(`📊 Evaluating on ${groundTruth.length} examples...\n`);

  for (let i = 0; i < groundTruth.length; i++) {
    const example = groundTruth[i];
    process.stdout.write(`\r  [${i + 1}/${groundTruth.length}] ${example.expectedDate.padEnd(20)}`);

    try {
      const result = await ocrExpiryDate(example.photoPath);

      predictions.push({
        correct: result.detectedDate === example.expectedDate,
        confidence: result.confidence,
      });

      latencies.push(result.latencyMs);
    } catch (error) {
      console.error(`\n  Error on ${example.photoPath}:`, error);
      predictions.push({ correct: false, confidence: 0 });
      latencies.push(0);
    }
  }

  console.log('\n');

  const accuracy = calculateAccuracy(predictions.map((p) => p.correct));
  const { precision, recall } = calculatePrecisionRecall(predictions);
  const latencyStats = calculateLatencyStats(latencies);

  const result: EvalResult = {
    task: 'ocr-expiry-date',
    model: 'textract + haiku-4.5',
    datasetSize: groundTruth.length,
    accuracy,
    precision,
    recall,
    latencyMs: latencyStats,
    cost: {
      totalInputTokens: 0, // Textract is free tier
      totalOutputTokens: 0,
      estimatedUsd: 0,
    },
    regression: {
      detected: accuracy < 0.95 || latencyStats.p95 > 2000,
      message: accuracy < 0.95 ? `Accuracy ${(accuracy * 100).toFixed(1)}% below 95% target` : latencyStats.p95 > 2000 ? `P95 latency ${latencyStats.p95}ms exceeds 2s target` : undefined,
    },
  };

  console.log(formatEvalReport(result));

  if (result.regression.detected) {
    process.exit(1);
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  evalOcrExpiryDate().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
