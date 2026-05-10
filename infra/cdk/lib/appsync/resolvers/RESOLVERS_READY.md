# Phase B Resolvers - Ready for Local Testing

## Status: 49 Resolvers Implemented

### Summary

- **30 Mutations**: Core business logic (create, update, delete, state changes)
- **16 Queries**: Data retrieval and filtering
- **4 Subscriptions**: Real-time update channels (onItemChanged, onContainerChanged, onShoppingListChanged, onHouseholdChanged)

## Resolver List

### Mutations (30)

**Profile & Account**
- `Mutation.updateProfile` - Update user display name, photo, timezone, preferences
- `Mutation.deleteAccount` - Soft delete user account and data
- `Mutation.exportData` - Export user data as JSON (GDPR)

**Households**
- `Mutation.createHousehold` - Create new household
- `Mutation.updateHousehold` - Update household name/image
- `Mutation.deleteHousehold` - Soft delete household (owner only)
- `Mutation.inviteToHousehold` - Generate invite token
- `Mutation.acceptHouseholdInvite` - Accept invite and join household
- `Mutation.removeHouseholdMember` - Remove member from household (owner only)
- `Mutation.leaveHousehold` - User leaves household
- `Mutation.changeRole` - Change member role (owner/member)

**Containers**
- `Mutation.createContainer` - Claim QR-coded container
- `Mutation.updateContainer` - Update container name/image
- `Mutation.archiveContainer` - Soft-archive container (hide but keep data)
- `Mutation.unarchiveContainer` - Restore archived container

**Items**
- `Mutation.createItem` - Add food item with expiry/location
- `Mutation.updateItem` - Update item details (name, expiry, location)
- `Mutation.deleteItem` - Soft delete item
- `Mutation.markItemEaten` - Mark consumed
- `Mutation.markItemTossed` - Mark discarded
- `Mutation.markItemFrozen` - Mark frozen (extends expiry)
- `Mutation.markItemPartial` - Mark partially consumed
- `Mutation.transferItem` - Move item between containers
- `Mutation.snoozeItem` - Temporarily hide by extending expiry
- `Mutation.bulkCreateItems` - Batch add items (receipt scanner)
- `Mutation.bulkUpdateItemStatus` - Batch status updates

**Shopping List**
- `Mutation.addShoppingItem` - Add to shopping list
- `Mutation.updateShoppingItem` - Update shopping item
- `Mutation.markShoppingItemPurchased` - Mark as bought
- `Mutation.deleteShoppingItem` - Remove from shopping list

### Queries (16)

**Profile & Auth**
- `Query.me` - Get authenticated user's profile
- (TODO: getProfile, getProfileById)

**Households**
- `Query.myHouseholds` - List user's households
- `Query.getHousehold` - Get household by ID
- `Query.listHouseholdMembers` - List household members

**Containers**
- `Query.listContainers` - List all containers in household
- `Query.getContainer` - Get container by ID
- `Query.getContainerByQrToken` - Lookup container by QR token (for claiming)

**Items**
- `Query.listItems` - List items in household with optional filters
- `Query.getItem` - Get item by ID
- `Query.itemsExpiringSoon` - Get items expiring within N hours (default 168/1 week)
- `Query.listItemsByContainer` - List items in specific container
- (TODO: searchItems, listExpiringItems)

**Shopping List**
- `Query.listShoppingItems` - List shopping list items
- `Query.getShoppingItem` - Get shopping item by ID

**System**
- `Query.foodRules` - List food type spoilage rules
- `Query.deltaSync` - Get changed items since last sync (for mobile offline-first)

### Subscriptions (4)

- `Subscription.onItemChanged` - Subscribe to item changes in household
- `Subscription.onContainerChanged` - Subscribe to container changes
- `Subscription.onShoppingListChanged` - Subscribe to shopping list changes
- `Subscription.onHouseholdChanged` - Subscribe to household/membership changes

## Not Yet Implemented (Next Phase)

**AI/Lambda Mutations** (W4 AI Integration)
- `Mutation.classifyFood` - Call W4's photo classification Lambda
- `Mutation.ocrExpiryDate` - Call W4's OCR Lambda for date extraction

**Advanced Queries** (Lower priority)
- `Query.searchItems` - Full-text search items by name
- `Query.listExpiringItems` - Alternative to itemsExpiringSoon with different params
- `Query.getProfileById` - Get other user's public profile

## Local Testing Order

1. **Account flows** (updateProfile, deleteAccount, exportData)
2. **Household setup** (createHousehold, inviteToHousehold, acceptHouseholdInvite)
3. **Container operations** (createContainer, updateContainer, archiveContainer)
4. **Item management** (createItem, updateItem, markItemEaten, etc.)
5. **Shopping list** (addShoppingItem, markShoppingItemPurchased)
6. **Queries** (listItems, itemsExpiringSoon, deltaSync)
7. **Real-time subscriptions** (WebSocket connections)

## Testing Checklist

- [ ] DynamoDB Local running with all 4 GSIs
- [ ] Seed test data with sample users, households, items
- [ ] Unit test each resolver (mock DynamoDB)
- [ ] Integration test against local DynamoDB
- [ ] Test authorization (checkHouseholdMembership, checkHouseholdOwner)
- [ ] Test optimistic concurrency (_version conflicts)
- [ ] Test soft delete patterns (deletedAt timestamps)
- [ ] Test GSI queries (expiring items, user→households, QR token lookup)
- [ ] Test subscriptions with WebSocket mock
- [ ] Manual testing in Expo simulator
- [ ] Test all error codes (NOT_FOUND, CONFLICT, FORBIDDEN, etc.)

## Critical Patterns Used

All resolvers follow these patterns:

1. **Authentication**: `const userId = getUserId(event)`
2. **Authorization**: `await checkHouseholdMembership(userId, householdId)`
3. **Versioning**: Increment `_version` on mutations, check in optimistic updates
4. **Timestamps**: Always set `updatedAt` and `_lastChangedAt`
5. **Soft Deletes**: Never hard delete, always set `deletedAt` timestamp
6. **Error Handling**: Return GraphQL error objects with `errorType` and `message`
7. **GSI Keys**: Maintain secondary index keys (GSI1PK/SK, GSI2PK/SK, etc.)

## Next Steps

1. Set up local DynamoDB with table schema + 4 GSIs
2. Run `pnpm test` to execute resolver unit tests
3. Run integration tests against local DynamoDB
4. Start mobile app: `cd apps/mobile && npx expo start`
5. Test manually with login → create household → add items → mark eaten
6. Once local testing passes, prepare for AWS CDK deployment
