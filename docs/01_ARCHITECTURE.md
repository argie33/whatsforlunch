# 01 — Architecture

## Architecture principles

1. **Local-first**: app works fully offline; cloud is a sync target, not a dependency
2. **Serverless-first**: no servers to patch; pay for what we use; scale to zero
3. **Single source of truth**: every entity has one authoritative store; everywhere else is a cache/replica
4. **Boundaries are contracts**: Zod schemas are shared between mobile + Lambda; the contract is the source of truth
5. **Defense in depth**: auth at edge, auth at API, auth at data — never rely on a single layer
6. **Observable by default**: structured logs + tracing + metrics + errors from day one
7. **Reproducible**: every environment is recreated from CDK; nothing is configured manually
8. **Future-extensible**: business logic lives in Lambdas reusable by AppSync, REST API Gateway, MCP server

## High-level system diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Mobile App (iOS + Android)                    │
│                  React Native + Expo + Tamagui                   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ UI Layer (expo-router screens, Tamagui components)       │   │
│  └──────────────┬───────────────────────────────────────────┘   │
│                 │                                                │
│  ┌──────────────▼───────────────────────────────────────────┐   │
│  │ Data Service Layer (TypeScript)                          │   │
│  │  - ContainersService    - AiService                      │   │
│  │  - ItemsService         - NotificationsService           │   │
│  │  - HouseholdsService    - SyncService                    │   │
│  │  - ScannerService       - AnalyticsService               │   │
│  └──────────────┬───────────────────────────────────────────┘   │
│                 │ all reads/writes go here                       │
│  ┌──────────────▼───────────────────────────────────────────┐   │
│  │ Local Store (WatermelonDB / SQLite)                      │   │
│  │  - Source of truth for the app                           │   │
│  │  - Reactive observables for UI                           │   │
│  │  - Sync metadata (_version, _lastChangedAt)              │   │
│  └──────────────┬───────────────────────────────────────────┘   │
│                 │ async sync queue                               │
└─────────────────┼───────────────────────────────────────────────┘
                  │ HTTPS (TLS 1.3)
                  │
┌─────────────────▼───────────────────────────────────────────────┐
│                       AWS Cloud (us-east-1 primary)              │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Edge: CloudFront + AWS WAF                              │   │
│  └────────┬─────────────────────────────┬───────────────────┘   │
│           │                             │                        │
│   ┌───────▼────────┐         ┌──────────▼────────────┐          │
│   │ Cognito User   │         │ AppSync GraphQL       │          │
│   │ Pools          │         │  - JS resolvers       │          │
│   │  - Magic link  │         │  - Subscriptions (WS) │          │
│   │  - Apple SSO   │         │  - Cognito authorizer │          │
│   │  - Google SSO  │         │  - Lambda resolvers   │          │
│   │  - TOTP MFA    │         └─────┬───────────┬─────┘          │
│   └────────────────┘               │           │                 │
│                                    │           │                 │
│   ┌────────────────────┐    ┌──────▼─────┐ ┌──▼──────────────┐  │
│   │  S3 Buckets        │    │ DynamoDB   │ │ Lambdas (ARM64) │  │
│   │  - photos          │    │  Single    │ │  - classify     │  │
│   │  - exports         │    │  table     │ │  - ocr-receipt  │  │
│   │  - app assets      │    │  + GSIs    │ │  - suggest-rec  │  │
│   └────────────────────┘    └────────────┘ │  - suggest-rest │  │
│                                            │  - notify       │  │
│                                            │  - delete-acct  │  │
│                                            │  - billing-hook │  │
│                                            │  - export-data  │  │
│                                            └────────┬────────┘  │
│                                                     │           │
│   ┌─────────────┐  ┌────────────┐  ┌──────────────▼──────────┐ │
│   │  Bedrock    │  │ Textract   │  │  External APIs          │ │
│   │  (Claude)   │  │  (OCR)     │  │  - Google Places        │ │
│   └─────────────┘  └────────────┘  │  - RevenueCat webhooks  │ │
│                                    │  - PostHog              │ │
│                                    │  - SES (email)          │ │
│                                    └─────────────────────────┘ │
│                                                                  │
│   ┌────────────────────────────────────────────────────────┐    │
│   │  SNS Mobile Push → APNs (iOS) + FCM (Android)          │    │
│   └────────────────────────────────────────────────────────┘    │
│                                                                  │
│   ┌────────────────────────────────────────────────────────┐    │
│   │  Observability                                          │    │
│   │  CloudWatch Logs, Metrics, X-Ray, GuardDuty,           │    │
│   │  Security Hub, CloudTrail, AWS Inspector               │    │
│   └────────────────────────────────────────────────────────┘    │
│                                                                  │
│   ┌────────────────────────────────────────────────────────┐    │
│   │  Secrets: Secrets Manager + SSM Parameter Store         │    │
│   └────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

