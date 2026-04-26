# W2 Backend/Data — Phase A Summary

**Status**: Phase A COMPLETE (pending W1 CDK wiring and CI integration)

Phase A deliverables for W2 (Backend / Data):
- ✅ GraphQL schema with all types, queries, mutations, subscriptions
- ✅ Zod validation schemas for runtime type checking
- ✅ DynamoDB access pattern helpers (single-table design)
- ✅ Resolver scaffolding + reference implementations
- ✅ FoodRule seed data (~30 entries, extensible to 150+)

## Files Created

### GraphQL Schema
- `infra/cdk/lib/appsync/schema.graphql` — Complete SDL schema
  - All entity types (Profile, Household, Container, Item, FoodRule, etc.)
  - All queries, mutations, subscriptions
  - Auth directives (@aws_cognito_user_pools)
  - Error model and rate limiting info

### Validation Schemas (Zod)
- `packages/shared/src/schemas/entities.ts` — TypeScript schemas for all entity types
  - Profile, Household, HouseholdMember, Container, Item, FoodRule, Device, ShoppingListItem, etc.
  - Exported types for use in mobile + Lambda code
  - Runtime validation for API inputs

### DynamoDB Access Patterns
- `packages/shared/src/db/access-patterns.ts` — Single-table key builders
  - Pattern functions for all entity types
  - Query builders for common access patterns (GSI1–4)
  - Documented partition/sort key strategies

### Seed Data
- `packages/shared/src/db/food-rules.seed.ts` — ~30 common food types
  - Cooked proteins (chicken, beef, fish, pork, turkey, tofu)
  - Raw proteins (chicken, beef, fish)
  - Dairy (milk, yogurt, cheeses, butter, cream)
  - Produce (vegetables: lettuce, tomato, cucumber, etc.; fruits: apple, banana, strawberry, etc.)
  - Grains & baked (bread, rice, pasta, tortillas)
  - Prepared leftovers (pizza, soup, casserole, curry, salads)
  - Sauces & condiments (tomato, cream, mayo, peanut butter, etc.)
  - Beverages
  - Extensible to 150+ by adding more entries

### Resolver Scaffolding
- `infra/cdk/lib/appsync/resolvers/` — Reference implementations
  - `utils.js` — Shared DynamoDB + auth + error helpers
  - `Query.me.js` — Get authenticated user's profile (reference query)
  - `Query.listItems.js` — List household items with filters (reference list query)
  - `Mutation.createItem.js` — Create new item (reference write mutation)
  - `Mutation.markItemEaten.js` — Update item status (reference update mutation)
  - `README.md` — Resolver pattern guide + adding new resolvers

## What's Ready for W1

W1 (Infrastructure) can now:

1. **Wire resolvers in CDK** — AppSync data source → Lambda → resolver mappings
   - Use `appsync.Resolver` construct to link schema fields to JS resolvers
   - Reference resolver files: `infra/cdk/lib/appsync/resolvers/*.js`

2. **Deploy AppSync API** — Use `aws appsync` CDK construct
   - Schema: `infra/cdk/lib/appsync/schema.graphql`
   - Auth: AppSync service takes Cognito ID from env

3. **Seed FoodRules** — Load `FOOD_RULES_SEED` into DynamoDB on deployment
   - Can be done via Lambda seeding function or DynamoDB batch write
   - Path: `packages/shared/src/db/food-rules.seed.ts`

## What Remains (Phase B)

W2 Phase B deliverables:

### Resolvers (~40 more needed)
- Query: `foodRules`, `itemsExpiringSoon`, `searchItems`, `itemByBarcode`, `myHouseholds`, `container`, `listContainers`, `shoppingList`, `deltaSync`
- Mutation: CRUD for Household, Container, ShoppingListItem, and status updates (tossed, frozen, partial, transfer, snooze)
- Mutation: `updateItem`, `deleteItem`, `bulkCreateItems`, `bulkUpdateItemStatus`
- Lambda resolvers for AI mutations (classifyItemPhoto, ocrExpiryDate)
- Subscription resolvers (onContainerChanged, onItemChanged, etc.)

### Tests & Validation
- Resolver test fixtures (mock DynamoDB)
- Conflict resolution tests (optimistic concurrency)
- Access pattern validation (GSI queries)
- Integration tests against ephemeral env (Phase C)

### Performance & Observability
- CloudWatch logs + metrics per resolver
- Sentry error tracking
- PostHog instrumentation for user actions

## Constraints & Notes

### Single-Table Design
- All entities in one DynamoDB table (`WFL-Main-{env}`)
- Partition key (PK) is entity-typed: `USER#...`, `HOUSEHOLD#...`, `RULES`, etc.
- Sort key (SK) is entity-specific: `PROFILE`, `META`, `ITEM#...`, `MEMBER#...`, etc.
- 4 Global Secondary Indexes for common query patterns (see access-patterns.ts)

### Version & Sync
- Every entity has `_version` (incremented on write) and `_lastChangedAt` (epoch ms)
- Used by WatermelonDB sync engine (W8) to detect conflicts
- Optimistic concurrency: UPDATE fails if version mismatches

### Soft Deletes
- Never hard delete; set `deletedAt` timestamp
- Queries filter out soft-deleted items
- Audit trail preserved for compliance

### Seed Data Scope
- FoodRule is read-mostly (cached at AppSync level)
- Version field used for cache invalidation
- Can be extended from 30 to 150+ entries; just add to `FOOD_RULES_SEED` array
- Schema is flexible for future AI-suggested rules

## How Other Workers Use This

- **W5 (Mobile Foundation)**: Uses Zod schemas for client-side validation + type generation
- **W3 (Auth)**: Adds Cognito triggers that call Profile CRUD resolvers
- **W4 (AI)**: Calls Bedrock Lambda, returns results to `classifyItemPhoto` and `ocrExpiryDate` resolvers
- **W6 (Mobile Core)**: Calls mutations to create items, update status; receives items from queries
- **W8 (Mobile Sync)**: Pulls changes via `deltaSync` query; applies conflict resolution
- **W9 (Ops/QA)**: Wires Sentry + PostHog; ensures resolver errors are tracked

## Next: Coordinate with W1

The GraphQL schema is stable for Phase A. If W1 needs clarifications:
- Schema fields and types are in `infra/cdk/lib/appsync/schema.graphql`
- Data model is in `docs/02_DATA_MODEL.md`
- Resolver patterns are in `infra/cdk/lib/appsync/resolvers/README.md`

Create a GitHub issue or discussion if:
- A resolver field semantics is unclear
- A mutation needs additional validation or auth checks
- A query performance concern arises
- Schema changes are needed for dependent workers

## CI/CD & Testing

Phase A focus is scaffolding & contracts. Phase B adds:

- Unit tests for resolvers (mock DynamoDB)
- Integration tests (ephemeral DynamoDB table in CI)
- Maestro E2E flows (mobile client → API → DB)
- Performance benchmarks (query latency SLOs)

All committed to repo; CI runs per PR.

---

**W2 is ready for Phase B feature development.** 🚀
