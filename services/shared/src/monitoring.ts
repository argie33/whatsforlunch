/**
 * Monitoring & observability utilities for AI Lambdas.
 * Tracks: latency, cost, accuracy, quota usage, errors.
 */

import { Logger } from '@aws-lambda-powertools/logger';

const logger = new Logger({ serviceName: 'ai-monitoring' });

export interface AiMetrics {
  taskType: string;
  userId: string;
  householdId: string;
  itemId?: string;
  model: string;
  promptVersion: number;
  status: 'success' | 'error' | 'quota_exceeded';
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  cacheHit: boolean;
  costUsd: number;
  confidence?: number;
  accuracy?: boolean;
  errorCode?: string;
  errorMessage?: string;
  timestamp: string;
}

export class AiMonitor {
  private startTime: number = 0;
  private inputTokens: number = 0;
  private outputTokens: number = 0;
  private cacheHit: boolean = false;

  constructor(
    private taskType: string,
    private userId: string,
    private householdId: string,
  ) {
    this.startTime = Date.now();
  }

  setTokens(input: number, output: number, cacheHit: boolean = false) {
    this.inputTokens = input;
    this.outputTokens = output;
    this.cacheHit = cacheHit;
  }

  recordSuccess(
    model: string,
    promptVersion: number,
    costUsd: number,
    confidence?: number,
    accuracy?: boolean,
    itemId?: string,
  ): AiMetrics {
    const latencyMs = Date.now() - this.startTime;

    const metrics: AiMetrics = {
      taskType: this.taskType,
      userId: this.userId,
      householdId: this.householdId,
      itemId,
      model,
      promptVersion,
      status: 'success',
      latencyMs,
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      cacheHit: this.cacheHit,
      costUsd,
      confidence,
      accuracy,
      timestamp: new Date().toISOString(),
    };

    logger.info('AI metric recorded', {
      taskType: this.taskType,
      latencyMs,
      costUsd,
      confidence,
      accuracy,
      cacheHit: this.cacheHit,
    });

    return metrics;
  }

  recordError(errorCode: string, errorMessage: string): AiMetrics {
    const latencyMs = Date.now() - this.startTime;

    const metrics: AiMetrics = {
      taskType: this.taskType,
      userId: this.userId,
      householdId: this.householdId,
      model: 'unknown',
      promptVersion: 0,
      status: 'error',
      latencyMs,
      inputTokens: 0,
      outputTokens: 0,
      cacheHit: false,
      costUsd: 0,
      errorCode,
      errorMessage,
      timestamp: new Date().toISOString(),
    };

    logger.error('AI error recorded', { errorCode, errorMessage, latencyMs });

    return metrics;
  }

  recordQuotaExceeded(userId: string): AiMetrics {
    const latencyMs = Date.now() - this.startTime;

    const metrics: AiMetrics = {
      taskType: this.taskType,
      userId,
      householdId: this.householdId,
      model: 'unknown',
      promptVersion: 0,
      status: 'quota_exceeded',
      latencyMs,
      inputTokens: 0,
      outputTokens: 0,
      cacheHit: false,
      costUsd: 0,
      errorCode: 'QUOTA_EXCEEDED',
      timestamp: new Date().toISOString(),
    };

    logger.warn('User quota exceeded', { userId, taskType: this.taskType });

    return metrics;
  }
}

/**
 * Cost calculator for different models and token counts.
 */
export const MODEL_COSTS = {
  'haiku-4.5': {
    inputTokensPerM: 0.8,
    outputTokensPerM: 4.0,
    cacheCreationTokensPerM: 4.0,
    cacheReadTokensPerM: 0.1,
  },
  'sonnet-4.6': {
    inputTokensPerM: 3.0,
    outputTokensPerM: 15.0,
    cacheCreationTokensPerM: 15.0,
    cacheReadTokensPerM: 0.3,
  },
};

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheHit: boolean = false,
  cacheTokens: number = 0,
): number {
  const costs = MODEL_COSTS[model as keyof typeof MODEL_COSTS];
  if (!costs) {
    logger.warn('Unknown model for cost calculation', { model });
    return 0;
  }

  let cost = 0;

  if (cacheHit && cacheTokens > 0) {
    // Cached tokens are cheaper
    cost += (cacheTokens / 1_000_000) * costs.cacheReadTokensPerM;
    // Add non-cached input tokens
    cost += ((inputTokens - cacheTokens) / 1_000_000) * costs.inputTokensPerM;
  } else {
    // Regular input tokens
    cost += (inputTokens / 1_000_000) * costs.inputTokensPerM;
  }

  // Output tokens always cost the same
  cost += (outputTokens / 1_000_000) * costs.outputTokensPerM;

  return cost;
}

/**
 * Quota management utilities.
 */
export const FREE_TIER_QUOTAS = {
  classify_food: 10, // per day
  ocr_expiry_date: 30,
  ocr_receipt: 5,
  suggest_recipes: 5,
  suggest_restaurants: 20,
};

export const PREMIUM_TIER_QUOTAS = {
  classify_food: 999999,
  ocr_expiry_date: 999999,
  ocr_receipt: 999999,
  suggest_recipes: 999999,
  suggest_restaurants: 999999,
};

export function getQuotaForTier(tier: 'free' | 'premium' | 'family', taskType: string): number {
  if (tier === 'free') {
    return FREE_TIER_QUOTAS[taskType as keyof typeof FREE_TIER_QUOTAS] || 0;
  }
  return PREMIUM_TIER_QUOTAS[taskType as keyof typeof PREMIUM_TIER_QUOTAS] || 999999;
}

export function checkQuota(
  currentUsage: number,
  quota: number,
): { allowed: boolean; remaining: number } {
  const remaining = Math.max(0, quota - currentUsage);
  return {
    allowed: remaining > 0,
    remaining,
  };
}