## Frontend architecture (mobile app)

### Tech stack
- **Framework**: React Native 0.74+ with Hermes
- **Build/dev**: Expo SDK 51+ (managed workflow with development builds)
- **Routing**: expo-router (file-based, native stack navigator)
- **UI**: Tamagui (compile-time atomic CSS, design tokens)
- **State**:
  - Zustand for UI state (modals, sheets, transient)
  - TanStack Query for server-cached state (when interacting with non-Watermelon data, e.g. recipes, places)
  - WatermelonDB observables for the inventory data
- **Forms**: react-hook-form + Zod
- **Animation**: Reanimated 3 + Moti
- **Gestures**: react-native-gesture-handler
- **Lists**: @shopify/flash-list
- **Sheets**: @gorhom/bottom-sheet v5
- **Image**: expo-image
- **Camera**: react-native-vision-camera v4 + vision-camera-code-scanner (barcode + QR)
- **Notifications**: expo-notifications (local) + react-native-notifications (rich content extensions)
- **Storage**:
  - WatermelonDB for entity data (encrypted with SQLCipher)
  - react-native-mmkv (encrypted) for caches and settings
  - expo-secure-store for tokens and secrets
- **Auth**: AWS Amplify Auth library (Cognito wrapper) + native sign-in modules
- **GraphQL**: AWS Amplify API library (handles AppSync subscriptions, auth headers)
- **Analytics**: PostHog React Native SDK
- **Errors**: Sentry React Native SDK

### Layered architecture

```
┌─────────────────────────────────────┐
│ Screens (expo-router routes)        │  thin, no business logic
├─────────────────────────────────────┤
│ Components (presentational)         │  Tamagui-based, reusable
├─────────────────────────────────────┤
│ Features (use-case orchestration)   │  hooks like useScanContainer()
├─────────────────────────────────────┤
│ Services (data + cloud logic)       │  ContainersService, AiService
├─────────────────────────────────────┤
│ Repositories (storage abstraction)  │  WatermelonDB queries
├─────────────────────────────────────┤
│ Models (Watermelon entities + Zod)  │  source of truth for shape
└─────────────────────────────────────┘
```

The UI never imports WatermelonDB or AWS SDKs directly. It calls features → services → repositories.

### Sync engine

We use **AWS Amplify DataStore** patterns (via AppSync `delta sync`) to keep WatermelonDB in sync with DynamoDB.

