# W1 Phase C Infrastructure Roadmap

## Advanced Features & Scaling Infrastructure

**Status**: ✅ **READY TO START** | **Foundation Complete**  
**Duration**: 4-6 weeks  
**Target**: Production-grade advanced features infrastructure

---

## Executive Summary

W1 Phase C builds the infrastructure layer for Phase C application features (advanced analytics, ML recommendations, distributed caching, image optimization, and multi-region support). This enables W2-W10 teams to build sophisticated features without infrastructure blockers.

**Key Principle**: Teams can deploy Phase B features to production independently. Phase C infrastructure work runs in parallel to support future feature launches.

---

## Phase C.1: Distributed Caching (Week 1-2)

### What's Being Built

**Objective**: Enable high-performance caching for resolvers and queries, reducing database load by 80%+.

#### ElastiCache Redis Cluster

- Multi-AZ Redis (3 nodes prod, 2 nodes dev)
- Automatic failover with replication
- Encryption at rest (KMS) and in transit (TLS)
- CloudWatch monitoring dashboard
- 5 critical alarms (CPU, memory, evictions, network, connections)
- VPC integration with security groups

**CDK Stack**: `infra/cdk/lib/stacks/cache-stack.ts`

#### Hybrid Cache Layer

- Seamless Redis + memory cache integration
- Automatic failover to memory if Redis unavailable
- 3 write patterns: write-through, write-behind, cache-aside
- Batch operations via Redis pipeline
- Cache warming capability
- Comprehensive statistics collection

**GraphQL Resolvers**:

- `infra/cdk/lib/appsync/resolvers/redis-cache.js` — Low-level Redis client
- `infra/cdk/lib/appsync/resolvers/hybrid-cache.js` — Hybrid abstraction
- `infra/cdk/lib/appsync/resolvers/cache-invalidation.js` — Smart invalidation

#### Integration Points

- Profile queries: Cache user preferences (6-hour TTL)
- Household queries: Cache household lists (4-hour TTL)
- Item listings: Cache item queries (2-hour TTL, invalidate on mutations)
- Recommendation cache: Cache ML recommendations (6-hour TTL)

### Metrics to Track

| Metric         | Target | Threshold    |
| -------------- | ------ | ------------ |
| Cache Hit Rate | 85%+   | <60% alert   |
| Redis CPU      | <50%   | >75% alert   |
| Redis Memory   | <80%   | >85% alert   |
| Eviction Rate  | <1%    | >5% alert    |
| P99 Latency    | <50ms  | >100ms alert |
| Failover Time  | <1s    | >2s alert    |

### Deliverables

- [ ] `cache-stack.ts` — ElastiCache CDK implementation
- [ ] `redis-cache.js` — Redis client with connection pooling
- [ ] `hybrid-cache.js` — Cache abstraction layer
- [ ] `REDIS_INTEGRATION_GUIDE.md` — Deployment + usage
- [ ] CloudWatch dashboard + alarms
- [ ] Integration tests for cache failover
- [ ] Performance benchmarks (hit rate, latency)

### Team Dependencies

- **W2**: Can use caching in resolvers immediately
- **W4**: Can cache ML recommendation results
- **W5-W7**: Faster queries for list screens
- **W9**: Monitor cache metrics

---

## Phase C.2: Advanced Analytics (Week 2-3)

### What's Being Built

**Objective**: Track user behavior and provide cost/waste insights for decision-making.

#### Event Tracking System

- 8 event types: item_added, item_eaten, item_wasted, item_shared, search, recipe_viewed, recipe_attempted, household_created
- Event buffering (max 25, flush on interval)
- TTL-based retention (30 days)
- Batch writes to DynamoDB

**DynamoDB Schema**:

```
AnalyticsEvent {
  PK: USER#<userId>
  SK: ANALYTICS#<eventType>#<timestamp>
  eventType, metadata, createdAt, ttl
}
```

#### Cost Analysis Module

- Per-household cost calculations
- Waste cost tracking (dollar impact)
- Cost by category breakdown
- Member-level analytics
- Automatic recommendations (high waste alerts, spending analysis)

#### Report Generation

- JSON format (API)
- CSV format (Excel export)
- HTML format (email-friendly)
- Trend data (min, max, avg, median)
- Recommendations with priority levels

**GraphQL Resolvers**:

- `Query.getHouseholdAnalytics` — Fetch analytics data
- `Query.getCostAnalysis` — Cost breakdown by period
- `Mutation.trackEvent` — Log user behavior
- `Query.getRecommendations` — AI-generated insights

#### Integration Points

