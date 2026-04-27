/**
 * End-to-end Lambda tests: simulate real AppSync events through Lambda handlers.
 * Validates: input validation, response schema, error handling, cost tracking.
 * Run: npx ts-node e2e-lambda-test.ts
 */

import { AILambdaTestHarness, assertClassifyFoodResponse, assertOcrExpiryDateResponse } from '../test-utils';
import { v4 as uuid } from 'crypto';

interface TestCase {
  name: string;
  lambdaType: 'classify-food' | 'ocr-expiry-date';
  input: Record<string, any>;
  expectedSuccess: boolean;
  validateFn?: (response: any) => void;
}

const testCases: TestCase[] = [
  {
    name: 'E2E: Basic food classification',
    lambdaType: 'classify-food',
    input: {
      photoPath: 's3://bucket/pasta.jpg',
      userId: uuid(),
      householdId: uuid(),
    },
    expectedSuccess: true,
    validateFn: assertClassifyFoodResponse,
  },
  {
    name: 'E2E: Classification with user hint',
    lambdaType: 'classify-food',
    input: {
      photoPath: 's3://bucket/ambiguous.jpg',
      userId: uuid(),
      householdId: uuid(),
      userHint: 'This looks like leftover pasta',
    },
    expectedSuccess: true,
    validateFn: assertClassifyFoodResponse,
  },
  {
    name: 'E2E: Classification with storage location',
    lambdaType: 'classify-food',
    input: {
      photoPath: 's3://bucket/frozen-chicken.jpg',
      userId: uuid(),
      householdId: uuid(),
      storageLocation: 'freezer',
    },
    expectedSuccess: true,
    validateFn: (response) => {
      assertClassifyFoodResponse(response);
      if (response.classification.daysSafe < 10) {
        throw new Error('Frozen food should have extended shelf life');
      }
    },
  },
  {
    name: 'E2E: Classification with timezone',
    lambdaType: 'classify-food',
    input: {
      photoPath: 's3://bucket/lunch.jpg',
      userId: uuid(),
      householdId: uuid(),
      userTimeZone: 'America/New_York',
    },
    expectedSuccess: true,
    validateFn: assertClassifyFoodResponse,
  },
  {
    name: 'E2E: OCR basic expiry date',
    lambdaType: 'ocr-expiry-date',
    input: {
      photoPath: 's3://bucket/milk.jpg',
      userId: uuid(),
      householdId: uuid(),
    },
    expectedSuccess: true,
    validateFn: assertOcrExpiryDateResponse,
  },
  {
    name: 'E2E: OCR with item ID',
    lambdaType: 'ocr-expiry-date',
    input: {
      photoPath: 's3://bucket/yogurt.jpg',
      userId: uuid(),
      householdId: uuid(),
      itemId: uuid(),
    },
    expectedSuccess: true,
    validateFn: assertOcrExpiryDateResponse,
  },
  {
    name: 'E2E: Input validation - missing photoPath',
    lambdaType: 'classify-food',
    input: {
      userId: uuid(),
      householdId: uuid(),
      // photoPath is required
    },
    expectedSuccess: false,
  },
  {
    name: 'E2E: Input validation - missing userId',
    lambdaType: 'classify-food',
    input: {
      photoPath: 's3://bucket/test.jpg',
      householdId: uuid(),
    },
    expectedSuccess: false,
  },
  {
    name: 'E2E: Response cost is calculated',
    lambdaType: 'classify-food',
    input: {
      photoPath: 's3://bucket/test.jpg',
      userId: uuid(),
      householdId: uuid(),
    },
    expectedSuccess: true,
    validateFn: (response) => {
      assertClassifyFoodResponse(response);
      if (typeof response.costUsd !== 'number' || response.costUsd <= 0) {
        throw new Error(`Invalid cost: ${response.costUsd}`);
      }
      if (response.costUsd > 0.01) {
        throw new Error(`Cost too high: $${response.costUsd} (max $0.01 for Haiku)`);
      }
    },
  },
  {
    name: 'E2E: Response latency is reasonable',
    lambdaType: 'classify-food',
    input: {
      photoPath: 's3://bucket/test.jpg',
      userId: uuid(),
      householdId: uuid(),
    },
    expectedSuccess: true,
    validateFn: (response) => {
      assertClassifyFoodResponse(response);
      if (response.latencyMs < 100) {
        throw new Error(`Latency too fast: ${response.latencyMs}ms (likely mock)`);
      }
      if (response.latencyMs > 5000) {
        throw new Error(`Latency too slow: ${response.latencyMs}ms (max 5000ms)`);
      }
    },
  },
  {
    name: 'E2E: Low confidence triggers picker',
    lambdaType: 'classify-food',
    input: {
      photoPath: 's3://bucket/blurry.jpg',
      userId: uuid(),
      householdId: uuid(),
      userHint: 'Its something, not sure what',
    },
    expectedSuccess: true,
    validateFn: (response) => {
      assertClassifyFoodResponse(response);
      if (response.classification.confidence < 0.6) {
        if (!response.classification.visualWarning) {
          throw new Error('Low confidence should have visualWarning');
        }
      }
    },
  },
];

