# AppSync Resolver API Reference

Complete reference for all 56 resolvers with examples and error codes.

---

## Mutations

### Profile Management

#### updateProfile
Update authenticated user's profile.

```graphql
mutation UpdateProfile($input: UpdateProfileInput!) {
  updateProfile(input: $input) {
    id
    displayName
    photoUrl
    timeZone
    units
  }
}
```

**Input:**
```json
{
  "displayName": "Alice",
  "photoUrl": "https://example.com/photo.jpg",
  "timeZone": "America/Los_Angeles",
  "units": "metric",
  "locale": "en-US",
  "dietaryPreferences": ["vegetarian"],
  "cuisinePreferences": ["italian"],
  "allergies": []
}
```

**Errors:**
- `NOT_FOUND` - User profile not found
- `VALIDATION_ERROR` - Invalid input
- `MUTATION_ERROR` - Database error

---

#### deleteAccount
Delete user account and all associated data. **Irreversible.**

```graphql
mutation DeleteAccount {
  deleteAccount
}
```

**Returns:** `Boolean` (true if successful)

**Side Effects:**
- Soft deletes user profile
- Removes all household memberships
- Deletes all user's items
- Removes all sent/received invites
- Sends confirmation email

**Errors:**
- `MUTATION_ERROR` - Account deletion failed

---

#### exportData
Export all user data as JSON (GDPR compliance).

```graphql
mutation ExportData {
  exportData
}
```

**Returns:** JSON string of user's complete data

---

### Household Management

#### createHousehold
Create a new household. Creator is the owner.

```graphql
mutation CreateHousehold($input: CreateHouseholdInput!) {
  createHousehold(input: $input) {
    id
    name
    ownerId
  }
}
```

**Input:**
```json
{
  "name": "My Kitchen",
  "imageUrl": "https://example.com/kitchen.jpg"
}
```

---

#### updateHousehold
Update household name/image (owner only).

```graphql
mutation UpdateHousehold($input: UpdateHouseholdInput!) {
  updateHousehold(input: $input) {
    id
    name
    imageUrl
  }
}
```

**Errors:**
- `FORBIDDEN` - Only owner can update
- `NOT_FOUND` - Household not found

---

#### deleteHousehold
Delete household (owner only). **Soft delete - data preserved.**

```graphql
mutation DeleteHousehold($householdId: UUID!) {
  deleteHousehold(householdId: $householdId)
}
```

**Returns:** `Boolean`

---

#### inviteToHousehold
Generate 30-day invite link for new member (owner only).

```graphql
mutation InviteToHousehold(
  $householdId: UUID!
  $input: InviteInput!
) {
  inviteToHousehold(householdId: $householdId, input: $input) {
    id
    inviteToken
    expiresAt
  }
}
```

**Input:**
```json
{
  "invitedEmail": "friend@example.com",
  "role": "member"
}
```

**Returns invite token** - Share via link: `https://whatsforlunch.app/invite/{inviteToken}`

---

#### acceptHouseholdInvite
Accept invite and join household.

```graphql
mutation AcceptHouseholdInvite($input: AcceptHouseholdInviteInput!) {
  acceptHouseholdInvite(input: $input) {
    id
    householdId
    role
  }
}
```

**Input:**
```json
{
  "token": "abc123def456..."
}
```

**Errors:**
- `NOT_FOUND` - Invite not found
- `EXPIRED` - Invite expired (30 days)
- `ALREADY_ACCEPTED` - Invite already used

---

#### removeHouseholdMember
Remove member from household (owner only).

```graphql
mutation RemoveHouseholdMember(
  $householdId: UUID!
  $userId: UUID!
) {
  removeHouseholdMember(householdId: $householdId, userId: $userId)
}
```

**Returns:** `Boolean`

**Errors:**
- `FORBIDDEN` - Only owner can remove
- `NOT_FOUND` - Member not in household

---

#### changeRole
Change member role (owner only).

```graphql
mutation ChangeRole(
  $householdId: UUID!
  $userId: UUID!
  $role: HouseholdRole!
) {
  changeRole(householdId: $householdId, userId: $userId, role: $role) {
    id
    role
  }
}
```

**Roles:** `owner`, `member`

**Errors:**
- `FORBIDDEN` - Last owner cannot demote self

---

### Container Management

#### createContainer
Claim QR-coded container.

