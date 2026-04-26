/**
 * AppSync function: enforceRateLimit
 *
 * Rate limits per-user API calls
 * Uses DynamoDB counter with RCU-efficient batching
 *
 * Limits:
 * - General API: 100 req/min per user
 * - AI mutations (classify, ocr): 20 req/min per user
 * - Photo uploads: 10 req/min per user
 */

export function request(ctx) {
  const userId = ctx.identity.sub;
  const operationName = ctx.request.operationName || '';

  // Determine rate limit tier based on operation
  let limit = 100; // default: 100 req/min
  let window = 60; // seconds

  if (operationName.includes('Classify') || operationName.includes('Ocr')) {
    limit = 20; // AI ops: 20 req/min
  } else if (operationName.includes('Upload') || operationName.includes('Photo')) {
    limit = 10; // Photo uploads: 10 req/min
  }

  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - window;

  // Update counter atomically
  return {
    operation: 'UpdateItem',
    key: {
      PK: { S: `RATELIMIT#${userId}` },
      SK: { S: `WINDOW#${windowStart}` },
    },
    update: {
      expression: 'SET #count = if_not_exists(#count, :zero) + :inc, #ttl = :ttl',
      expressionNames: {
        '#count': 'count',
        '#ttl': 'TTL',
      },
      expressionValues: {
        ':zero': { N: '0' },
        ':inc': { N: '1' },
        ':ttl': { N: String(now + 120) }, // Keep for 2 minutes
      },
    },
    returnValues: 'ALL_NEW',
  };
}

export function response(ctx) {
  if (ctx.error) {
    return util.error('Rate limit check failed', 'INTERNAL_ERROR');
  }

  const count = parseInt(ctx.result?.count?.N || '0');

  // Get limit from request (would be set in request handler)
  const operationName = ctx.request.operationName || '';
  let limit = 100;
  if (operationName.includes('Classify') || operationName.includes('Ocr')) {
    limit = 20;
  } else if (operationName.includes('Upload') || operationName.includes('Photo')) {
    limit = 10;
  }

  if (count > limit) {
    return util.error(
      `Rate limit exceeded: ${count}/${limit} requests in window`,
      'RATE_LIMIT_EXCEEDED'
    );
  }

  ctx.stash.rateLimitRemaining = limit - count;
  return ctx.prev.result;
}
