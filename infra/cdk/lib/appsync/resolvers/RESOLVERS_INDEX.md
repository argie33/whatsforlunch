# AppSync Resolvers Index

This document lists all GraphQL resolvers and their implementation status.

## Phase A Resolvers (MVP Foundation)

### Query Resolvers

| Field | Status | File | Notes |
|-------|--------|------|-------|
| `me` | ✅ DONE | Query.me.js | Get authenticated user profile |
| `myHouseholds` | ✅ DONE | Query.myHouseholds.js | List user's households via GSI1 |
| `foodRules` | ✅ DONE | Query.foodRules.js | Cache-aware food rules (version check) |
| `listItems` | ✅ DONE | Query.listItems.js | List household items with filters |
| `household` | ⏳ TODO | — | Get single household by ID |
| `householdInvite` | ⏳ TODO | — | Get invite by token (for accept flow) |
| `container` | ⏳ TODO | — | Get container by ID |
| `containerByQrToken` | ⏳ TODO | — | Lookup container by QR token (GSI4) |
| `listContainers` | ⏳ TODO | — | List household containers |
| `item` | ⏳ TODO | — | Get single item by ID |
| `itemsExpiringSoon` | ⏳ TODO | — | Get items expiring within N hours (GSI2) |
| `searchItems` | ⏳ TODO | — | Search household items by name |
| `itemByBarcode` | ⏳ TODO | — | Lookup item by barcode (GSI4) |
| `shoppingList` | ⏳ TODO | — | Get shopping list for household |
| `deltaSync` | ⏳ TODO | — | Get changes since last sync (W8 dependency) |

### Mutation Resolvers

| Field | Status | File | Notes |
|-------|--------|------|-------|
| `createItem` | ✅ DONE | Mutation.createItem.js | Create food item with AI/OCR source |
| `updateItem` | ✅ DONE | Mutation.updateItem.js | Update item fields with optimistic concurrency |
| `deleteItem` | ✅ DONE | Mutation.deleteItem.js | Soft delete item |
| `markItemEaten` | ✅ DONE | Mutation.markItemEaten.js | Status: eaten |
| `markItemTossed` | ✅ DONE | Mutation.markItemTossed.js | Status: tossed |
| `markItemFrozen` | ✅ DONE | Mutation.markItemFrozen.js | Status: frozen (extends expiry) |
| `createHousehold` | ✅ DONE | Mutation.createHousehold.js | Create household owned by user |
| `updateProfile` | ⏳ TODO | — | Update user profile (email, prefs, timezone) |
| `registerDevice` | ⏳ TODO | — | Register device for push notifications |
| `deleteAccount` | ⏳ TODO | — | Delete user account (Step Function trigger) |
| `updateHousehold` | ⏳ TODO | — | Update household metadata |
| `deleteHousehold` | ⏳ TODO | — | Delete household (owner only) |
| `inviteToHousehold` | ⏳ TODO | — | Generate invite token |
| `acceptHouseholdInvite` | ⏳ TODO | — | Accept invite token, add user as member |
| `removeHouseholdMember` | ⏳ TODO | — | Remove member (owner only) |
| `leaveHousehold` | ⏳ TODO | — | User leaves household |
| `changeRole` | ⏳ TODO | — | Change member role (owner only) |
| `createContainer` | ⏳ TODO | — | Create QR-scanned container |
| `updateContainer` | ⏳ TODO | — | Update container metadata |
| `archiveContainer` | ⏳ TODO | — | Soft-archive container |
| `unarchiveContainer` | ⏳ TODO | — | Restore archived container |
| `markItemPartial` | ⏳ TODO | — | Partial consumption (used amount text) |
| `transferItem` | ⏳ TODO | — | Move item to different container |
| `snoozeItem` | ⏳ TODO | — | Temporarily hide item |
| `bulkCreateItems` | ⏳ TODO | — | Batch create items |
| `bulkUpdateItemStatus` | ⏳ TODO | — | Batch status update |
| `classifyItemPhoto` | 🔗 LAMBDA | — | AI photo classification (calls W4 Lambda) |
| `ocrExpiryDate` | 🔗 LAMBDA | — | OCR date detection (calls W4 Lambda) |
| `ocrReceipt` | 🔗 LAMBDA | — | OCR receipt (async, calls W4 Lambda) |
| `addShoppingItem` | ⏳ TODO | — | Add item to shopping list |
| `updateShoppingItem` | ⏳ TODO | — | Update shopping list item |
| `markShoppingItemPurchased` | ⏳ TODO | — | Mark item as purchased |
| `deleteShoppingItem` | ⏳ TODO | — | Remove from shopping list |
| `presignedPhotoUpload` | ⏳ TODO | — | Get signed S3 upload URL |