- Track item creation: `item_added` event
- Track consumption: `item_eaten` event
- Track waste: `item_wasted` event with cost
- Track recipe usage: `recipe_attempted` event
- Dashboard queries use analytics tables via GSI

### Metrics to Track

| Metric                 | Target            |
| ---------------------- | ----------------- |
| Event Capture Rate     | 100%              |
| Daily Active Analytics | 80%+              |
| Cost Calculation Error | <1%               |
| Report Generation Time | <2s               |
| Storage Efficiency     | <100KB/user/month |

### Deliverables

- [ ] `analytics-stack.ts` — DynamoDB tables + GSIs
- [ ] `analytics.js` — Event tracking + analysis engine
- [ ] `ANALYTICS_SETUP_GUIDE.md` — Implementation guide
- [ ] Event tracking integration in all mutations
- [ ] Cost analysis dashboard template
- [ ] Report generation examples (JSON/CSV/HTML)
- [ ] Performance tests (10K events/day)

### Team Dependencies

- **W2**: Add event tracking to all mutations
- **W6-W7**: Display analytics in UI
- **W9**: Monitor analytics ingestion rate

---

## Phase C.3: ML Recommendations (Week 3-4)

### What's Being Built

**Objective**: Personalized recipe recommendations using user preferences and consumption history.

#### Recommendation Engine

- Claude 3 Sonnet via Bedrock
- Context-aware prompting (pantry + preferences + history)
- Ingredient matching from pantry items
- Score-based ranking (0-100)
- Matched ingredient tracking
- 6-hour TTL caching with smart invalidation

#### Personalization

- Cuisine preferences (array)
- Dietary restrictions (vegan, gluten-free, etc.)
- Prep time constraints (5-60 minutes)
- Equipment availability
- Disliked ingredients list
- Consumption history tracking

#### Caching & Performance

- 6-hour cache with smart invalidation
- Bedrock response parsing
- Batch preference updates
- <3 second generation time
- 70%+ cache hit rate

**GraphQL Resolvers**:

- `Query.getRecipeRecommendations` — Get personalized recipes
- `Mutation.setUserPreferences` — Update preferences
- `Mutation.rateRecipe` — Feedback for ML training

#### Integration Points

- Profile screen: Edit preferences
- Item creation flow: Show matching recipes
- Home screen: Daily recommendations
- Pantry screen: Recipes from current items

### Cost Tracking

| Model           | Cost/Call | Est. Monthly       |
| --------------- | --------- | ------------------ |
| Claude 3 Sonnet | $0.003    | ~$300 (100K calls) |
| With caching    | $0.0009   | ~$90 (70% hit)     |

### Deliverables

- [ ] `ml-stack.ts` — Bedrock + SageMaker integration
- [ ] `ml-recommendations.js` — Recommendation engine
- [ ] `Query.getRecipeRecommendations.js` — Resolver
- [ ] `Mutation.setUserPreferences.js` — Resolver
- [ ] `ML_RECOMMENDATIONS_GUIDE.md` — Setup + prompting
- [ ] A/B testing framework
- [ ] Preference inference from history
- [ ] Performance benchmarks

### Team Dependencies

- **W2**: Implement resolvers
- **W4**: Fine-tune Bedrock prompts
- **W6-W7**: UI for preferences + recommendations
- **W9**: Monitor Bedrock costs

---

## Phase C.4: Image Optimization (Week 4-5)

### What's Being Built

**Objective**: Optimize image storage and delivery across devices.

#### Image Processing Pipeline

- Automatic resizing (multiple sizes)
- Format optimization (WebP, AVIF, JPEG)
- Quality optimization (perceptual quality)
- EXIF data stripping
- Compression levels by device

**Image Variants**:

```
Original → Generated:
- Thumbnail: 120x120 (JPEG, 80% quality)
- List: 300x300 (WebP, 85% quality)
- Detail: 600x600 (WebP, 90% quality)
- FullHD: 1920x1920 (JPEG, 95% quality)
- AVIF: All sizes, 70% quality
```

#### CDN Integration

- CloudFront distribution
- Multiple image variants
- Cache optimization (caching rules)
- Signed URLs for private images
- Automatic cache invalidation

#### Storage Optimization

- S3 lifecycle policies
- Intelligent tiering
- Cost-based optimization
- Batch processing for historical images

#### GraphQL Schema

