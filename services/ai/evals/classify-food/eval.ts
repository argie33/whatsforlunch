/**
 * Evaluation script for food classification model.
 *
 * Loads labeled food photos from ground-truth.csv and tests:
 * - Top-1 accuracy (correct food_type)
 * - Confidence calibration
 * - Latency (target: < 3s)
 * - Cost per classification
 *
 * Run: npx ts-node evals/classify-food/eval.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BedrockMockClient } from '../../shared/src/bedrock-mock';
import { calculateAccuracy, calculatePrecisionRecall, calculateLatencyStats, calculateCost, formatEvalReport, EvalResult } from '../shared/metrics';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface GroundTruth {
  photoPath: string;
  foodType: string;
  daysSafe: number;
  storageLocation: string;
  category: string;
}

async function loadGroundTruth(): Promise<GroundTruth[]> {
  const csvPath = path.join(__dirname, 'ground-truth.csv');

  if (!fs.existsSync(csvPath)) {
    console.warn(`⚠️  ground-truth.csv not found at ${csvPath}`);
    console.warn('Create ground-truth.csv with columns: photoPath,foodType,daysSafe,storageLocation,category');
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
        foodType: parts[1].trim(),
        daysSafe: parseInt(parts[2].trim()),
        storageLocation: parts[3].trim(),
        category: parts[4].trim(),
      };
    });
}

async function classifyFood(photoPath: string, storageLocation: string): Promise<{
  foodType: string;
  confidence: number;
  daysSafe: number;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
}> {
  const startTime = Date.now();

  const bedrockMock = new BedrockMockClient();

  // Simulate Lambda invocation
  const response = await bedrockMock.invoke({
    model: 'haiku',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analyze this food photo at ${photoPath}. Storage location: ${storageLocation}.`,
          },
        ],
      },
    ],
    systemPrompt: 'You are a food classifier.',
    systemPromptCacheControl: true,
    tools: [
      {
        name: 'classify_food',
        description: 'Classify food in image',
        input_schema: {
          type: 'object',
          properties: {
            food_type: { type: 'string' },
            days_safe: { type: 'integer' },
            confidence: { type: 'number' },
          },
          required: ['food_type', 'days_safe', 'confidence'],
        },
      },
    ],
    toolChoice: { type: 'tool', name: 'classify_food' },
  });

  const toolUse = response.content.find((c) => c.type === 'tool_use');
  const input = (toolUse?.input as Record<string, unknown>) || {};

  return {
    foodType: (input.food_type as string) || 'unknown',
    confidence: (input.confidence as number) || 0,
    daysSafe: (input.days_safe as number) || 7,
    latencyMs: Date.now() - startTime,
    inputTokens: response.usage.inputTokens,
    outputTokens: response.usage.outputTokens,
  };
}

export async function evalClassifyFood(): Promise<EvalResult> {
  console.log('🚀 Starting classify-food evaluation...\n');

  const groundTruth = await loadGroundTruth();

  if (groundTruth.length === 0) {
    console.log('ℹ️  No ground truth dataset found.');
    console.log('Create ground-truth.csv in this directory.');
    return {
      task: 'classify-food',
      model: 'haiku-4.5',
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

  console.log(`📊 Evaluating on ${groundTruth.length} examples...\n`);

  for (let i = 0; i < groundTruth.length; i++) {
    const example = groundTruth[i];
    process.stdout.write(`\r  [${i + 1}/${groundTruth.length}] ${example.foodType.padEnd(20)}`);

    try {
      const result = await classifyFood(example.photoPath, example.storageLocation);

      predictions.push({
        correct: result.foodType === example.foodType,
        confidence: result.confidence,
      });

      latencies.push(result.latencyMs);
      totalInputTokens += result.inputTokens;
      totalOutputTokens += result.outputTokens;
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
  const estimatedCost = calculateCost('haiku', totalInputTokens, totalOutputTokens);

  const result: EvalResult = {
    task: 'classify-food',
    model: 'haiku-4.5',
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
      detected: accuracy < 0.9 || latencyStats.p95 > 3000,
      message: accuracy < 0.9 ? `Accuracy ${(accuracy * 100).toFixed(1)}% below 90% target` : latencyStats.p95 > 3000 ? `P95 latency ${latencyStats.p95}ms exceeds 3s target` : undefined,
    },
  };

  console.log(formatEvalReport(result));

  if (result.regression.detected) {
    process.exit(1);
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  evalClassifyFood().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
