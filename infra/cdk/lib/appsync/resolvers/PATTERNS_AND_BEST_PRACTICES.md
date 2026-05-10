# GraphQL Resolver Patterns & Best Practices

**Complete guide to implementing production-grade resolvers in WhatsFresh Phase B+**

---

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [Input Validation](#input-validation)
3. [Error Handling](#error-handling)
4. [Optimistic Concurrency Control](#optimistic-concurrency-control)
5. [Caching Strategies](#caching-strategies)
6. [Rate Limiting](#rate-limiting)
7. [Event Sourcing](#event-sourcing)
8. [Batch Operations](#batch-operations)
9. [Real-time Subscriptions](#real-time-subscriptions)
10. [External Service Integration](#external-service-integration)

---

## Authentication & Authorization

### Get Current User

All resolvers start with extracting the authenticated user ID:

```javascript
const userId = event.identity?.claims?.sub;
if (!userId) {
  throw new Error("Unauthorized: no user identity", "UNAUTHORIZED");
}
```

### Verify Household Membership

Required for most household-scoped operations:

```javascript
const { ddb, checkHouseholdMembership } = require('./utils');

const hasMembership = await checkHouseholdMembership(householdId, userId);
if (!hasMembership) {
  throw new Error(
    `Access denied: user ${userId} not a member of household ${householdId}`,
    "FORBIDDEN"
  );
}
```

### Verify Owner Role

For destructive operations (delete household, remove members):

```javascript
const { checkHouseholdOwner } = require('./utils');

const isOwner = await checkHouseholdOwner(householdId, userId);
if (!isOwner) {
  throw new Error(
    `Access denied: user ${userId} is not household owner`,
    "FORBIDDEN"
  );
}
```

### Complete Example

```javascript
async function resolveUpdateHousehold(event) {
  const userId = event.identity?.claims?.sub;
  if (!userId) throw new Error("Unauthorized", "UNAUTHORIZED");

  const { householdId, name, description } = event.arguments.input;

  // Verify ownership (only owner can update)
  const isOwner = await checkHouseholdOwner(householdId, userId);
  if (!isOwner) throw new Error("Forbidden", "FORBIDDEN");

  // ... proceed with update
}
```

---

## Input Validation

### Using Zod Schemas

```javascript
const { z } = require("zod");
const { validateInputOrThrow } = require("./validation");

// Define schema
const CreateItemSchema = z.object({
  householdId: z.string().min(1),
  name: z.string().min(1).max(100),
  expiryDate: z.string().datetime().optional(),
  quantity: z.number().min(0.1).max(10000),
  unit: z.enum(["g", "ml", "count", "oz", "lb", "cup"]),
});

// Validate in resolver
async function resolveCreateItem(event) {
  const input = validateInputOrThrow(event.arguments.input, CreateItemSchema);
  // input is now type-safe and validated
}
```

### Common Validation Patterns

```javascript
// Validate expiry date
const validateExpiryDate = (dateString) => {
  const date = new Date(dateString);
  if (date <= new Date()) {
    throw new Error("Expiry date must be in the future", "INVALID_DATE");
  }
};

// Validate quantity
const validateQuantity = (qty, min = 0.1, max = 10000) => {
  if (qty < min || qty > max) {
    throw new Error(`Quantity must be between ${min} and ${max}`, "INVALID_QUANTITY");
  }
};

// Validate version for optimistic concurrency
const validateVersion = (currentVersion, expectedVersion) => {
  if (currentVersion !== expectedVersion) {
    throw new Error("Version mismatch: item was modified", "CONFLICT");
  }
};
```

---

## Error Handling

### Standard Error Codes

```javascript
const ErrorCodes = {
  UNAUTHORIZED: "User not authenticated",
  FORBIDDEN: "User lacks permission",
  NOT_FOUND: "Resource not found",
  CONFLICT: "Version conflict or duplicate",
  INVALID_INPUT: "Input validation failed",
  INVALID_STATE: "Operation invalid in current state",
  RATE_LIMITED: "Too many requests",
  SERVICE_UNAVAILABLE: "External service unavailable",
  INTERNAL_ERROR: "Internal server error",
};

// Standard error throwing
throw new Error("Household not found", "NOT_FOUND");
```

### Graceful Error Handling

```javascript
async function resolveCreateItem(event) {
  try {
    const userId = event.identity?.claims?.sub;
    if (!userId) throw new Error("Unauthorized", "UNAUTHORIZED");

    // ... resolver logic

    return result;
  } catch (error) {
    // Known errors - return to client
    if (error.code === "CONFLICT" || error.code === "FORBIDDEN") {
      return {
        error: {
          code: error.code,
          message: error.message,
        },
      };
    }

    // Unknown errors - log and return generic error
    console.error("Resolver error:", error);
    throw new Error("Internal server error", "INTERNAL_ERROR");
  }
}
```

### Wrap with Observability

```javascript
const { withMonitoring } = require("./observability");

const resolver = withMonitoring(
  async (event) => {
    // resolver implementation
  },
  {
    resolverId: "Mutation.createItem",
    includeMetrics: true,
    includeTracing: true,
  }
);
```

---

## Optimistic Concurrency Control

### Version Management Pattern

```javascript
// When reading item
const item = await ddb.get({
  TableName: TABLE_NAME,
  Key: { PK: itemPK, SK: itemSK },
}).promise();

// Client receives version
const response = {
  id: item.PK,
  name: item.name,
  _version: item._version, // Send to client
  _lastChangedAt: item._lastChangedAt,
};

// Client sends version back when updating
const input = {
  itemId: "item123",
  name: "Updated Name",
  _version: 5, // Expected version
};
```

### Update with Version Check

```javascript
async function updateItemWithVersion(itemPK, itemSK, updates, expectedVersion) {
  const updateExpression = Object.keys(updates)
    .map((key) => `${key} = :${key}`)
    .join(", ");

  const expressionAttributeValues = {
    ":newVersion": expectedVersion + 1,
    ":now": Date.now(),
    ":oldVersion": expectedVersion,
  };

  // Add update values
  Object.entries(updates).forEach(([key, value]) => {
    expressionAttributeValues[`:${key}`] = value;
  });

  try {
    const result = await ddb
      .update({
        TableName: TABLE_NAME,
        Key: { PK: itemPK, SK: itemSK },
        UpdateExpression: `SET ${updateExpression}, _version = :newVersion, _lastChangedAt = :now`,
        ConditionExpression: "_version = :oldVersion",
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: "ALL_NEW",
      })
      .promise();

    return result.Attributes;
  } catch (error) {
    if (error.code === "ConditionalCheckFailedException") {
      throw new Error("Version conflict: item was modified", "CONFLICT");
    }
    throw error;
  }
}
```

### Complete Update Resolver

```javascript
async function resolveUpdateItem(event) {
  const userId = event.identity?.claims?.sub;
  if (!userId) throw new Error("Unauthorized", "UNAUTHORIZED");

  const { itemId, input } = event.arguments;
  const { name, quantity, expiryDate, _version } = input;

  // Validate version
  validateVersion(_version, 1); // pseudo-check

  // Get current item
  const currentItem = await ddb
    .get({
      TableName: TABLE_NAME,
      Key: { PK: `ITEM#${itemId}`, SK: "#CURRENT" },
    })
    .promise();

  if (!currentItem.Item) {
    throw new Error("Item not found", "NOT_FOUND");
  }

  // Verify version matches
  if (currentItem.Item._version !== _version) {
    throw new Error("Version mismatch", "CONFLICT");
  }

  // Build updates
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (quantity !== undefined) updates.quantity = quantity;
  if (expiryDate !== undefined) updates.expiryDate = expiryDate;

  // Update with version check
  const updated = await updateItemWithVersion(
    `ITEM#${itemId}`,
    "#CURRENT",
    {
      ...updates,
      updatedAt: new Date().toISOString(),
    },
    _version
  );

  // Log event
  await logItemEvent("ItemUpdated", itemId, { changes: updates });

  return updated;
}
```

---

## Caching Strategies

### Cache-Aside Pattern

```javascript
const { MemoryCache } = require("./caching");

const cache = new MemoryCache({ ttlSeconds: 300 }); // 5 minutes

async function resolveGetHousehold(event) {
  const { householdId } = event.arguments;

  // Check cache first
  const cached = cache.get(`household:${householdId}`);
  if (cached) {
    console.log(`[cache] HIT: household ${householdId}`);
    return cached;
  }

  // Cache miss - fetch from DB
  const household = await ddb
    .get({
      TableName: TABLE_NAME,
      Key: { PK: `HOUSEHOLD#${householdId}`, SK: "METADATA" },
    })
    .promise();

  if (!household.Item) {
    throw new Error("Household not found", "NOT_FOUND");
  }

  // Store in cache
  cache.set(`household:${householdId}`, household.Item);

  return household.Item;
}
```

### Cache Invalidation

```javascript
const { CacheInvalidation } = require("./caching");
const invalidation = new CacheInvalidation(cache);

async function resolveUpdateHousehold(event) {
  // ... update logic

  // Invalidate related caches
  invalidation.invalidate(`household:${householdId}`); // Exact key
  invalidation.invalidatePattern(`household:${householdId}:*`); // Pattern match

  return updated;
}
```

### Distributed Cache (Redis)

```javascript
const { DistributedCache } = require("./caching");

const cache = new DistributedCache({
  redisUrl: process.env.REDIS_URL,
  ttlSeconds: 300,
});

async function resolveListItems(event) {
  const cacheKey = `items:${householdId}:${sortBy}`;

  // Check Redis
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  // Fetch and cache
  const items = await getItemsFromDB(householdId, sortBy);
  await cache.set(cacheKey, items);

  return items;
}
```

---

## Rate Limiting

### Token Bucket Algorithm

```javascript
const { PerUserRateLimiter } = require("./rate-limiting");

const limiter = new PerUserRateLimiter(
  100, // 100 tokens
  10   // 10 tokens per second refill
);

async function resolveBulkCreateItems(event) {
  const userId = event.identity?.claims?.sub;

  // Check rate limit
  const check = limiter.allowRequest(userId);
  if (!check.allowed) {
    throw new Error(
      `Rate limited. Reset at ${check.resetAt}`,
      "RATE_LIMITED"
    );
  }

  // ... proceed with operation
}
```

### Resolver-Level Rate Limiting

```javascript
const { withRateLimit } = require("./rate-limiting");

const limits = {
  "Mutation.bulkCreateItems": { tokensPerSecond: 2, maxTokens: 10 },
  "Mutation.deleteItem": { tokensPerSecond: 5, maxTokens: 50 },
  "Query.listItems": { tokensPerSecond: 10, maxTokens: 100 },
};

const resolver = withRateLimit(
  async (event) => {
    // resolver implementation
  },
  limits["Mutation.bulkCreateItems"]
);
```

---

## Event Sourcing

### Log Events for Audit Trail

```javascript
const { logItemEvent } = require("./event-logger");

async function resolveMarkItemEaten(event) {
  const { itemId } = event.arguments;
  const userId = event.identity?.claims?.sub;

  // Update item status
  const updated = await ddb
    .update({
      TableName: TABLE_NAME,
      Key: { PK: `ITEM#${itemId}`, SK: "#CURRENT" },
      UpdateExpression: "SET #status = :status, updatedAt = :now",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":status": "eaten",
        ":now": new Date().toISOString(),
      },
      ReturnValues: "ALL_NEW",
    })
    .promise();

  // Log event for audit trail
  await logItemEvent("ItemMarkedEaten", itemId, {
    userId,
    timestamp: new Date().toISOString(),
  });

  return updated.Attributes;
}
```

### Query Event History

```javascript
async function resolveGetItemHistory(event) {
  const { itemId } = event.arguments;

  const events = await ddb
    .query({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `ITEM#${itemId}`,
        ":sk": "EVENT#",
      },
      ScanIndexForward: false, // Newest first
      Limit: 50,
    })
    .promise();

  return events.Items || [];
}
```

---

## Batch Operations

### Batch Create with Error Handling

```javascript
const { batchCreateItems } = require("./batch-operations");

async function resolveBulkCreateItems(event) {
  const { householdId, items } = event.arguments;
  const userId = event.identity?.claims?.sub;

  // Validate inputs
  if (items.length > 100) {
    throw new Error("Maximum 100 items per batch", "INVALID_INPUT");
  }

  // Create items with batch handling (DynamoDB 25-item limit)
  const results = await batchCreateItems(
    items.map((item) => ({
      ...item,
      householdId,
      createdByUserId: userId,
    }))
  );

  return {
    created: results.successful.length,
    failed: results.failed.length,
    items: results.successful,
    errors: results.failed,
  };
}
```

### Batch Update Status

```javascript
const { batchUpdateItemStatus } = require("./batch-operations");

async function resolveBulkMarkEaten(event) {
  const { itemIds } = event.arguments;

  const results = await batchUpdateItemStatus(
    itemIds,
    "eaten",
    {
      updatedAt: new Date().toISOString(),
    }
  );

  return {
    updated: results.successful.length,
    failed: results.failed.length,
  };
}
```

---

## Real-time Subscriptions

### Subscription Resolver

```javascript
async function resolveOnItemChanged(event) {
  // Subscriptions don't have arguments in the same way
  // The filter is based on the mutation that triggers it

  const { item } = event.arguments;
  return {
    id: item.PK,
    name: item.name,
    status: item.status,
    updatedAt: item.updatedAt,
  };
}
```

### Trigger Subscriptions from Mutations

```javascript
async function resolveMarkItemEaten(event) {
  const { itemId } = event.arguments;

  // ... update item

  // Trigger subscription (AppSync handles this automatically)
  // But we can also emit custom events
  await context.requestContext.eventBusName.putEvents({
    Entries: [
      {
        Source: "wfl.items",
        DetailType: "Item Status Changed",
        Detail: JSON.stringify({
          itemId,
          status: "eaten",
          timestamp: new Date().toISOString(),
        }),
      },
    ],
  });

  return updated;
}
```

---

## External Service Integration

### Circuit Breaker Pattern

```javascript
const { CircuitBreakerPool } = require("./circuit-breaker");
const breaker = new CircuitBreakerPool();

async function resolveClassifyFood(event) {
  const { imagePath } = event.arguments;

  try {
    // Use circuit breaker for W4 Lambda call
    const result = await breaker.execute(
      "w4-classification",
      async () => {
        return invokeW4Lambda("classifyFood", {
          imagePath,
        });
      },
      {
        failureThreshold: 5,
        timeout: 30000,
      }
    );

    return result;
  } catch (error) {
    if (error.message.includes("Circuit breaker")) {
      throw new Error("Classification service unavailable", "SERVICE_UNAVAILABLE");
    }
    throw error;
  }
}
```

### Retry with Exponential Backoff

```javascript
const { getRetryParameters } = require("./conflict-resolution");

async function invokeExternalServiceWithRetry(service, payload) {
  const { maxAttempts, backoffMs } = getRetryParameters();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await service.call(payload);
    } catch (error) {
      if (attempt === maxAttempts) throw error;

      const delay = backoffMs * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
```

---

## Complete Example: Production Resolver

```javascript
const { ddb, checkHouseholdMembership, getCurrentTimestamp } = require("./utils");
const { validateInputOrThrow } = require("./validation");
const { MemoryCache } = require("./caching");
const { withRateLimit } = require("./rate-limiting");
const { logItemEvent } = require("./event-logger");
const { withMonitoring } = require("./observability");
const { z } = require("zod");

const CreateItemSchema = z.object({
  householdId: z.string().min(1),
  name: z.string().min(1).max(100),
  expiryDate: z.string().datetime().optional(),
});

const cache = new MemoryCache();

const resolver = withMonitoring(
  withRateLimit(
    async (event) => {
      // 1. Extract and validate user
      const userId = event.identity?.claims?.sub;
      if (!userId) throw new Error("Unauthorized", "UNAUTHORIZED");

      // 2. Validate input
      const input = validateInputOrThrow(
        event.arguments.input,
        CreateItemSchema
      );

      // 3. Check authorization
      const hasMembership = await checkHouseholdMembership(
        input.householdId,
        userId
      );
      if (!hasMembership) throw new Error("Forbidden", "FORBIDDEN");

      // 4. Create item
      const itemId = generateUUID();
      const now = getCurrentTimestamp();
      const item = {
        PK: `ITEM#${itemId}`,
        SK: "#CURRENT",
        entityType: "Item",
        id: itemId,
        householdId: input.householdId,
        name: input.name,
        expiryDate: input.expiryDate,
        createdByUserId: userId,
        status: "active",
        createdAt: now,
        updatedAt: now,
        _version: 1,
        _lastChangedAt: Date.now(),
      };

      await ddb
        .put({
          TableName: TABLE_NAME,
          Item: item,
        })
        .promise();

      // 5. Invalidate cache
      cache.invalidatePattern(`household:${input.householdId}:*`);

      // 6. Log event
      await logItemEvent("ItemCreated", itemId, { userId });

      // 7. Return result
      return item;
    },
    { tokensPerSecond: 5, maxTokens: 50 }
  ),
  {
    resolverId: "Mutation.createItem",
    includeMetrics: true,
  }
);

module.exports = { handler: resolver };
```

---

## Testing Patterns

### Unit Test Resolver

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { createMockAppSyncEvent } from "./integration.setup";

describe("Mutation.createItem", () => {
  let resolver: Function;

  beforeEach(async () => {
    const module = await import("./Mutation.createItem");
    resolver = module.handler;
  });

  it("creates item with valid input", async () => {
    const event = createMockAppSyncEvent({
      arguments: {
        input: {
          householdId: "house123",
          name: "Milk",
          expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      },
      identity: { claims: { sub: "user123" } },
    });

    const result = await resolver(event);

    expect(result).toHaveProperty("id");
    expect(result.name).toBe("Milk");
    expect(result.status).toBe("active");
  });

  it("throws on missing householdId", async () => {
    const event = createMockAppSyncEvent({
      arguments: {
        input: {
          name: "Milk",
        },
      },
      identity: { claims: { sub: "user123" } },
    });

    expect(() => resolver(event)).rejects.toThrow("Invalid input");
  });
});
```

---

## Performance Checklist

- ✅ Use caching for frequently-accessed data
- ✅ Implement rate limiting for write operations
- ✅ Use batch operations for bulk actions (respects 25-item limit)
- ✅ Create GSI for common query patterns
- ✅ Monitor resolver latency with observability
- ✅ Use circuit breaker for external services
- ✅ Validate inputs early (fail fast)
- ✅ Log events for audit trail and debugging

---

## Security Checklist

- ✅ Always extract and validate user ID
- ✅ Check household membership/ownership
- ✅ Use Zod for input validation
- ✅ Handle errors securely (don't leak internals)
- ✅ Implement rate limiting
- ✅ Log sensitive operations for audit
- ✅ Use environment variables for secrets
- ✅ Enable encryption at rest and in transit

---

**Created**: Phase B+ (April 27, 2026)  
**Status**: Production patterns validated