```graphql
type Image {
  id: ID!
  thumbnail: String! # 120x120
  list: String! # 300x300
  detail: String! # 600x600
  fullHd: String! # 1920x1920
  originalUrl: String!
  uploadedAt: DateTime!
  size: Int!
  format: String!
}

mutation UploadItemImage($file: Upload!, $itemId: ID!) {
  uploadItemImage(file: $file, itemId: $itemId) {
    success
    image {
      id
      thumbnail
      list
      detail
    }
  }
}
```

### Cost Savings

| Aspect            | Before | After  | Savings |
| ----------------- | ------ | ------ | ------- |
| Storage per image | 5 MB   | 2 MB   | 60%     |
| Transfer per load | 3 MB   | 0.8 MB | 73%     |
| Monthly CDN cost  | $500   | $150   | 70%     |

### Deliverables

- [ ] `image-stack.ts` — S3 + Lambda + CloudFront
- [ ] Image processing Lambda (Sharp)
- [ ] Signed URL generation
- [ ] CloudFront distribution config
- [ ] IMAGE_OPTIMIZATION_GUIDE.md`
- [ ] Performance metrics (load time, size reduction)
- [ ] Batch processing for historical images
- [ ] Mobile adaptive image selection

### Team Dependencies

- **W2**: Upload mutation implementation
- **W5-W7**: Mobile image display + optimization
- **W8**: Web image optimization

---

## Phase C.5: Multi-Region Support (Week 5-6)

### What's Being Built

**Objective**: Global deployment with sub-100ms latency worldwide.

#### Global Infrastructure

- Primary region (us-east-1)
- Secondary regions (eu-west-1, ap-southeast-1)
- Multi-region RDS (global database)
- Cross-region replication

#### Data Replication

- Active-active DynamoDB Global Tables
- RDS multi-region failover
- S3 cross-region replication
- Route53 latency-based routing

#### Compliance

- Data residency rules by region
- GDPR-compliant data handling
- Regional backups
- Cross-region recovery procedures

**Architecture**:

```
User Request
    ↓
Route53 (Latency-based routing)
    ├─ US Region (Primary)
    │  └─ AppSync → DynamoDB → S3
    │
    ├─ EU Region
    │  └─ AppSync → DynamoDB (replica) → S3
    │
    └─ AP Region
       └─ AppSync → DynamoDB (replica) → S3

Replication: <1s via Global Tables
```

### Deliverables

- [ ] `primary-stack.ts` — Primary region setup
- [ ] `secondary-stack.ts` — Secondary region setup
- [ ] DynamoDB Global Tables configuration
- [ ] S3 cross-region replication
- [ ] Route53 health checks + failover
- [ ] `MULTI_REGION_GUIDE.md` — Deployment procedures
- [ ] Regional failover tests
- [ ] Disaster recovery procedures

### Team Dependencies

- **W9**: Monitor replication lag + health
- **W10**: Global marketing infrastructure

---

## Phase C.6: Database Sharding (Week 6)

### What's Being Built

**Objective**: Horizontal scaling for massive datasets (100M+ items).

#### Sharding Strategy

- User-based sharding (consistent hashing)
- Shard key: householdId
- 16 logical shards → 1-3 physical clusters
- Future support for 256 shards

#### Shard Router

- Consistent hash ring
- Shard discovery service
- Hot shard detection
- Rebalancing automation

#### Migration Strategy

- Data migration during non-peak hours
- Dual-write period for consistency
- Validation and verification
- Rollback procedures

**Data Distribution**:

```
Shard Ring (16 logical shards):
Household 'abc123' → hash('abc123') % 16 = shard 7
                  → Physical Cluster 2 (shards 5-10)
                  → DynamoDB Table 'wfl-shard-2'
