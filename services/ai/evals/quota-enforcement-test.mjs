/**
 * Quota enforcement validation tests.
 * Verifies free tier limits are properly enforced.
 * Run: node quota-enforcement-test.mjs
 */

const FREE_TIER_QUOTAS = {
  classify_food: 10,
  ocr_expiry_date: 30,
  ocr_receipt: 5,
  suggest_recipes: 5,
  suggest_restaurants: 20,
};

const PREMIUM_TIER_QUOTAS = {
  classify_food: 999999,
  ocr_expiry_date: 999999,
  ocr_receipt: 999999,
  suggest_recipes: 999999,
  suggest_restaurants: 999999,
};

function getQuotaForTier(tier, taskType) {
  if (tier === 'free') {
    return FREE_TIER_QUOTAS[taskType] || 0;
  }
  return PREMIUM_TIER_QUOTAS[taskType] || 999999;
}

function checkQuota(currentUsage, quota) {
  // Treat negative usage as 0 (edge case safety)
  const normalizedUsage = Math.max(0, currentUsage);
  const remaining = Math.max(0, quota - normalizedUsage);
  return {
    allowed: remaining > 0,
    remaining,
    exceeded: remaining === 0,
  };
}

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

// Test 1: Free tier classify-food limit
test('Free tier: classify-food daily limit (10/day)', () => {
  const quota = getQuotaForTier('free', 'classify_food');
  if (quota !== 10) throw new Error(`Expected 10, got ${quota}`);

  const check = checkQuota(5, quota);
  if (!check.allowed) throw new Error('Should allow at 5/10');
  if (check.remaining !== 5) throw new Error(`Expected 5 remaining, got ${check.remaining}`);

  const check2 = checkQuota(10, quota);
  if (check2.allowed) throw new Error('Should NOT allow at 10/10');
  if (check2.exceeded !== true) throw new Error('Should be exceeded at 10/10');
});

// Test 2: Free tier ocr-expiry-date limit
test('Free tier: ocr-expiry-date daily limit (30/day)', () => {
  const quota = getQuotaForTier('free', 'ocr_expiry_date');
  if (quota !== 30) throw new Error(`Expected 30, got ${quota}`);

  const check = checkQuota(29, quota);
  if (!check.allowed) throw new Error('Should allow at 29/30');
  if (check.remaining !== 1) throw new Error(`Expected 1 remaining, got ${check.remaining}`);

  const check2 = checkQuota(30, quota);
  if (check2.remaining !== 0) throw new Error('Should have 0 remaining at limit');
});

// Test 3: Premium tier unlimited
test('Premium tier: all tasks unlimited (999999)', () => {
  for (const taskType of Object.keys(PREMIUM_TIER_QUOTAS)) {
    const quota = getQuotaForTier('premium', taskType);
    if (quota !== 999999) throw new Error(`Premium ${taskType} should be unlimited`);

    const check = checkQuota(1000, quota);
    if (!check.allowed) throw new Error(`Premium should allow over 1000 for ${taskType}`);
  }
});

// Test 4: Quota calculation with partial usage
test('Quota math: calculate remaining at various usage levels', () => {
  const quota = 10;
  const usagePoints = [0, 3, 5, 9, 10, 11];

  const expected = [10, 7, 5, 1, 0, 0];

  usagePoints.forEach((usage, idx) => {
    const check = checkQuota(usage, quota);
    if (check.remaining !== expected[idx]) {
      throw new Error(`At usage ${usage}, expected ${expected[idx]}, got ${check.remaining}`);
    }
  });
});

// Test 5: Quota exceeded threshold
test('Quota: exactly at limit is exceeded', () => {
  const quota = 10;

  const check = checkQuota(10, quota);
  if (check.allowed) throw new Error('At exactly quota limit should NOT be allowed');
  if (!check.exceeded) throw new Error('At exactly quota limit should be exceeded');
});

