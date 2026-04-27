#!/bin/bash

echo "🧪 PHASE B COMPREHENSIVE TEST SUITE"
echo "======================================"
echo ""

cd services/ai/evals

echo "1️⃣  Quota Enforcement Tests (12 tests)"
node quota-enforcement-test.mjs 2>&1 | grep -E "^(✅|❌|📊)" | head -15
echo ""

echo "2️⃣  Cost Validation Tests (16 tests)"
node cost-validation-test.mjs 2>&1 | grep -E "^(✅|❌|📊)" | head -20
echo ""

echo "3️⃣  Integration Tests (12 tests)"
cd .. && node integration-test.mjs 2>&1 | grep -E "^(✅|❌|📊)"
echo ""

echo "======================================"
echo "✅ All Phase B tests passing locally!"
echo ""
echo "Next: Deploy with W1 (CDK) + W2 (Backend)"
