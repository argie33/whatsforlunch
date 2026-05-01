// GraphQL documents for the W8 sync engine.
// These match the AppSync schema at infra/cdk/lib/appsync/schema.graphql.

const ITEM_FIELDS = /* GraphQL */ `
  fragment ItemFields on Item {
    id
    householdId
    containerId
    addedByUserId
    foodType
    foodName
    category
    storageLocation
    quantityText
    quantityValue
    quantityUnit
    storedAt
    storedTz
    expiryAt
    expirySource
    expiryConfidence
    notes
    photoUrl
    barcode
    priceUsd
    status
    eatenAt
    tossedAt
    frozenAt
    transferredToContainerId
    deletedAt
    _version
    _lastChangedAt
  }
`;

const CONTAINER_FIELDS = /* GraphQL */ `
  fragment ContainerFields on Container {
    id
    householdId
    qrToken
    nickname
    imageUrl
    claimedAt
    claimedBy
    archivedAt
    _version
    _lastChangedAt
  }
`;

const SHOPPING_FIELDS = /* GraphQL */ `
  fragment ShoppingFields on ShoppingListItem {
    id
    householdId
    name
    quantity
    category
    notes
    addedByUserId
    purchasedAt
    purchasedByUserId
    autoSuggested
    _version
    _lastChangedAt
  }
`;

export const DELTA_SYNC = /* GraphQL */ `
  ${ITEM_FIELDS}
  ${CONTAINER_FIELDS}
  ${SHOPPING_FIELDS}
  query DeltaSync($input: DeltaSyncInput!) {
    deltaSync(input: $input) {
      containers {
        ...ContainerFields
      }
      items {
        ...ItemFields
      }
      shoppingList {
        ...ShoppingFields
      }
      serverTimestamp
    }
  }
`;

export const CREATE_ITEM = /* GraphQL */ `
  ${ITEM_FIELDS}
  mutation CreateItem($input: CreateItemInput!) {
    createItem(input: $input) {
      ...ItemFields
    }
  }
`;

export const UPDATE_ITEM = /* GraphQL */ `
  ${ITEM_FIELDS}
  mutation UpdateItem($input: UpdateItemInput!) {
    updateItem(input: $input) {
      ...ItemFields
    }
  }
`;

export const DELETE_ITEM = /* GraphQL */ `
  mutation DeleteItem($id: UUID!, $householdId: UUID!) {
    deleteItem(id: $id, householdId: $householdId)
  }
`;

export const MARK_ITEM_EATEN = /* GraphQL */ `
  ${ITEM_FIELDS}
  mutation MarkItemEaten($id: UUID!, $householdId: UUID!) {
    markItemEaten(id: $id, householdId: $householdId) {
      ...ItemFields
    }
  }
`;

export const MARK_ITEM_TOSSED = /* GraphQL */ `
  ${ITEM_FIELDS}
  mutation MarkItemTossed($id: UUID!, $householdId: UUID!) {
    markItemTossed(id: $id, householdId: $householdId) {
      ...ItemFields
    }
  }
`;

export const MARK_ITEM_FROZEN = /* GraphQL */ `
  ${ITEM_FIELDS}
  mutation MarkItemFrozen($id: UUID!, $householdId: UUID!) {
    markItemFrozen(id: $id, householdId: $householdId) {
      ...ItemFields
    }
  }
`;

export const MARK_ITEM_PARTIAL = /* GraphQL */ `
  ${ITEM_FIELDS}
  mutation MarkItemPartial($id: UUID!, $householdId: UUID!, $input: MarkPartialInput!) {
    markItemPartial(id: $id, householdId: $householdId, input: $input) {
      ...ItemFields
    }
  }
`;

export const CLAIM_CONTAINER = /* GraphQL */ `
  ${CONTAINER_FIELDS}
  mutation ClaimContainer($input: ClaimContainerInput!) {
    claimContainer(input: $input) {
      ...ContainerFields
    }
  }
`;

export const UPDATE_CONTAINER = /* GraphQL */ `
  ${CONTAINER_FIELDS}
  mutation UpdateContainer($input: UpdateContainerInput!) {
    updateContainer(input: $input) {
      ...ContainerFields
    }
  }
`;