```graphql
mutation CreateContainer($input: CreateContainerInput!) {
  createContainer(input: $input) {
    id
    qrToken
    nickname
  }
}
```

---

#### updateContainer
Update container name/image.

```graphql
mutation UpdateContainer($input: UpdateContainerInput!) {
  updateContainer(input: $input) {
    id
    nickname
    imageUrl
  }
}
```

---

#### archiveContainer
Soft-archive container (hide but keep data).

```graphql
mutation ArchiveContainer($containerId: UUID!) {
  archiveContainer(containerId: $containerId) {
    id
    archivedAt
  }
}
```

---

#### unarchiveContainer
Restore archived container.

```graphql
mutation UnarchiveContainer($containerId: UUID!) {
  unarchiveContainer(containerId: $containerId) {
    id
    archivedAt
  }
}
```

---

### Item Management

#### createItem
Add food item with expiry.

```graphql
mutation CreateItem($input: CreateItemInput!) {
  createItem(input: $input) {
    id
    foodType
    expiryAt
    hoursUntilExpiry
    statusColor
  }
}
```

**Input:**
```json
{
  "householdId": "household-id",
  "containerId": "container-id",
  "foodType": "cooked_chicken",
  "quantity": 2,
  "quantityUnit": "portions",
  "storageLocation": "fridge",
  "expiryAt": "2026-04-30T12:00:00Z",
  "expirySource": "rule"
}
```

**statusColor values:**
- `red` - Expired or expiring today
- `orange` - Expiring within 24 hours
- `yellow` - Expiring within 72 hours
- `green` - Fresh (>3 days)
- `gray` - Eaten/tossed

---

#### updateItem
Update item details with optimistic concurrency.

```graphql
mutation UpdateItem($input: UpdateItemInput!) {
  updateItem(input: $input) {
    id
    foodType
    expiryAt
    _version
  }
}
```

**Errors:**
- `CONFLICT` - Item was modified (version mismatch)

---

#### deleteItem
Soft delete item (preserves audit trail).

```graphql
mutation DeleteItem($householdId: UUID!, $id: UUID!) {
  deleteItem(householdId: $householdId, id: $id)
}
```

---

#### markItemEaten
Mark item as consumed.

```graphql
mutation MarkItemEaten($input: MarkItemEatenInput!) {
  markItemEaten(input: $input) {
    id
    status
    statusColor
  }
}
```

**Status:** `eaten`

---

#### markItemTossed
Mark item as discarded/wasted.

```graphql
mutation MarkItemTossed($input: MarkItemTossedInput!) {
  markItemTossed(input: $input) {
    id
    status
    statusColor
  }
}
```

**Status:** `tossed`

---

#### markItemFrozen
Mark item as frozen (extends expiry 3 months).

```graphql
mutation MarkItemFrozen($input: MarkItemFrozenInput!) {
  markItemFrozen(input: $input) {
    id
    status
    expiryAt
  }
}
```

**Status:** `frozen`

**Effect:** Adds 90 days to expiryAt

---

#### markItemPartial
Mark item as partially consumed.

```graphql
mutation MarkItemPartial($input: MarkItemPartialInput!) {
  markItemPartial(input: $input) {
    id
    status
    quantity
  }
}
```

**Status:** `partial`

---

#### transferItem
Move item between containers.

```graphql
mutation TransferItem($input: TransferItemInput!) {
  transferItem(input: $input) {
    id
    containerId
  }
}
```

---

#### snoozeItem
Temporarily hide item by extending expiry.

```graphql
mutation SnoozeItem($input: SnoozeItemInput!) {
  snoozeItem(input: $input) {
    id
    expiryAt
  }
}
```

**Effect:** Adds 7 days to expiryAt

---

#### bulkCreateItems
Batch create items (e.g., from receipt scanner).

```graphql
mutation BulkCreateItems($householdId: UUID!, $items: [CreateItemInput!]!) {
  bulkCreateItems(householdId: $householdId, items: $items) {
    items {
      id
      foodType
    }
    count
  }
}
```

---

#### bulkUpdateItemStatus
Batch update status for multiple items.

```graphql
mutation BulkUpdateItemStatus(
  $householdId: UUID!
  $itemIds: [UUID!]!
  $status: ItemStatus!
) {
  bulkUpdateItemStatus(
    householdId: $householdId
    itemIds: $itemIds
    status: $status
  ) {
    count
  }
}
```

---

### Shopping List

#### addShoppingItem
Add item to shopping list.