- Every entity has `_version` (int) and `_lastChangedAt` (timestamp)
- Mutations go through AppSync; AppSync increments `_version` and writes to Dynamo
- Local writes update local `_version` optimistically
- On reconnect, client requests deltas since `lastSyncTimestamp`
- AppSync subscription pushes changes from other devices in real-time when online
- Conflict resolution:
  - Default: **Auto-Merge** (per-field last-write-wins by `_lastChangedAt`)
  - Custom Lambda resolver for `quantity` (sum the deltas)
  - Custom resolver for `status` (server-wins; once "eaten", can't be "active" again)

### Offline-first guarantees

| Action | Online | Offline |
|---|---|---|
| Scan QR | Same | Same (local lookup, queue sync) |
| Add item | Instant local write + queued sync | Same |
| Photo upload | Compressed → S3 directly | Queued; uploads on reconnect |
| AI classification | Real-time call | Queued; runs on reconnect; user can edit manually meanwhile |
| Push notification (local) | Scheduled by OS | Same (works offline) |
| Push notification (server) | Delivered via APNs/FCM | Queued by APNs/FCM up to TTL |
| Household sync | Real-time via subscription | Buffered; merges on reconnect |

## Backend architecture (AWS)

### Region strategy

- **Primary**: `us-east-1` (broadest service availability, lowest Bedrock latency)
- **EU users (future)**: `eu-west-1` mirror with data residency
- **Multi-region active-active**: not at MVP; design data model to support it later (UUID PKs, no monotonic IDs, idempotent writes)

### Service-by-service

#### Cognito User Pools
- **Pool**: one per environment (`wfl-dev`, `wfl-staging`, `wfl-prod`)
- **App clients**: one for mobile (no client secret; uses PKCE)
- **Federation**: Sign in with Apple, Sign in with Google as identity providers
- **Custom auth flow**: Lambda triggers for email magic links
  - `DefineAuthChallenge`, `CreateAuthChallenge`, `VerifyAuthChallengeResponse`
  - `CreateAuthChallenge` sends magic link via SES, stores HMAC-signed nonce in DynamoDB with 10-min TTL
- **MFA**: TOTP optional at MVP, mandatory roadmap for household admins
- **Advanced security mode**: ENFORCED (compromised credential checks, adaptive auth)
- **Triggers**:
  - `PostConfirmation`: creates `profiles` record in Dynamo
  - `PreSignUp`: validates email domain, blocks disposable emails (uses public list)
  - `CustomMessage`: customizes verification email branding via SES

#### AppSync (GraphQL API)
- **Schema**: defined in `infra/cdk/lib/appsync/schema.graphql`, generated code shared via `packages/shared`
- **Authorization**: Cognito User Pools (primary) + AWS_IAM (for system Lambdas) + API_KEY (for CDN-cached public reads, future)
- **Resolvers**:
  - **JS resolvers** (APPSYNC_JS runtime) for all DynamoDB CRUD — no Lambda cold starts on hot paths
  - **Lambda resolvers** for: AI classification, recipe suggestions, restaurant suggestions, OCR receipt parsing, account deletion, data export
- **Subscriptions**: WebSocket-based, used for household real-time sync
- **Caching**: AppSync per-resolver cache for `food_rules` query (hot, low-cardinality)
- **Introspection**: disabled in prod via WAF rule blocking `__schema`/`__type`
- **Depth limit**: 7 levels (custom Lambda authorizer)
- **Complexity limit**: 1000 points

#### DynamoDB
- **Single table**: `WFL-Main-{env}` with PK + SK + 4 GSIs
- See [02_DATA_MODEL.md](02_DATA_MODEL.md) for full schema
- **Encryption**: customer-managed KMS key (CMK) per environment
- **Backup**: Point-in-Time Recovery enabled; daily AWS Backup snapshot retained 35 days
- **Streams**: enabled (NEW_AND_OLD_IMAGES) → fan out to: search indexer (OpenSearch, future), audit logger, notification scheduler
- **Capacity**: on-demand at MVP; switch to provisioned with auto-scaling once traffic patterns are predictable

#### S3 buckets
- `wfl-photos-{env}` — food photos, encrypted SSE-KMS, lifecycle to Intelligent-Tiering on day 0, soft-delete 30 days
- `wfl-exports-{env}` — user data exports (GDPR), 7-day expiry
- `wfl-app-assets-{env}` — static assets (illustrations, food rules JSON)
- All buckets: Public Access Block ON, OAC for CloudFront, deny non-TLS
- Pre-signed PUT URLs (15-min TTL) for client uploads with content-type + size constraints

#### Lambda functions (ARM64, Node.js 20)
| Function | Trigger | Purpose |
|---|---|---|
| `auth-define-challenge` | Cognito | Magic link auth flow |
| `auth-create-challenge` | Cognito | Generate + send magic link |
| `auth-verify-challenge` | Cognito | Validate magic link |
| `auth-pre-signup` | Cognito | Block disposable emails |
| `auth-post-confirm` | Cognito | Create profile record |
| `classify-food` | AppSync | Bedrock Claude photo classification |
| `ocr-expiry-date` | AppSync | Textract scan of printed expiry on packaging |
| `ocr-receipt` | AppSync | Textract receipt parsing |
| `suggest-recipes` | AppSync | Bedrock Claude recipe generation |
| `suggest-restaurants` | AppSync | Google Places + Bedrock ranking |
| `learn-preferences` | DynamoDB Stream | Update user food preferences from item events |
| `notify-expiring` | EventBridge cron | Send daily digest pushes |
| `delete-account` | AppSync | GDPR cascade deletion via Step Function |
| `export-data` | AppSync | Generate ZIP of user data → S3 signed URL |
| `revenuecat-webhook` | API Gateway | Sync subscription status from RevenueCat |
| `image-resize` | S3 ObjectCreated | Generate thumbnail variants |
| `food-rules-publish` | Manual | Bump version + push to all clients |

All Lambdas use AWS Lambda Powertools (logger, tracer, metrics, idempotency) and bundled with esbuild via CDK NodejsFunction.

#### Bedrock (Claude)
- Models used:
  - **Claude Haiku 4.5** for fast classification, OCR confirmation, simple suggestions
  - **Claude Sonnet 4.6** for complex tasks (recipe generation, restaurant ranking, preference learning)
- Prompt caching enabled on all calls
- Cost tracked per-user via DynamoDB counter
- Rate limits enforced in Lambda before Bedrock call

#### Amazon Textract
- Used for OCR of printed expiry dates on packaging (`ocr-expiry-date` Lambda)
- Used for OCR of grocery receipts (`ocr-receipt` Lambda)
- Falls back to Claude vision if Textract confidence is low

#### SNS Mobile Push
- Platform applications: `WFL-iOS-{env}` (APNs) and `WFL-Android-{env}` (FCM)
- Device tokens stored in `devices` table; endpoints created on registration
- Stale tokens (90 days no activity) cleaned by EventBridge cron

#### CloudFront
- **One distribution per env** with origins:
  - S3 (photos via OAC)
  - AppSync (regional caching of public queries — `food_rules`)
  - API Gateway (REST + MCP, future)
- **WAF rules**: AWSManagedRulesCommonRuleSet, KnownBadInputsRuleSet, AmazonIpReputationList, rate-based 2000/5min/IP, geo block (none at MVP, ready to add)
- HTTP/3 + Brotli enabled
- Cache photos 1 year (immutable URLs with content-hash)

#### Secrets & config
- **AWS Secrets Manager**: third-party API keys (Google Places, RevenueCat webhook secret, Sentry DSN if treated as secret)
- **SSM Parameter Store** (Standard, free): non-secret config (model IDs, retention days, feature flags)
- Lambdas use **Parameters and Secrets Lambda Extension** to cache fetches

#### Step Functions
- `delete-account-flow`: orchestrates GDPR cascade — Cognito delete, Dynamo per-user item scan + delete, S3 photo delete, audit log write, confirmation email
- `process-receipt-flow`: Textract async result → parse → match against food rules → create items

#### EventBridge
- Daily cron: trigger `notify-expiring` for digest pushes
- Event bus for cross-service events (`item.created`, `item.expired`, `item.eaten`) — used for: analytics, learning, future webhooks

## Middleware

### "Middleware" in our app means:
1. **AppSync resolvers** (the GraphQL boundary)
2. **Lambda functions** (business logic)
3. **DynamoDB Streams + EventBridge** (async event processing)

### AppSync resolver organization

```
infra/cdk/lib/appsync/
├── schema.graphql                      # source of truth
├── resolvers/
│   ├── Query/
│   │   ├── getContainer.js             # JS resolver, direct DynamoDB
│   │   ├── listItems.js
│   │   ├── getFoodRules.js             # cached
│   │   ├── searchItems.js              # uses GSI
│   │   ├── getRecipeSuggestions.js     # Lambda resolver
│   │   ├── getNearbyRestaurants.js     # Lambda resolver
│   │   └── ...
│   ├── Mutation/
│   │   ├── createContainer.js
│   │   ├── createItem.js
│   │   ├── updateItem.js
│   │   ├── markItemEaten.js
│   │   ├── classifyItemPhoto.js        # Lambda resolver
│   │   ├── ocrExpiryDate.js            # Lambda resolver
│   │   └── ...
│   └── Subscription/
│       ├── onItemChanged.js            # filtered by householdId
│       ├── onContainerChanged.js
│       └── ...
└── functions/                          # AppSync functions (composed in pipelines)
    ├── checkAuth.js
    ├── checkHouseholdMembership.js
    ├── enrichWithProfile.js
    └── ...
```

### Lambda business logic structure

```
services/
├── shared/                              # Shared code across Lambdas
│   ├── powertools.ts
│   ├── dynamoClient.ts
│   ├── bedrockClient.ts
│   ├── textractClient.ts
│   ├── snsClient.ts
│   ├── auth.ts
│   ├── errors.ts
│   └── logger.ts
├── ai/
│   ├── classify-food/
│   │   ├── handler.ts
│   │   ├── prompts.ts
│   │   ├── schema.ts
│   │   └── handler.test.ts
│   ├── ocr-expiry-date/
│   ├── ocr-receipt/
│   ├── suggest-recipes/
│   ├── suggest-restaurants/
│   └── learn-preferences/
├── auth/
│   ├── define-challenge/
│   ├── create-challenge/
│   ├── verify-challenge/
│   ├── pre-signup/
│   └── post-confirm/
├── notifications/
│   └── notify-expiring/
├── account/
│   ├── delete-account/
│   └── export-data/
├── billing/
│   └── revenuecat-webhook/
└── images/
    └── image-resize/
```

## Backend (compute) architecture decisions

| Concern | Decision | Why |
|---|---|---|
| API style | GraphQL via AppSync (primary) + REST API Gateway (future public API) | Real-time subs, single endpoint, schema-first |
| Auth | Cognito User Pools | Free up to 50k MAU; native AWS integration |
| DB | DynamoDB single-table | Scales to zero; cost-effective at all scales |
| Search (text) | OpenSearch Serverless (Wave 3+, when needed) | Until ~1k items per household, client-side filter is faster |
| Compute | Lambda ARM64 | 20% cheaper, 15% faster for JS |
| Sync | AppSync delta sync + WatermelonDB | Industry-standard; battle-tested |
| AI | Bedrock (Claude) | Data stays in AWS; one bill |
| OCR | Textract + Bedrock fallback | Textract is more accurate for printed text |
| Push | SNS Mobile Push | AWS-native; cheaper than Pinpoint |
| CDN | CloudFront + WAF | Required for OAC and DDoS protection |
| Tracing | X-Ray + Sentry | Both — X-Ray for infra, Sentry for app |
| Secrets | Secrets Manager (rotated) + SSM (config) | Right tool per use; cost-conscious |
| IaC | AWS CDK (TypeScript) | Type-safe, share types with app |
| CI/CD | GitHub Actions + OIDC | No long-lived AWS keys |

## Multi-tenant isolation model

Even though we're consumer (not B2B), data isolation is critical:

- **Per-user**: profiles, preferences, devices, AI quota counters, subscription state
- **Per-household**: containers, items, photos, audit log, shopping list, recipe history
- **Global (read-only for users)**: food_rules, app_assets, public recipes (Wave 5)

IAM + Cognito + AppSync resolver checks enforce that:
- A user can only mutate their own profile
- A user can only read/write items in households they're a member of
- A non-owner household member cannot delete the household
- A user cannot enumerate households or users

See [04_SECURITY.md](04_SECURITY.md) for the full authorization model.

## Scaling targets

| Stage | Users | Daily req | Monthly cost (estimated) |
|---|---|---|---|
| Beta | 100 | 50K | $20 |
| MVP launch | 1,000 | 500K | $50–80 |
| Growth | 10,000 | 5M | $400–700 |
| Scale | 100,000 | 50M | $3,500–6,000 |
| Mature | 1,000,000 | 500M | $30K–50K (with provisioned capacity discounts) |

Cost levers when we exceed thresholds:
- Switch DynamoDB on-demand → provisioned with auto-scaling (~50% savings)
- Move Bedrock to provisioned throughput (Wave 4+, ~30% savings)
- Add OpenSearch Serverless once households exceed 1k items (defer until needed)
- Reserved capacity for steady-state Lambda

## Disaster recovery

| Scenario | Strategy |
|---|---|
| Region failure (us-east-1 down) | Failover to multi-region replica (Wave 6) |
| DynamoDB corruption | PITR restore + replay DynamoDB Streams |
| S3 photo loss | Versioning ON; lifecycle rule retains delete markers 30 days |
| Cognito user pool deleted | Daily backup of user pool to S3 (Lambda export) |
| AWS account compromise | CloudTrail to S3 with object lock; MFA on root + IAM identity center |
| Mobile app stuck on broken release | EAS Update OTA rollback in <5 min |

## Compliance considerations baked into architecture

- **GDPR Article 17 (deletion)**: `delete-account-flow` Step Function; complete within 30 days
- **GDPR Article 15 (access)**: `export-data` Lambda; ZIP delivered via signed URL
- **App Store 5.1.1(v) (account deletion)**: in-app, not email-only
- **CCPA**: data export + deletion built-in
- **SOC 2 readiness**: CloudTrail, GuardDuty, Security Hub enabled

## What we explicitly DON'T build (yet)

- Multi-region active-active (designed for, not built)
- Public REST API (Wave 6)
- MCP server (Wave 6)
- OpenSearch (Wave 3+ when needed)
- Container hardware integrations (Phase 10, separate track)
- Fancy ML models on-device (always Bedrock)
- Federated identity beyond Apple/Google (no Twitter, Facebook)

## Cross-references

- Data model details → [02_DATA_MODEL.md](02_DATA_MODEL.md)
- API contract → [03_API_SPEC.md](03_API_SPEC.md)
- Security details → [04_SECURITY.md](04_SECURITY.md)
- AI specifics → [06_AI_INTEGRATION.md](06_AI_INTEGRATION.md)
- Deployment → [08_DEPLOYMENT.md](08_DEPLOYMENT.md)
- Worker assignments → [15_WORKER_TRACKS.md](15_WORKER_TRACKS.md)
