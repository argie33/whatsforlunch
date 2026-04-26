# AppSync Resolvers

This directory contains AWS AppSync resolver implementations for the GraphQL API.

## Structure

- `schema.graphql` — GraphQL SDL schema (canonical API contract)
- `utils.js` — Shared utilities (DynamoDB helpers, auth, errors)
- `Query.*.js` — Query field resolvers (read operations)
- `Mutation.*.js` — Mutation field resolvers (write operations)
- `Subscription.*.js` — Subscription resolvers (real-time)

## Pattern

Each resolver is a JavaScript function that:

1. Extracts arguments and user context
2. Validates permissions (via `checkHouseholdMembership`, etc.)
3. Performs DynamoDB operations
4. Maps DB record format to GraphQL response format
5. Returns errors or result

### Example: Simple Query

```javascript
const { getItem, getUserId } = require('./utils');

exports.handler = async (event) => {
  const userId = getUserId(event);
  const id = event.arguments.id;

  try {
    const item = await getItem(`USER#${userId}`, 'PROFILE');
    return { id: item.id, email: item.email, ... };
  } catch (error) {
    return { errorType: 'INTERNAL_ERROR', message: error.message };
  }
};
```

### Example: Write Mutation

```javascript
const { putItem, buildCommonAttributes, getUserId, checkHouseholdMembership } = require('./utils');

exports.handler = async (event) => {
  const userId = getUserId(event);
  const input = event.arguments.input;

  // Validate permissions
  await checkHouseholdMembership(userId, input.householdId);

  // Build entity with standard attributes
  const entity = buildCommonAttributes({
    entityType: 'Item',
    PK: `HOUSEHOLD#${input.householdId}`,
    SK: `ITEM#...`,
    ...input,
  });

  await putItem(entity);
  return entity;
};
```

## Resolver Naming

- `Query.<fieldName>.js` — Maps to GraphQL `type Query { <fieldName>(...): Type }`
- `Mutation.<fieldName>.js` — Maps to GraphQL `type Mutation { <fieldName>(...): Type }`
- `<TypeName>.<fieldName>.js` — Maps to field resolver on custom type

## Key Patterns

### Pagination

For large lists, use cursor-based pagination (implemented in mobile sync):

```javascript
// Not needed for MVP (lists < 200 items typical)
// Implement when needed for scale
```

### Optimistic Concurrency

Use `updateItemWithVersion` for conflict-safe updates:

```javascript
const updated = await updateItemWithVersion(
  `HOUSEHOLD#${householdId}`,
  `ITEM#${itemId}`,
  { status: 'eaten', eatenAt: now },
  expectedVersion
);
```

### Soft Deletes

Always use soft delete (set `deletedAt`), never hard delete:

```javascript
const deleted = await softDeleteItem(pk, sk);
```

### GSI Usage

Set GSI keys when creating/updating items:

```javascript
// For barcode lookup
item.GSI4PK = `BARCODE#${barcode}`;
item.GSI4SK = `ITEM#${itemId}`;

// For expiring items
item.GSI2PK = `EXPIRING#${householdId}`;
item.GSI2SK = expiryAt; // ISO 8601 for sorting
```

## Error Handling

Return errors in GraphQL format with extension data:

```javascript
return {
  errorType: 'FORBIDDEN',
  message: 'User does not have permission',
  errorInfo: {
    code: 'FORBIDDEN',
    userMessage: 'You cannot access this household',
    requestId: context.requestId,
  },
};
```

Standard error codes:
- `UNAUTHENTICATED` — No valid JWT
- `FORBIDDEN` — Insufficient permissions
- `NOT_FOUND` — Item doesn't exist
- `CONFLICT` — Version mismatch
- `VALIDATION_ERROR` — Invalid input
- `RATE_LIMITED` — Quota exceeded
- `INTERNAL_ERROR` — Server error

## DynamoDB Access Patterns

The schema uses a single-table design. Key access patterns:

- **Profile by user**: `PK: USER#{userId}`, `SK: PROFILE`
- **Household members**: `PK: HOUSEHOLD#{id}`, `SK: MEMBER#{userId}` (via GSI1)
- **User households**: `GSI1: USER#{userId}`, `GSI1SK: HOUSEHOLD#{id}`
- **Expiring items**: `GSI2: EXPIRING#{householdId}`, sorted by date
- **User items across households**: `GSI3: USER_ITEMS#{userId}`, sorted by date
- **Container by QR**: `GSI4: QR_TOKEN#{token}`, `SK: CONTAINER`
- **Item by barcode**: `GSI4: BARCODE#{barcode}`, `GSI4SK: ITEM#{itemId}`

See `packages/shared/src/db/access-patterns.ts` for the pattern definitions.

## Auth & Permissions

Every resolver must:

1. Call `getUserId(event)` to get authenticated user
2. Call `checkHouseholdMembership(userId, householdId)` for household-scoped ops
3. Call `checkHouseholdOwner(userId, householdId)` for admin-only ops
4. Throw `Unauthenticated` or `Forbidden` on permission failure

These utilities return the actual Cognito claims for further checks.

## Testing

Resolvers are tested via:

1. **Unit tests**: Mock DynamoDB and context (in `services/` tests)
2. **Integration tests**: Against ephemeral DynamoDB in CI (Phase C)
3. **E2E tests**: Via Maestro flows on mobile app (Phase C)

## Deployment

Resolvers are deployed via CDK:

```typescript
// In infra/cdk/lib/stacks/api-stack.ts
new appsync.Resolver(stack, 'CreateItemResolver', {
  api,
  typeName: 'Mutation',
  fieldName: 'createItem',
  dataSourceId: 'lambda-datasource',
  code: appsync.Code.fromAsset('lib/appsync/resolvers/Mutation.createItem.js'),
});
```

## Adding a New Resolver

1. Create `<Type>.<fieldName>.js` in this directory
2. Import utilities from `utils.js`
3. Implement handler function
4. Update CDK stack to wire resolver to data source
5. Test against mock/ephemeral DynamoDB
6. Update `schema.graphql` if adding new field
7. Open PR referencing the feature issue

## Shared Resolver Patterns (Phase A)

- Query.me ✓
- Query.listItems ✓
- Query.foodRules (upcoming)
- Mutation.createItem ✓
- Mutation.markItemEaten ✓
- Mutation.markItemTossed (upcoming)
- Mutation.markItemFrozen (upcoming)
- Mutation.updateItem (upcoming)

Phase B will expand with:
- Household CRUD
- Container CRUD
- Advanced queries (expiring soon, search)
- Subscriptions

See [15_WORKER_TRACKS.md](../../../docs/15_WORKER_TRACKS.md) for W2 Phase A/B/C breakdown.