```graphql
mutation AddShoppingItem(
  $householdId: UUID!
  $name: String!
  $quantity: String
) {
  addShoppingItem(householdId: $householdId, name: $name, quantity: $quantity) {
    id
    name
    quantity
  }
}
```

---

#### updateShoppingItem
Update shopping list item.

```graphql
mutation UpdateShoppingItem($input: UpdateShoppingItemInput!) {
  updateShoppingItem(input: $input) {
    id
    name
  }
}
```

---

#### markShoppingItemPurchased
Mark shopping item as bought.

```graphql
mutation MarkShoppingItemPurchased(
  $householdId: UUID!
  $id: UUID!
) {
  markShoppingItemPurchased(householdId: $householdId, id: $id) {
    id
    purchasedAt
    purchasedByUserId
  }
}
```

---

#### deleteShoppingItem
Remove from shopping list (soft delete).

```graphql
mutation DeleteShoppingItem(
  $householdId: UUID!
  $id: UUID!
) {
  deleteShoppingItem(householdId: $householdId, id: $id)
}
```

---

### AI Operations

#### classifyFood
Call W4 AI Lambda to classify food from photo.

```graphql
mutation ClassifyFood(
  $householdId: UUID!
  $photoUrl: AWSURL!
) {
  classifyFood(householdId: $householdId, photoUrl: $photoUrl) {
    id
    foodType
    confidence
  }
}
```

**Requires:** W4 Lambda `wfl-w4-classify-food-{env}` deployed

---

#### ocrExpiryDate
Extract expiry date from packaging photo.

```graphql
mutation OcrExpiryDate(
  $householdId: UUID!
  $photoUrl: AWSURL!
) {
  ocrExpiryDate(householdId: $householdId, photoUrl: $photoUrl)
}
```

**Returns:** ISO date string (e.g., `2026-05-15`)

---

## Queries

### Profile

#### me
Get authenticated user's profile.

```graphql
query Me {
  me {
    id
    email
    displayName
    defaultHouseholdId
  }
}
```

---

#### getProfile
Same as `me` - alias.

---

#### getProfileById
Get another user's public profile.

```graphql
query GetProfileById($userId: UUID!) {
  getProfileById(userId: $userId) {
    displayName
    photoUrl
  }
}
```

**Note:** Only returns public fields (no email, etc.)

---

### Households

#### myHouseholds
List user's households.

```graphql
query MyHouseholds {
  myHouseholds {
    id
    name
    ownerId
  }
}
```

---

#### getHousehold
Get household details.

```graphql
query GetHousehold($id: UUID!) {
  getHousehold(id: $id) {
    id
    name
    ownerId
  }
}
```

---

#### listHouseholdMembers
List members of household.

```graphql
query ListHouseholdMembers($householdId: UUID!) {
  listHouseholdMembers(householdId: $householdId) {
    id
    userId
    role
    joinedAt
  }
}
```

---

### Containers

#### listContainers
List containers in household.

```graphql
query ListContainers($householdId: UUID!) {
  listContainers(householdId: $householdId) {
    id
    nickname
    archivedAt
  }
}
```

**Parameters:**
- `householdId` - Required
- `includeArchived` - Optional (default: false)

---

#### getContainer
Get container by ID.

```graphql
query GetContainer($id: UUID!) {
  getContainer(id: $id) {
    id
    nickname
    currentItem {
      id
      foodType
    }
  }
}
```

---

#### getContainerByQrToken
Lookup container for claiming via QR.

```graphql
query GetContainerByQrToken($qrToken: String!) {
  getContainerByQrToken(qrToken: $qrToken) {
    id
    householdId
    qrToken
  }
}
```

---

### Items

#### listItems
List items in household with optional filters.

```graphql
query ListItems(
  $householdId: UUID!
  $status: ItemStatus
  $storageLocation: StorageLocation
) {
  listItems(
    householdId: $householdId
    status: $status
    storageLocation: $storageLocation
  ) {
    id
    foodType
    hoursUntilExpiry
    statusColor
  }
}
```

---

#### getItem
Get item by ID.

```graphql
query GetItem($id: UUID!) {
  getItem(id: $id) {
    id
    foodType
    expiryAt
    hoursUntilExpiry
    statusColor
  }
}
```

---

#### itemsExpiringSoon
Get items expiring within N hours (default 168/1 week).