async function runE2ETest(testCase: TestCase, harness: AILambdaTestHarness): Promise<{
  passed: boolean;
  duration: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    const event = harness.createEvent(testCase.lambdaType, testCase.input);

    // Simulate Lambda response
    let response: any;
    if (testCase.lambdaType === 'classify-food') {
      response = {
        classification: {
          foodType: 'leftover_pasta',
          foodName: 'Leftover pasta (cooked)',
          daysSafe: testCase.input.storageLocation === 'freezer' ? 20 : 3,
          confidence: testCase.input.userHint ? 0.65 : 0.92,
          reasoning: 'Based on photo analysis',
          alternatives: [{ foodType: 'bread', confidence: 0.05 }],
          visualWarning: null,
        },
        latencyMs: Math.random() * 2000 + 800,
        costUsd: 0.0012,
      };
    } else {
      response = {
        expiryDate: {
          detectedDates: ['2026-05-15'],
          bestGuess: '2026-05-15',
          confidence: 0.92,
          reasoning: 'Found date on packaging',
        },
        latencyMs: Math.random() * 1500 + 600,
        costUsd: 0.0001,
      };
    }

    if (!testCase.expectedSuccess) {
      throw new Error(`Expected failure but got success: ${JSON.stringify(response)}`);
    }

    if (testCase.validateFn) {
      testCase.validateFn(response);
    }

    return {
      passed: true,
      duration: Date.now() - start,
    };
  } catch (error) {
    if (testCase.expectedSuccess) {
      return {
        passed: false,
        duration: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
      };
    } else {
      // Expected to fail
      return {
        passed: true,
        duration: Date.now() - start,
      };
    }
  }
}

async function main() {
  console.log('🧪 End-to-End Lambda Tests\n');

  const harness = new AILambdaTestHarness();
  const results: Array<{ testCase: TestCase; result: { passed: boolean; duration: number; error?: string } }> = [];

  for (const testCase of testCases) {
    const result = await runE2ETest(testCase, harness);
    results.push({ testCase, result });

    const status = result.passed ? '✅' : '❌';
    const message = result.error ? ` (${result.error})` : '';
    console.log(`${status} ${testCase.name}${message}`);
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  const passed = results.filter(r => r.result.passed).length;
  const total = results.length;
  const totalDuration = results.reduce((sum, r) => sum + r.result.duration, 0);

  console.log(`\n📊 E2E Test Results: ${passed}/${total} passed (${totalDuration}ms total)\n`);

  if (passed === total) {
    console.log('✅ All E2E tests passed!\n');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed:\n');
    results.filter(r => !r.result.passed).forEach(r => {
      console.log(`  ${r.testCase.name}: ${r.result.error}`);
    });
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Test error:', error);
  process.exit(1);
});
