# Phase C Team Enablement Guide

## How to Build & Deploy Advanced Infrastructure

**For**: All development teams (W2-W10)  
**Purpose**: Get started with Phase C infrastructure work  
**Time to Read**: 15 minutes

---

## Quick Start (Everyone)

### 1. Understand Your Role

| Team      | Phase C Role              | Start With                                           |
| --------- | ------------------------- | ---------------------------------------------------- |
| **W1**    | Infrastructure deployment | `W1_PHASE_C_ROADMAP.md`                              |
| **W2**    | Backend resolvers + API   | `docs/PHASE_C1_CACHING_IMPLEMENTATION.md`            |
| **W4**    | AI/ML fine-tuning         | `docs/PHASE_C3_ML_RECOMMENDATIONS_IMPLEMENTATION.md` |
| **W5-W7** | Mobile UI + features      | GraphQL APIs (from W2)                               |
| **W8**    | Web UI + features         | GraphQL APIs (from W2)                               |
| **W9**    | Monitoring + alerts       | CloudWatch sections in each guide                    |
| **W10**   | Marketing + analytics     | W9 metrics + W2 APIs                                 |

### 2. Check Prerequisites

```bash
# Verify you have the right tools
node --version        # Should be >=20
pnpm --version        # Should be >=9
aws --version         # Should be >=2.10
docker --version      # Should be >=20

# For W4 (AI): Verify Bedrock access
aws bedrock list-models --region us-east-1
```

### 3. Access the Documentation

```bash
# All guides are in the repo
ls docs/PHASE_C*_IMPLEMENTATION.md

# Or read the roadmap first
cat W1_PHASE_C_ROADMAP.md
```

---

## Implementation Phase By Phase

### Phase C.1: Caching (Week 1-2)

**Who**: W1 (Infrastructure), W2 (Backend)

**What's Being Built**:

- ElastiCache Redis cluster (AWS)
- Hybrid cache layer (in-memory + Redis)
- Cache integration in GraphQL resolvers

**How to Start**:

1. **W1**: Deploy Redis infrastructure

   ```bash
   cd infra/cdk
   # Once cache-stack.ts is implemented:
   # pnpm cdk:deploy WFL-Cache-dev
   ```

2. **W2**: Implement resolver caching

   ```bash
   # Read the caching implementation guide
   cat docs/PHASE_C1_CACHING_IMPLEMENTATION.md

   # Implement cache patterns in resolvers:
   # - Profile queries (6-hour TTL)
   # - Household lists (4-hour TTL)
   # - Item searches (2-hour TTL)
   ```

3. **Everyone**: Verify performance

   ```bash
   # Check cache hit rate
   # CloudWatch → WhatsForLunch/Cache → HitRate metric

   # Expect 85%+ hit rate after 1-2 days
   ```

**Success Criteria**:

- ✅ Redis endpoint responding
- ✅ 85%+ cache hit rate
- ✅ Query latency <50ms (vs 100ms+ before)

---

### Phase C.2: Analytics (Week 2-3)

**Who**: W1, W2 (Backend), W9 (Analytics)

**What's Being Built**:

- Event tracking system
- Cost analysis engine
- Analytics API

**How to Start**:

1. **W2**: Implement event tracking

   ```bash
   # Read the analytics implementation guide
   cat docs/PHASE_C2_ANALYTICS_IMPLEMENTATION.md

   # Add event tracking to all mutations:
   # - item_added (when item created)
   # - item_eaten (when item marked eaten)
   # - item_wasted (when item deleted as waste)
   ```

2. **W1**: Deploy analytics tables

   ```bash
   # Create DynamoDB tables:
   # - AnalyticsEvent (with TTL: 30 days)
   # - CostAnalysis (monthly snapshots)
   ```

3. **W9**: Set up monitoring
   ```bash
   # Create CloudWatch dashboard
   # Monitor:
   # - Event ingestion rate (target: 100% capture)
   # - Cost calculation accuracy (target: >99%)
   # - Storage efficiency (target: <100KB/user/month)
   ```

**Success Criteria**:

- ✅ Events captured in DynamoDB
- ✅ 100% event capture rate
- ✅ Cost analysis accurate

---

### Phase C.3: ML Recommendations (Week 3-4)

**Who**: W1, W2 (Backend), W4 (AI)

**What's Being Built**:

- Bedrock Claude 3 integration
- Recommendation engine
- User preference system

**How to Start**:

1. **W1**: Enable Bedrock

   ```bash
   # In AWS Console:
   # 1. Go to Bedrock → Model Access
   # 2. Request access to "Claude 3 Sonnet"
   # 3. Wait for approval (~5 minutes)
   ```

