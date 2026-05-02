#!/usr/bin/env k6
/**
 * W2 Phase C — Load test for WhatsFresh API.
 *
 * Target: sustain 1 000 concurrent users without p95 > 500 ms or error rate > 1%.
 *
 * Run (against local):
 *   k6 run --env API_URL=http://localhost:4000/graphql scripts/benchmarks/load-test.k6.js
 *
 * Run (against staging):
 *   k6 run --env API_URL=https://api-staging.whatsfresh.app/graphql \
 *          --env AUTH_TOKEN=<token> \
 *          scripts/benchmarks/load-test.k6.js
 *
 * Requirements:
 *   brew install k6   (macOS)
 *   choco install k6  (Windows)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ─── Custom metrics ───────────────────────────────────────────────────────────
const errorRate = new Rate('error_rate');
const listItemsP95 = new Trend('list_items_p95', true);
const createItemP95 = new Trend('create_item_p95', true);
const deltaSyncP95 = new Trend('delta_sync_p95', true);
const slaViolations = new Counter('sla_violations');

// ─── Config ───────────────────────────────────────────────────────────────────
const API_URL = __ENV.API_URL || 'http://localhost:4000/graphql';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

// ─── SLA thresholds (ms) ──────────────────────────────────────────────────────
const SLA = {
  listItems: 500,
  createItem: 500,
  deltaSync: 800,
  markEaten: 500,
};

// ─── Load profile ─────────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    ramp_up: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 }, // ramp to 100 users
        { duration: '3m', target: 500 }, // ramp to 500 users
        { duration: '5m', target: 1000 }, // ramp to 1 000 users (peak)
        { duration: '3m', target: 1000 }, // sustain peak
        { duration: '2m', target: 0 }, // ramp down
      ],
    },
  },
  thresholds: {
    // Overall success: < 1% error rate
    error_rate: [{ threshold: 'rate < 0.01', abortOnFail: false }],
    // SLA targets
    'http_req_duration{operation:listItems}': ['p(95)<500'],
    'http_req_duration{operation:createItem}': ['p(95)<500'],
    'http_req_duration{operation:deltaSync}': ['p(95)<800'],
    'http_req_duration{operation:markEaten}': ['p(95)<500'],
    // Global p95
    http_req_duration: ['p(95)<1000'],
    // Error rate per operation
    list_items_p95: ['avg<500'],
    create_item_p95: ['avg<500'],
    delta_sync_p95: ['avg<800'],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function gqlPost(query, variables, tag) {
  const payload = JSON.stringify({ query, variables });
  const headers = {
    'Content-Type': 'application/json',
    ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
  };
  const res = http.post(API_URL, payload, {
    headers,
    tags: { operation: tag },
  });
  const ok = res.status === 200;
  let body;
  try {
    body = JSON.parse(res.body);
  } catch {
    body = {};
  }
  const hasErrors = Array.isArray(body.errors) && body.errors.length > 0;
  return { res, ok: ok && !hasErrors, data: body.data };
}

// ─── Seed data shared across VUs ─────────────────────────────────────────────
// Each VU fabricates its own household ID deterministically from __VU
const SEED_HOUSEHOLD_ID = `bench-household-${__VU}`;

// ─── Main scenario ────────────────────────────────────────────────────────────
export default function () {
  const vuId = `vu-${__VU}-${__ITER}`;

  // 1. List items (read-heavy baseline)
  const listRes = gqlPost(
    `query ListItems($id: ID!) { listItems(householdId: $id) { id foodName status } }`,
    { id: SEED_HOUSEHOLD_ID },
    'listItems',
  );
  const listOk = check(listRes, {
    'listItems status 200': (r) => r.ok,
    'listItems p95 < 500ms': () => listRes.res.timings.duration < SLA.listItems,
  });
  errorRate.add(!listOk);
  listItemsP95.add(listRes.res.timings.duration);
  if (listRes.res.timings.duration >= SLA.listItems) slaViolations.add(1, { op: 'listItems' });

  sleep(0.1);

  // 2. Create item (write path)
  const createRes = gqlPost(
    `mutation CreateItem($input: CreateItemInput!) { createItem(input: $input) { id } }`,
    {
      input: {
        householdId: SEED_HOUSEHOLD_ID,
        foodName: `Load test item ${vuId}`,
        foodType: 'leftovers',
        category: 'other',
        storageLocation: 'fridge',
        storedAt: new Date().toISOString(),
        storedTz: 'America/New_York',
        expiryAt: new Date(Date.now() + 3 * 86400_000).toISOString(),
        expirySource: 'rule',
      },
    },
    'createItem',
  );
  const createOk = check(createRes, {
    'createItem status 200': (r) => r.ok,
    'createItem p95 < 500ms': () => createRes.res.timings.duration < SLA.createItem,
  });
  errorRate.add(!createOk);
  createItemP95.add(createRes.res.timings.duration);
  if (createRes.res.timings.duration >= SLA.createItem) slaViolations.add(1, { op: 'createItem' });

  const createdId = createRes.data?.createItem?.id;

  sleep(0.2);

  // 3. Delta sync (the most common mobile operation)
  const syncRes = gqlPost(
    `query DeltaSync($input: DeltaSyncInput!) {
       deltaSync(input: $input) {
         serverTimestamp
         items { id status _version }
       }
     }`,
    { input: { householdId: SEED_HOUSEHOLD_ID, lastSyncTimestamp: null } },
    'deltaSync',
  );
  const syncOk = check(syncRes, {
    'deltaSync status 200': (r) => r.ok,
    'deltaSync p95 < 800ms': () => syncRes.res.timings.duration < SLA.deltaSync,
  });
  errorRate.add(!syncOk);
  deltaSyncP95.add(syncRes.res.timings.duration);
  if (syncRes.res.timings.duration >= SLA.deltaSync) slaViolations.add(1, { op: 'deltaSync' });

  // 4. Mark eaten (if we created an item successfully)
  if (createdId) {
    sleep(0.1);
    const eatRes = gqlPost(
      `mutation MarkEaten($id: ID!, $hid: ID!) { markItemEaten(id: $id, householdId: $hid) { id status } }`,
      { id: createdId, hid: SEED_HOUSEHOLD_ID },
      'markEaten',
    );
    const eatOk = check(eatRes, {
      'markEaten status 200': (r) => r.ok,
      'markEaten p95 < 500ms': () => eatRes.res.timings.duration < SLA.markEaten,
    });
    errorRate.add(!eatOk);
    if (eatRes.res.timings.duration >= SLA.markEaten) slaViolations.add(1, { op: 'markEaten' });
  }

  // Realistic think time between user actions
  sleep(Math.random() * 0.5 + 0.1);
}

// ─── Summary ──────────────────────────────────────────────────────────────────
export function handleSummary(data) {
  const dur = data.metrics.http_req_duration;
  const errRate = data.metrics.error_rate;
  const violations = data.metrics.sla_violations;

  const summary = {
    timestamp: new Date().toISOString(),
    totalRequests: dur ? dur.values.count : 0,
    p50ms: dur ? Math.round(dur.values['p(50)']) : 0,
    p95ms: dur ? Math.round(dur.values['p(95)']) : 0,
    p99ms: dur ? Math.round(dur.values['p(99)']) : 0,
    errorRatePct: errRate ? (errRate.values.rate * 100).toFixed(2) : '0.00',
    slaViolations: violations ? violations.values.count : 0,
    passed: errRate ? errRate.values.rate < 0.01 : true,
  };

  return {
    'scripts/benchmarks/load-test-results.json': JSON.stringify(summary, null, 2),
    stdout: `
╔══════════════════════════════════════════════════════╗
║          WFL Load Test — 1 000 concurrent VUs        ║
╠══════════════════════════════════════════════════════╣
║  Total requests : ${String(summary.totalRequests).padEnd(6)}                           ║
║  p50            : ${String(summary.p50ms + 'ms').padEnd(10)}                       ║
║  p95            : ${String(summary.p95ms + 'ms').padEnd(10)}  (target < 1 000ms)   ║
║  p99            : ${String(summary.p99ms + 'ms').padEnd(10)}                       ║
║  Error rate     : ${String(summary.errorRatePct + '%').padEnd(10)}  (target < 1%)         ║
║  SLA violations : ${String(summary.slaViolations).padEnd(6)}                           ║
║  Result         : ${summary.passed ? '✅ PASS' : '❌ FAIL'}                              ║
╚══════════════════════════════════════════════════════╝
`,
  };
}