```

### Performance Impact

| Aspect           | Before      | After         |
| ---------------- | ----------- | ------------- |
| Query Latency    | 50-100ms    | 20-30ms       |
| Write Throughput | 10K ops/sec | 100K+ ops/sec |
| Storage Limit    | 10TB        | 50TB+         |
| Scale Units      | Limited     | Unlimited     |

### Deliverables

- [ ] `shard-stack.ts` — Sharding infrastructure
- [ ] Consistent hash ring implementation
- [ ] Shard router service
- [ ] Migration tools
- [ ] `SHARDING_GUIDE.md` — Strategy + procedures
- [ ] Shard health monitoring
- [ ] Hot shard detection + rebalancing
- [ ] Load tests (100K+ ops/sec)

---

## Implementation Priority

### Must Have (C.1-C.2)

1. Redis ElastiCache cluster
2. Hybrid caching layer
3. Analytics event system
4. Cost analysis module

### Should Have (C.3-C.4)

5. ML recommendation engine
6. Image optimization pipeline
7. CDN integration

### Nice to Have (C.5-C.6)

8. Multi-region deployment
9. Database sharding

---

## Success Metrics

### Performance

- Cache hit rate: 85%+
- P99 latency: <100ms
- Recommendation relevance: 85%+
- Image optimization: 60%+ size reduction

### Reliability

- Redis uptime: 99.9%
- Data replication lag: <1s
- Analytics capture rate: 100%
- Image processing success: 99.9%

### Cost Efficiency

- Cache cost reduction: 40%
- Image storage optimization: 50% reduction
- Total Phase C cost: $300-500/month (vs $50K+ for unoptimized)

### User Experience

- Faster page loads (cached queries)
- Better recommendations
- More detailed analytics
- Global availability

---

## Timeline

| Week | Focus              | Deliverables                               |
| ---- | ------------------ | ------------------------------------------ |
| 1-2  | Caching            | Redis cluster, hybrid cache, resolvers     |
| 2-3  | Analytics          | Event tracking, cost analysis, reports     |
| 3-4  | ML                 | Recommendation engine, Bedrock integration |
| 4-5  | Image Optimization | Processing pipeline, CDN, optimization     |
| 5-6  | Multi-Region       | Global tables, Route53, disaster recovery  |
| 6    | Sharding           | Shard router, migration tools, tests       |

---

## Team Blockers & Unblocking

### W2 (Backend)

**Blocker**: Resolver performance for large result sets  
**Unblocked by**: Phase C.1 (Redis caching)  
**Action**: Use cache patterns in resolvers

### W4 (AI)

**Blocker**: ML recommendation infrastructure  
**Unblocked by**: Phase C.3 (Bedrock integration)  
**Action**: Fine-tune prompts, implement A/B testing

### W6-W7 (Mobile)

**Blocker**: Display analytics and recommendations  
**Unblocked by**: Phase C.2-C.3 (APIs available)  
**Action**: Build UI screens for analytics + recommendations

### W9 (Analytics)

**Blocker**: Collect user behavior metrics  
**Unblocked by**: Phase C.2 (event tracking system)  
**Action**: Instrument features with event tracking

---

## Risks & Mitigation

| Risk                     | Impact | Mitigation                           |
| ------------------------ | ------ | ------------------------------------ |
| Redis failover latency   | High   | Test failover, monitor metrics       |
| Analytics lag            | Medium | Use streaming, not batch             |
| ML model accuracy        | Medium | A/B test, gather feedback            |
| Image processing costs   | Medium | Cache variants, use lifecycle        |
| Cross-region consistency | High   | Use Global Tables, test replication  |
| Sharding complexity      | High   | Implement gradually, test thoroughly |

---

## Dependencies & Prerequisites

### Before Phase C.1 (Caching)

- [ ] VPC configured (NetworkStack)
- [ ] ElastiCache subnet groups
- [ ] Security group rules for Redis
- [ ] Test environment variables

### Before Phase C.2 (Analytics)

- [ ] DynamoDB GSI for analytics queries
- [ ] TTL configuration on event table
- [ ] Batch write Lambda
- [ ] CloudWatch log groups

### Before Phase C.3 (ML)

- [ ] Bedrock access enabled
- [ ] IAM roles for Lambda → Bedrock
- [ ] Prompt templates in Parameter Store
- [ ] Model performance baseline

### Before Phase C.4 (Images)

- [ ] Image processing Lambda package
- [ ] CloudFront distribution
- [ ] S3 lifecycle policies
- [ ] Signed URL signing key

### Before Phase C.5 (Multi-Region)

- [ ] Primary stack fully tested
- [ ] Cross-region routing strategy
- [ ] Replication monitoring setup
- [ ] Disaster recovery plan

### Before Phase C.6 (Sharding)

- [ ] Shard hash algorithm
- [ ] Migration tooling
- [ ] Monitoring for hot shards
- [ ] Failover procedures

---

## Next Steps

1. **Approve Phase C scope** — Review with team
2. **Assign ownership** — W1 + supporting workers
3. **Begin Phase C.1** — Redis caching infrastructure
4. **Enable parallel development** — Teams can start Phase B without C
5. **Monitor progress** — Weekly updates on metrics

---

## Summary

W1 Phase C builds the infrastructure foundation for advanced features, enabling the platform to scale to millions of users while maintaining <100ms latency and $300-500/month cost. Work proceeds in parallel to Phase B feature development, unblocking teams as infrastructure components complete.

**Status**: Ready to begin  
**Timeline**: 4-6 weeks  
**Success**: All 6 components deployed and tested in production-like environment