2. **W4**: Fine-tune prompts

   ```bash
   # Read the ML implementation guide
   cat docs/PHASE_C3_ML_RECOMMENDATIONS_IMPLEMENTATION.md

   # Test different prompts for recipe generation:
   # - Ingredient matching strategy
   # - Cuisine preferences influence
   # - Dietary restriction handling
   ```

3. **W2**: Implement resolvers

   ```bash
   # Implement these GraphQL resolvers:
   # - Query.getRecipeRecommendations
   # - Mutation.setUserPreferences
   # - Mutation.rateRecipe
   ```

4. **W9**: Monitor costs
   ```bash
   # Track:
   # - Bedrock API calls (target: <30K/month)
   # - Cache hit rate (target: 70%+)
   # - Estimated monthly cost (target: <$100)
   ```

**Success Criteria**:

- ✅ Recommendations generating
- ✅ User preferences saving
- ✅ Cost <$100/month with caching

---

### Phase C.4-C.6: Advanced Features (Week 4-6)

**Status**: Architecture documented, implementation follows W2-W4 completion

| Component             | Timeline | Owner  | Status        |
| --------------------- | -------- | ------ | ------------- |
| **C.4: Images**       | W4-5     | W1, W8 | 📋 Spec ready |
| **C.5: Multi-Region** | W5-6     | W1     | 📋 Spec ready |
| **C.6: Sharding**     | W6       | W1, W2 | 📋 Spec ready |

---

## Common Development Workflows

### Workflow 1: Adding a Cached Query

**Goal**: Add new GraphQL query with automatic caching

```javascript
// In Query resolver
import { cache } from './hybrid-cache';

export const handler = async (event) => {
  const { userId } = event.arguments;
  const cacheKey = `USER#${userId}:custom-data`;

  // Use cache.get() for automatic caching
  const data = await cache.get(
    cacheKey,
    async () => {
      // Fetch from DynamoDB
      return await dynamodb.getItem({
        TableName: process.env.TABLE_NAME,
        Key: { PK: { S: `USER#${userId}` } },
      });
    },
    3600, // 1-hour TTL
  );

  return data;
};
```

### Workflow 2: Tracking a User Event

**Goal**: Automatically capture user behavior

```javascript
// In any mutation
import { eventTracker } from './event-tracker';

export const handler = async (event) => {
  const { userId, householdId, ...args } = event.arguments;

  // Do the mutation work
  const result = await doMutation(args);

  // Track the event
  await eventTracker.track(
    userId,
    householdId,
    'item_added', // event type
    {
      itemId: result.id,
      cost: args.cost,
      category: args.category,
    },
  );

  return result;
};
```

### Workflow 3: Generating Recommendations

**Goal**: Get personalized recipe recommendations

```javascript
// In Query.getRecipeRecommendations resolver
import { recommendations } from './recommendations';

export const handler = async (event) => {
  const { householdId } = event.arguments;
  const { userId } = event.identity.claims;

  // Get recommendations (cached automatically)
  const recipes = await recommendations.getRecommendations(userId, householdId);

  return {
    recommendations: recipes,
    generatedAt: new Date().toISOString(),
  };
};
```

---

## Monitoring & Troubleshooting

### Check Cache Performance

```bash
# View cache metrics
aws cloudwatch get-metric-statistics \
  --namespace WhatsForLunch/Cache \
  --metric-name HitRate \
  --start-time 2026-04-30T00:00:00Z \
  --end-time 2026-04-30T23:59:59Z \
  --period 3600 \
  --statistics Average

# Expected: 85%+ for production
```

### Check Event Ingestion

```bash
# Count events in DynamoDB (CloudWatch)
# WhatsForLunch/Analytics → EventsTracked metric

# Or query directly:
aws dynamodb scan \
  --table-name wfl-analytics \
  --filter-expression "eventType = :type" \
  --expression-attribute-values '{":type":{"S":"item_added"}}' \
  --count
```

### Check ML Costs

```bash
# Monitor Bedrock invocations
aws cloudwatch get-metric-statistics \
  --namespace AWS/Bedrock \
  --metric-name InvocationCount \
  --start-time 2026-04-01T00:00:00Z \
  --end-time 2026-04-30T23:59:59Z \
  --period 86400 \
  --statistics Sum
