#!/usr/bin/env tsx
/**
 * API performance benchmark — run against staging or local stack.
 * Usage:
 *   API_URL=http://localhost:4000/graphql tsx scripts/benchmarks/api-benchmark.ts
 *   API_URL=https://api.whatsforlunch.app/graphql tsx scripts/benchmarks/api-benchmark.ts
 */

const API_URL = process.env.API_URL ?? 'http://localhost:4000/graphql';
const CONCURRENCY = Number(process.env.CONCURRENCY ?? '10');
const ITERATIONS = Number(process.env.ITERATIONS ?? '50');

interface Sample { name: string; ms: number; ok: boolean }
const samples: Sample[] = [];

async function gql(query: string, variables?: Record<string, unknown>, token?: string) {
  const start = performance.now();
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  const ms = performance.now() - start;
  const json = (await res.json()) as { data?: unknown; errors?: unknown[] };
  return { ms, ok: res.ok && !json.errors?.length, data: json.data };
}

function percentile(sorted: number[], p: number) {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)]!.toFixed(1);
}

function report(name: string) {
  const matching = samples.filter((s) => s.name === name);
  const times = matching.map((s) => s.ms).sort((a, b) => a - b);
  const failures = matching.filter((s) => !s.ok).length;
  if (!times.length) return;
  console.log(
    `  ${name.padEnd(30)} p50=${percentile(times, 50)}ms  p95=${percentile(times, 95)}ms  p99=${percentile(times, 99)}ms  failures=${failures}/${matching.length}`,
  );
}

async function runOne(i: number) {
  const email = `bench-${i}@wfl-bench.test`;

  // Sign in
  const signInRes = await gql(
    `mutation SignIn($e: String!) { signIn(email: $e) { token userId } }`,
    { e: email },
  );
  samples.push({ name: 'signIn', ms: signInRes.ms, ok: signInRes.ok });
  const token = (signInRes.data as { signIn?: { token: string } })?.signIn?.token;
  if (!token) return;

  // Me
  const meRes = await gql(`{ me { id email } }`, undefined, token);
  samples.push({ name: 'me', ms: meRes.ms, ok: meRes.ok });

  const households = await gql(`{ myHouseholds { id } }`, undefined, token);
  samples.push({ name: 'myHouseholds', ms: households.ms, ok: households.ok });
  const householdId = ((households.data as { myHouseholds?: { id: string }[] })?.myHouseholds?.[0]?.id);
  if (!householdId) return;

  // Create item
  const createRes = await gql(
    `mutation C($input: CreateItemInput!) { createItem(input: $input) { id } }`,
    {
      input: {
        householdId,
        foodName: 'Bench item',
        foodType: 'dairy',
        category: 'dairy',
        storageLocation: 'fridge',
        storedAt: new Date().toISOString(),
        storedTz: 'America/New_York',
        expiryAt: new Date(Date.now() + 7 * 86400_000).toISOString(),
        expirySource: 'user',
      },
    },
    token,
  );
  samples.push({ name: 'createItem', ms: createRes.ms, ok: createRes.ok });

  // List items
  const listRes = await gql(
    `query L($id: ID!) { listItems(householdId: $id) { id foodName } }`,
    { id: householdId },
    token,
  );
  samples.push({ name: 'listItems', ms: listRes.ms, ok: listRes.ok });

  // Delta sync
  const syncRes = await gql(
    `query DS($input: DeltaSyncInput!) { deltaSync(input: $input) { serverTimestamp } }`,
    { input: { householdId, lastSyncTimestamp: null } },
    token,
  );
  samples.push({ name: 'deltaSync', ms: syncRes.ms, ok: syncRes.ok });
}

async function main() {
  console.log(`\n📊 WFL API Benchmark`);
  console.log(`   Endpoint:    ${API_URL}`);
  console.log(`   Concurrency: ${CONCURRENCY}`);
  console.log(`   Iterations:  ${ITERATIONS}\n`);

  // Health check
  try {
    const health = await fetch(API_URL.replace('/graphql', '/health'));
    if (!health.ok) throw new Error(`Health check failed: ${health.status}`);
    console.log('   ✅ Health check passed\n');
  } catch (e) {
    console.error(`   ❌ Health check failed: ${e}`);
    process.exit(1);
  }

  const batches = Math.ceil(ITERATIONS / CONCURRENCY);
  for (let b = 0; b < batches; b++) {
    const start = b * CONCURRENCY;
    const end = Math.min(start + CONCURRENCY, ITERATIONS);
    await Promise.all(
      Array.from({ length: end - start }, (_, i) => runOne(start + i)),
    );
    process.stdout.write(`\r   Progress: ${end}/${ITERATIONS}`);
  }

  console.log('\n\n── Results ────────────────────────────────────────────────────────');
  for (const op of ['signIn', 'me', 'myHouseholds', 'createItem', 'listItems', 'deltaSync']) {
    report(op);
  }

  const totalFailures = samples.filter((s) => !s.ok).length;
  const errorRate = ((totalFailures / samples.length) * 100).toFixed(1);
  console.log(`\n   Error rate: ${errorRate}% (${totalFailures}/${samples.length} requests)\n`);

  const slaViolations = {
    signIn: samples.filter((s) => s.name === 'signIn' && s.ms > 1000).length,
    listItems: samples.filter((s) => s.name === 'listItems' && s.ms > 500).length,
    createItem: samples.filter((s) => s.name === 'createItem' && s.ms > 500).length,
  };

  if (Object.values(slaViolations).some((v) => v > 0)) {
    console.log('   ⚠️  SLA violations detected:');
    Object.entries(slaViolations).forEach(([op, count]) => {
      if (count > 0) console.log(`      ${op}: ${count} requests > threshold`);
    });
    console.log();
  } else {
    console.log('   ✅ All operations within SLA thresholds\n');
  }

  if (Number(errorRate) > 1) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