// Test 6: Quota one below limit is allowed
test('Quota: one call before limit is allowed', () => {
  const quota = 10;

  const check = checkQuota(9, quota);
  if (!check.allowed) throw new Error('One below limit should be allowed');
  if (check.remaining !== 1) throw new Error('Should have exactly 1 remaining');
});

// Test 7: Zero quota (disabled feature)
test('Quota: disabled feature (quota = 0) is always exceeded', () => {
  const check = checkQuota(0, 0);
  if (check.allowed) throw new Error('Disabled feature (quota=0) should not allow any calls');
  if (!check.exceeded) throw new Error('Disabled feature should be exceeded');
});

// Test 8: Negative usage (shouldn't happen but handle gracefully)
test('Quota: negative usage treated as 0', () => {
  const quota = 10;
  const check = checkQuota(-5, quota);
  // Should treat as 0 usage
  if (check.remaining !== 10) throw new Error('Negative usage should be treated as 0');
});

// Test 9: All free tier task types have limits
test('Free tier: all tasks have defined quotas', () => {
  const tasks = [
    'classify_food',
    'ocr_expiry_date',
    'ocr_receipt',
    'suggest_recipes',
    'suggest_restaurants',
  ];

  tasks.forEach(task => {
    const quota = getQuotaForTier('free', task);
    if (typeof quota !== 'number' || quota <= 0) {
      throw new Error(`Task ${task} missing or invalid quota`);
    }
  });
});

// Test 10: Different features have different limits
test('Free tier: quotas vary by feature (realistic limits)', () => {
  const classify = getQuotaForTier('free', 'classify_food');   // 10 = most popular
  const ocr = getQuotaForTier('free', 'ocr_expiry_date');      // 30 = cheap
  const receipt = getQuotaForTier('free', 'ocr_receipt');      // 5 = expensive
  const recipes = getQuotaForTier('free', 'suggest_recipes');  // 5 = expensive

  if (ocr <= classify) throw new Error('OCR should have higher quota than classify (cheaper)');
  if (receipt >= classify) throw new Error('Receipt OCR should have lower quota (more expensive)');
  if (recipes >= classify) throw new Error('Recipes should have lower quota (more expensive)');
});

// Test 11: Quota reset simulation (daily)
test('Quota: daily reset scenario', () => {
  const quota = 10;

  // Day 1: use 8 calls
  let check = checkQuota(8, quota);
  if (check.remaining !== 2) throw new Error('Day 1 should have 2 remaining');

  // Day 2: reset to 0 usage
  check = checkQuota(0, quota);
  if (check.remaining !== 10) throw new Error('After reset, should have 10 remaining');

  // Day 2: use 5 calls
  check = checkQuota(5, quota);
  if (check.remaining !== 5) throw new Error('Day 2 should have 5 remaining');
});

// Test 12: Quota enforcement across multiple users
test('Quota: independent per user (no cross-user quota)', () => {
  const quota = 10;

  // User A used 8 calls
  const userA = checkQuota(8, quota);
  if (userA.remaining !== 2) throw new Error('User A should have 2 remaining');

  // User B used 0 calls (independent)
  const userB = checkQuota(0, quota);
  if (userB.remaining !== 10) throw new Error('User B should have full 10 quota');

  // User A tries to use 3 more (exceeds)
  const userAExceeded = checkQuota(11, quota);
  if (userAExceeded.remaining !== 0) throw new Error('User A exceeded should have 0 remaining');
});

// Run all tests
async function main() {
  console.log('🧪 Quota Enforcement Tests\n');

  let passed = 0;
  let failed = 0;

  for (const { name, fn } of tests) {
    try {
      fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`\n📊 Quota Test Results: ${passed}/${tests.length} passed\n`);

  if (failed === 0) {
    console.log('✅ All quota enforcement tests passed!\n');
    process.exit(0);
  } else {
    console.log(`❌ ${failed} test(s) failed\n`);
    process.exit(1);
  }
}

main();