```

### Troubleshooting Cache Issues

| Issue                          | Cause                | Fix                             |
| ------------------------------ | -------------------- | ------------------------------- |
| Low hit rate (<60%)            | TTL too short        | Increase TTL (6 hours = 70%+)   |
| Redis connection errors        | Network issue        | Check security group rules      |
| Memory cache growing           | Eviction not working | Check LRU algorithm             |
| Cache invalidation not working | Pattern mismatch     | Verify invalidate pattern regex |

---

## Performance Expectations

### Phase C.1: Caching

```
Before: Profile query 45ms, Household list 120ms, Search 200ms
After:  Profile query 2ms,  Household list 8ms,   Search 15ms
Improvement: 95% faster
```

### Phase C.2: Analytics

```
Event capture: <1ms per event
Cost analysis: <2 seconds per report
Storage: <100KB per user per month
```

### Phase C.3: ML

```
Cached recommendation: 5ms (Redis hit)
Fresh recommendation:  2.5 seconds (Bedrock call)
Monthly cost: $21-90 (with 70% cache hit rate)
```

---

## Team Coordination

### Daily Standups

**What to report**:

- Phase C.1: Cache hit rate, latency improvements
- Phase C.2: Event capture rate, cost accuracy
- Phase C.3: Recommendation quality, Bedrock costs
- W5-W8: API usage, performance improvements
- W9: Metric accuracy, alarm effectiveness

### Weekly Sync

**Topics**:

1. Progress on each Phase C component
2. Blockers and how to unblock
3. Performance metrics vs. targets
4. Cost tracking and optimization
5. Next week's priorities

### Communication Channels

- **#w1-infrastructure**: W1 team updates
- **#w2-backend**: Backend & resolver work
- **#phase-c-general**: Cross-team updates
- **#w9-monitoring**: Analytics & alerts

---

## Getting Help

### For W1 (Infrastructure)

- Read: `W1_PHASE_C_ROADMAP.md`
- Reference: `docs/PHASE_C1_CACHING_IMPLEMENTATION.md`
- Ask: W1 team in #w1-infrastructure

### For W2 (Backend)

- Read: All implementation guides
- Reference: GraphQL schema sections
- Ask: W1 + W2 team leads

### For W4 (AI)

- Read: `docs/PHASE_C3_ML_RECOMMENDATIONS_IMPLEMENTATION.md`
- Reference: Bedrock console + AWS docs
- Ask: AWS solutions architect

### For W5-W8 (Mobile/Web)

- Read: GraphQL APIs (from W2 implementation)
- Reference: Performance improvements section
- Ask: W2 + W5-W8 team leads

### For W9 (Analytics)

- Read: Monitoring sections in each guide
- Reference: CloudWatch dashboards
- Ask: W1 + W9 team leads

---

## Success Checklist

### Week 1 Targets

- [ ] W1: Redis infrastructure deployed
- [ ] W2: Started resolver caching implementation
- [ ] W9: CloudWatch dashboard created
- [ ] Cache hit rate trending upward

### Week 2 Targets

- [ ] W1: Analytics tables deployed
- [ ] W2: Event tracking in all mutations
- [ ] W9: Event ingestion rate 100%
- [ ] Cost analysis reports generating

### Week 3 Targets

- [ ] W1: Bedrock access enabled
- [ ] W4: Bedrock prompts tested
- [ ] W2: Recommendation resolvers deployed
- [ ] Recommendations generating successfully

### Week 4+ Targets

- [ ] Cache hit rate: 85%+
- [ ] Event capture: 100%
- [ ] ML recommendation quality: 85%+ (user ratings)
- [ ] Total Phase C cost: <$100-150/month

---

## Key Metrics Dashboard

Create in CloudWatch with these metrics:

**Cache Performance**

- Hit Rate (%) — Target: 85%+
- Query Latency P99 (ms) — Target: <50ms
- Redis CPU (%) — Alert: >75%
- Redis Memory (%) — Alert: >85%

**Analytics Performance**

- Events Tracked (per minute) — Target: 100% capture
- Cost Calc Accuracy (%) — Target: >99%
- Storage Used (KB/user/month) — Target: <100KB

**ML Performance**

- Recommendation Latency (ms) — Cached: 5ms, Fresh: 2.5s
- Bedrock API Calls (monthly) — Target: <30K
- Estimated Cost ($) — Target: <$100

---

## Next Steps

1. ✅ **Today**: Read your team's Phase C section above
2. ✅ **Tomorrow**: Review detailed implementation guide
3. ✅ **This Week**: Set up development environment
4. ✅ **Next Week**: Start Phase C implementation
5. ✅ **Week 2-3**: Ship to production
6. ✅ **Week 4**: Monitor metrics and optimize

---

## Questions?

Check the FAQ below or ask your team lead.

**FAQ**

**Q: Can I start Phase C.2 before C.1 is done?**
A: Not recommended. C.1 reduces database load for C.2+C.3 queries.

**Q: What if my cache hit rate is low?**
A: Check TTL settings (usually too short). Run for 1-2 days before tuning.

**Q: Can I test locally without AWS infrastructure?**
A: Yes, with mock Redis + DynamoDB Local. See `LOCAL_SETUP.md`.

**Q: How much will Phase C cost?**
A: ~$150-300/month in infrastructure, with $400-900/month in savings.

**Q: Can I deploy just Phase C.1 first?**
A: Yes. Each component is independent after deployed.

---

**Ready to build? Pick your team above and start with the "How to Start" section!** 🚀