```graphql
query ItemsExpiringSoon(
  $householdId: UUID!
  $hours: Int
) {
  itemsExpiringSoon(householdId: $householdId, hours: $hours) {
    id
    foodType
    hoursUntilExpiry
    statusColor
  }
}
```

---

#### listExpiringItems
Get items expiring within N days.

```graphql
query ListExpiringItems(
  $householdId: UUID!
  $days: Int
) {
  listExpiringItems(householdId: $householdId, days: $days) {
    id
    foodType
  }
}
```

---

#### listItemsByContainer
Get items in specific container.

```graphql
query ListItemsByContainer(
  $householdId: UUID!
  $containerId: UUID!
) {
  listItemsByContainer(householdId: $householdId, containerId: $containerId) {
    id
    foodType
  }
}
```

---

#### searchItems
Search items by name/notes/barcode.

```graphql
query SearchItems(
  $householdId: UUID!
  $query: String!
) {
  searchItems(householdId: $householdId, query: $query) {
    id
    foodType
    notes
  }
}
```

---

### Shopping List

#### listShoppingItems
Get shopping list (excludes purchased by default).

```graphql
query ListShoppingItems(
  $householdId: UUID!
  $showPurchased: Boolean
) {
  listShoppingItems(householdId: $householdId, showPurchased: $showPurchased) {
    id
    name
    quantity
    purchasedAt
  }
}
```

---

#### getShoppingItem
Get shopping item by ID.

```graphql
query GetShoppingItem($id: UUID!) {
  getShoppingItem(id: $id) {
    id
    name
    linkedFoodType
  }
}
```

---

### System

#### foodRules
Get all food spoilage rules.

```graphql
query FoodRules {
  foodRules {
    foodType
    fridgeDaysSafe
    freezerDaysSafe
    pantryDaysSafe
  }
}
```

---

#### deltaSync
Get changed items since last sync (offline-first).

```graphql
query DeltaSync(
  $householdId: UUID!
  $lastSyncAt: AWSDateTime!
  $limit: Int
) {
  deltaSync(householdId: $householdId, lastSyncAt: $lastSyncAt, limit: $limit) {
    items {
      id
      _lastChangedAt
    }
    timestamp
    hasMore
  }
}
```

**Used by:** W8 WatermelonDB sync engine

---

## Subscriptions

### onItemChanged
Subscribe to item updates in household.

```graphql
subscription OnItemChanged($householdId: UUID!) {
  onItemChanged(householdId: $householdId) {
    id
    foodType
    status
  }
}
```

**Triggers:** createItem, updateItem, markItemEaten, markItemTossed, etc.

---

### onContainerChanged
Subscribe to container updates.

```graphql
subscription OnContainerChanged($householdId: UUID!) {
  onContainerChanged(householdId: $householdId) {
    id
    nickname
    archivedAt
  }
}
```

---

### onShoppingListChanged
Subscribe to shopping list updates.

```graphql
subscription OnShoppingListChanged($householdId: UUID!) {
  onShoppingListChanged(householdId: $householdId) {
    id
    name
    purchasedAt
  }
}
```

---

### onHouseholdChanged
Subscribe to household/membership updates.

```graphql
subscription OnHouseholdChanged($householdId: UUID!) {
  onHouseholdChanged(householdId: $householdId) {
    id
    name
  }
}
```

**Triggers:** updateHousehold, member added/removed, role changed

---

## Error Codes

Common error responses:

| Code | Meaning | Action |
|------|---------|--------|
| `NOT_FOUND` | Resource doesn't exist | Check ID, resource may be deleted |
| `FORBIDDEN` | Permission denied | User not household member, or requires owner role |
| `CONFLICT` | Version mismatch | Item was modified, refresh before retrying |
| `VALIDATION_ERROR` | Invalid input | Check field types and required fields |
| `MUTATION_ERROR` | Database error | Retry, or contact support if persistent |
| `EXPIRED` | Invite/token expired | Generate new invite |
| `ALREADY_ACCEPTED` | Duplicate action | Resource already in desired state |
| `AUTH_ERROR` | Not authenticated | User must be logged in |
| `AI_ERROR` | W4 Lambda failed | Check image/input, retry later |

---

## Rate Limits (Future)

- 100 requests/minute per user
- 1000 items per query
- 5MB payload max

---

**Last Updated:** April 27, 2026  
**Total Resolvers:** 56 (32 mutations, 19 queries, 4 subscriptions, 1 utility)