### Subscription Resolvers

| Field | Status | Notes |
|-------|--------|-------|
| `onContainerChanged` | ⏳ TODO | Fires on container mutations |
| `onItemChanged` | ⏳ TODO | Fires on item mutations |
| `onShoppingListChanged` | ⏳ TODO | Fires on shopping list mutations |
| `onHouseholdChanged` | ⏳ TODO | Fires on household mutations |

## Implementation Progress

**Phase A Status**: 7 / 50+ resolvers complete (14%)

- **Queries**: 4 done, 11 todo
- **Mutations**: 8 done, 27+ todo
- **Subscriptions**: 0 done, 4 todo

**Done (✅)**: Profile, household CRUD basics, item CRUD + status updates, food rules cache

**Next Priority**: 
1. Household & container queries (Phase A foundation)
2. Shopping list CRUD (quick)
3. Device registration (notifications)
4. Invite flow (household sharing)

**Phase B** will add:
- AI/OCR Lambda integrations (W4 collaboration)
- Real-time subscriptions
- Advanced queries (expiring, search, barcode)
- Account deletion flow

## For W1: CDK Wiring

Each resolver needs to be wired in CDK like:

```typescript
new appsync.Resolver(stack, 'QueryMeResolver', {
  api,
  typeName: 'Query',
  fieldName: 'me',
  dataSourceId: 'lambda-datasource',
  code: appsync.Code.fromAsset('lib/appsync/resolvers/Query.me.js'),
});
```

Resolver file → CDK `Resolver` construct → AppSync API.

See `infra/cdk/lib/stacks/api-stack.ts` (TODO: create) for integration.

## Testing Each Resolver

Each resolver should have integration tests:

```bash
# Mock DynamoDB locally
npm run test:resolvers

# Deploy to ephemeral env and test
npm run test:integration
```

Tests go in `services/__tests__/resolvers/` (TODO: create).

## Error Codes Returned

All resolvers return GraphQL errors with codes:

- `UNAUTHENTICATED` — No valid Cognito JWT
- `FORBIDDEN` — User lacks permissions
- `NOT_FOUND` — Item doesn't exist
- `CONFLICT` — Version mismatch (optimistic concurrency failure)
- `VALIDATION_ERROR` — Invalid input
- `RATE_LIMITED` — AI quota / general rate limit exceeded
- `INTERNAL_ERROR` — Unexpected server error

Mobile client shows `userMessage` to users; logs error code to Sentry.

## Common Patterns

### Read Query

```javascript
const item = await getItem(pk, sk);
if (!item) return { errorType: 'NOT_FOUND', ... };
return mapToGraphQL(item);
```

### Write Mutation

```javascript
const entity = buildCommonAttributes({ ...input });
await putItem(entity);
return mapToGraphQL(entity);
```

### Status Update

```javascript
const updated = { ...item, status: 'eaten', updatedAt: now, _version: item._version + 1 };
await putItem(updated);
await logItemEvent(householdId, itemId, userId, 'markedEaten', {});
return mapToGraphQL(updated);
```

### Optimistic Concurrency

```javascript
await updateItemWithVersion(pk, sk, updates, expectedVersion);
// Fails with CONFLICT if version mismatches
```

## Phase B Planning

After Phase A is complete and merged:

1. **W2 continues** with remaining query/mutation/subscription resolvers
2. **W4 provides** Lambda ARNs for AI/OCR mutations (after Phase A)
3. **W3 provides** auth Lambda ARNs for custom Cognito flow
4. **W1 integrates** Lambdas as AppSync data sources
5. **W8 tests** `deltaSync` against WatermelonDB sync engine
6. **W6/W7 test** mutations against mobile client

All Phase A resolvers must pass unit + integration tests before Phase B starts.
