# Phase C Local Development Setup

Build and test Phase C advanced features locally without AWS. Full caching, analytics, and ML features running on your machine.

## Quick Start (5 minutes)

### 1. Start Local Services

```bash
# Start DynamoDB Local, Redis, and Mock API
docker-compose -f docker-compose.local.yml up -d

# Verify all services are healthy
docker-compose -f docker-compose.local.yml ps

# Expected output: All containers showing "healthy" status
```

### 2. Seed Local Database

```bash
# Create test data in DynamoDB Local
pnpm local:seed

# View in DynamoDB Admin UI: http://localhost:8001
# Tables: wfl-main-local, wfl-analytics-event-local, etc.
```

### 3. Run Mobile App

```bash
cd apps/mobile

# Start Expo dev server
pnpm dev

# Choose platform:
# - Press 'i' for iOS simulator
# - Press 'a' for Android emulator
# - Press 'w' for web browser (fastest for Phase C testing)
```

### 4. Test Phase C Features

```bash
# Sign in with any email (no real email needed)
# Dashboard auto-redirects to households

# Add item (triggers Phase C.2 analytics event tracking)
# See event in DynamoDB Admin: http://localhost:8001 → wfl-analytics-event-local table

# Enable offline mode and continue (Phase C caching handles offline)
# Check Redis cache: docker exec wfl-redis redis-cli KEYS "*"
```

---

## Local Services Overview

| Service            | Port | Purpose           | Admin UI                      |
| ------------------ | ---- | ----------------- | ----------------------------- |
| **DynamoDB Local** | 8000 | Data storage      | http://localhost:8001         |
| **Redis**          | 6379 | Phase C.1 Caching | `redis-cli`                   |
| **Mock API**       | 4000 | GraphQL endpoint  | http://localhost:4000/graphql |

---

## Testing Phase C Features Locally

### Phase C.1: Caching

**Goal**: Verify cache hit rates and latency improvements

```bash
# 1. Start services
docker-compose -f docker-compose.local.yml up -d

# 2. Open mobile app and sign in
cd apps/mobile && pnpm dev

# 3. Create household + add items (populates cache)

# 4. Check cache status
docker exec wfl-redis redis-cli INFO stats

# Expected: `hits` > 0, `misses` > 0
```

**Success Criteria**:

- ✅ Redis responds to queries
- ✅ Cache keys appear: `docker exec wfl-redis redis-cli KEYS "*"`
- ✅ Dashboard loads faster on second load (cache hit)

### Phase C.2: Analytics

**Goal**: Verify event tracking and cost analysis

```bash
# 1. Services running (see above)

# 2. Perform actions that trigger events:
#    - Create household (item_created event)
#    - Add item
#    - Mark item eaten (item_eaten event)
#    - Delete item (item_wasted event)

# 3. View captured events
# Open http://localhost:8001 → wfl-analytics-event-local table
# Each action creates a record with eventType, timestamp, userId, householdId

# 4. View analytics in mobile app
# (Analytics screen shows cost breakdown by category + member)
```

**Success Criteria**:

- ✅ Events appear in DynamoDB Admin UI
- ✅ Event table shows >0 items after actions
- ✅ Analytics screen displays cost data
- ✅ Event capture rate = 100%

### Phase C.3: ML Recommendations

**Goal**: Verify ML recommendation pipeline (locally mocked)

```bash
# 1. Services running

# 2. In mobile app, navigate to Recommendations screen
# (Shows 5 suggested recipes based on items in household)

# 3. Mock AI generates recommendations from local API
# Check logs: docker logs wfl-mock-api | grep -i "recommend"

# 4. Rate recommendations (stores user feedback)
# Check: http://localhost:8001 → wfl-user-preferences-local
```

**Success Criteria**:

- ✅ Recommendations appear on screen
- ✅ Ratings save to DynamoDB
- ✅ Next load shows personalized recommendations
- ✅ Cost tracking shows <$100/month (local = free)

### Phase C.4: Image Optimization

**Goal**: Verify image processing pipeline

```bash
# 1. In mobile app, tap "Add Item" → "Take Photo"
# (or upload from gallery)

# 2. Mock API processes image:
# - Classifies food (AI)
# - Resizes/optimizes
# - Stores in local S3 equivalent (DynamoDB)

# 3. Check image metadata
# Open http://localhost:8001 → search for image URLs
```

**Success Criteria**:

- ✅ Image uploads work
- ✅ Classification succeeds (returns food category)
- ✅ Compressed version stored
- ✅ Item created with image reference

### Phase C.5: Multi-Region

**Goal**: Verify replication and failover (simulated locally)

```bash
# 1. Services running

# 2. Create item on "primary" (main API)

# 3. Check replication in logs
# docker logs wfl-mock-api | grep -i "replicate"

# 4. Simulate failover: stop primary, continue using secondary
# Mock API handles graceful degradation
```

**Success Criteria**:

- ✅ Data replicates between regions
- ✅ Consistency > 99%
- ✅ Failover latency < 1 second

### Phase C.6: Sharding

**Goal**: Verify sharding router and load distribution