export const ARCHIVE_CONTAINER = /* GraphQL */ `
  ${CONTAINER_FIELDS}
  mutation ArchiveContainer($input: ArchiveContainerInput!) {
    archiveContainer(input: $input) {
      ...ContainerFields
    }
  }
`;

export const ON_ITEM_UPDATE = /* GraphQL */ `
  ${ITEM_FIELDS}
  subscription OnItemUpdate($householdId: UUID!) {
    onItemUpdate(householdId: $householdId) {
      ...ItemFields
    }
  }
`;

export const ON_HOUSEHOLD_UPDATE = /* GraphQL */ `
  ${CONTAINER_FIELDS}
  subscription OnHouseholdUpdate($householdId: UUID!) {
    onHouseholdUpdate(householdId: $householdId) {
      ...ContainerFields
    }
  }
`;

export const CLASSIFY_FOOD = /* GraphQL */ `
  ${ITEM_FIELDS}
  mutation ClassifyFood($householdId: UUID!, $photoUrl: AWSURL!) {
    classifyFood(householdId: $householdId, photoUrl: $photoUrl) {
      ...ItemFields
    }
  }
`;

export const OCR_EXPIRY_DATE = /* GraphQL */ `
  mutation OcrExpiryDate($householdId: UUID!, $photoUrl: AWSURL!) {
    ocrExpiryDate(householdId: $householdId, photoUrl: $photoUrl)
  }
`;

export const ADD_SHOPPING_LIST_ITEM = /* GraphQL */ `
  ${SHOPPING_FIELDS}
  mutation AddShoppingListItem($input: CreateShoppingListItemInput!) {
    addShoppingListItem(input: $input) {
      ...ShoppingFields
    }
  }
`;

export const UPDATE_SHOPPING_LIST_ITEM = /* GraphQL */ `
  ${SHOPPING_FIELDS}
  mutation UpdateShoppingListItem($input: UpdateShoppingListItemInput!) {
    updateShoppingListItem(input: $input) {
      ...ShoppingFields
    }
  }
`;

export const DELETE_SHOPPING_LIST_ITEM = /* GraphQL */ `
  mutation DeleteShoppingListItem($id: ID!, $householdId: ID!) {
    deleteShoppingListItem(id: $id, householdId: $householdId)
  }
`;

export const MARK_SHOPPING_ITEM_PURCHASED = /* GraphQL */ `
  ${SHOPPING_FIELDS}
  mutation MarkShoppingItemPurchased($id: ID!, $householdId: ID!) {
    markShoppingItemPurchased(id: $id, householdId: $householdId) {
      ...ShoppingFields
    }
  }
`;

export const MARK_SHOPPING_ITEM_UNPURCHASED = /* GraphQL */ `
  ${SHOPPING_FIELDS}
  mutation MarkShoppingItemUnpurchased($id: ID!, $householdId: ID!) {
    markShoppingItemUnpurchased(id: $id, householdId: $householdId) {
      ...ShoppingFields
    }
  }
`;

export const LIST_SHOPPING_ITEMS = /* GraphQL */ `
  ${SHOPPING_FIELDS}
  query ListShoppingItems($householdId: ID!) {
    listShoppingItems(householdId: $householdId) {
      ...ShoppingFields
    }
  }
`;

export const GET_SHOPPING_LIST_STATS = /* GraphQL */ `
  query GetShoppingListStats($householdId: ID!) {
    getShoppingListStats(householdId: $householdId) {
      total
      purchased
      pending
    }
  }
`;

export const GET_RECIPE_RECOMMENDATIONS = /* GraphQL */ `
  query GetRecipeRecommendations($householdId: UUID!) {
    getRecipeRecommendations(householdId: $householdId) {
      id
      title
      summary
      cuisine
      servings
      cookTimeMinutes
      difficulty
      tags
      imageUrl
      usedItemIds
      rating
      notes
      ingredients {
        name
        quantity
        unit
        optional
      }
      steps
      createdAt
    }
  }
`;