```bash
# 1. Services running

# 2. Create 10+ households (distributes across shards)

# 3. Check shard allocation
# http://localhost:8001 → wfl-shard-allocation-local
# Each household assigned to shard 0, 1, 2, etc.

# 4. Monitor load distribution
# docker logs wfl-mock-api | grep -i "shard"
```

**Success Criteria**:

- ✅ Households distributed across shards
- ✅ Shard load balanced
- ✅ Hashing consistent (same household → same shard)

---

## Development Workflow

### Hot Reload on Changes

All local services auto-reload on file changes:

```bash
# Mobile app changes
cd apps/mobile
# Just save—Expo hot-reloads automatically

# Mock API changes
vim services/local-mock/src/resolvers.ts
# Changes apply on save (docker volume mount)

# Resolver changes
vim services/api/src/resolvers/
# Changes apply when mock-api restarts
```

### Testing Locally vs AWS

| Scenario            | Local          | AWS              |
| ------------------- | -------------- | ---------------- |
| **Cost**            | Free           | Pay as you go    |
| **Speed**           | Instant        | 5-10s to deploy  |
| **Offline support** | ✅ Works       | ❌ Requires sync |
| **Caching**         | ✅ Redis local | ✅ ElastiCache   |
| **Analytics**       | ✅ Real-time   | ✅ Real-time     |
| **ML**              | ✅ Mocked      | ✅ Real Bedrock  |

---

## Common Local Development Tasks

### View Database

```bash
# Open DynamoDB Admin UI
open http://localhost:8001

# Or use Redis CLI
docker exec wfl-redis redis-cli
> KEYS *
> GET user#123:profile
```

### View API Logs

```bash
# Mock API logs
docker logs wfl-mock-api -f

# DynamoDB logs
docker logs wfl-dynamodb -f

# Redis logs
docker logs wfl-redis -f
```

### Clear Local Data

```bash
# Stop services
docker-compose -f docker-compose.local.yml down

# Remove volumes (WARNING: deletes all local data)
docker volume rm dynamodb-data redis-data

# Restart
docker-compose -f docker-compose.local.yml up -d

# Reseed
pnpm local:seed
```

### Debug Caching

```bash
# Check Redis cache size
docker exec wfl-redis redis-cli DBSIZE

# Monitor real-time cache operations
docker exec wfl-redis redis-cli MONITOR

# Check specific key
docker exec wfl-redis redis-cli GET "household#abc-123:items"
```

### Debug Analytics

```bash
# Query analytics events
# Open http://localhost:8001 → wfl-analytics-event-local
# Filter by eventType: item_added, item_eaten, item_wasted

# Count events by type
# In DynamoDB Admin, use Scan with filter
```

---

## Integration Testing

### End-to-End Flow

```bash
# 1. Start all services
docker-compose -f docker-compose.local.yml up -d

# 2. Seed data
pnpm local:seed

# 3. Run integration tests
pnpm --filter @wfl/mobile test -- --testNamePattern="Phase C"

# 4. Check results in console and DynamoDB Admin
```

### Test Checklist for Phase C

- [ ] **Caching**: Cache hit rate > 80% after 2nd load
- [ ] **Analytics**: 100% event capture in DynamoDB
- [ ] **ML**: Recommendations appear within 500ms
- [ ] **Images**: Upload, classify, optimize completes
- [ ] **Multi-Region**: Replication latency < 100ms
- [ ] **Sharding**: Households distributed evenly

---

## Troubleshooting

### Services Won't Start

```bash
# Check if ports are in use
lsof -i :8000  # DynamoDB
lsof -i :6379  # Redis
lsof -i :4000  # Mock API
lsof -i :8001  # DynamoDB Admin

# If in use, kill process or change port in docker-compose.local.yml
```

### Redis Connection Error

```bash
# Verify Redis is healthy
docker-compose -f docker-compose.local.yml ps

# If unhealthy, restart
docker-compose -f docker-compose.local.yml restart redis
```

### DynamoDB Table Not Found

```bash
# Recreate schema
pnpm local:seed

# Verify tables exist
docker exec wfl-dynamodb aws dynamodb list-tables --endpoint-url http://localhost:8000
```

### Cache Not Working

```bash
# Check Redis connectivity from mock-api
docker exec wfl-mock-api ping wfl-redis

# Check REDIS_ENDPOINT env var
docker exec wfl-mock-api env | grep REDIS
# Should show: REDIS_ENDPOINT=http://redis:6379
```

---

## Next Steps

1. ✅ **Start Services**: `docker-compose -f docker-compose.local.yml up -d`
2. ✅ **Seed Data**: `pnpm local:seed`
3. ✅ **Run App**: `pnpm --filter @wfl/mobile dev`
4. ✅ **Test Features**: Follow test sections above
5. ✅ **Commit Tests**: `git add . && git commit -m "test: Phase C local validation"`

For questions, check:

- `W1_PHASE_C_ROADMAP.md` — 6-week implementation timeline
- `W1_PHASE_C_TEAM_ENABLEMENT.md` — How each team uses Phase C
- `docs/PHASE_C1_CACHING_IMPLEMENTATION.md` — Caching details
- `docs/PHASE_C2_ANALYTICS_IMPLEMENTATION.md` — Analytics details
- `docs/PHASE_C3_ML_RECOMMENDATIONS_IMPLEMENTATION.md` — ML details
