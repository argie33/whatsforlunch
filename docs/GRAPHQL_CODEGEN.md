# GraphQL Code Generation — Type-Safe API Calls

Automatically generate TypeScript types from your GraphQL schema. Never write incorrect queries. Always have IDE autocomplete.

---

## Quick Start

### 1. Run Code Generation

```bash
# Generate types from schema
pnpm graphql:codegen

# This creates:
# - packages/shared/src/graphql/types.ts
# - apps/mobile/src/graphql/types.ts
# - apps/web/src/graphql/types.ts
```

### 2. Write a Query

Create a `.graphql` file in your app:

```graphql
# apps/mobile/src/graphql/queries.graphql

query GetProfile {
  getProfile {
    id
    email
    displayName
    createdAt
  }
}
```

### 3. Use in TypeScript

```typescript
import { GetProfileQuery } from '@/graphql/types'
import { gql } from '@apollo/client'

const GET_PROFILE = gql`
  query GetProfile {
    getProfile {
      id
      email
      displayName
      createdAt
    }
  }
`

async function loadProfile() {
  const result = await client.query<GetProfileQuery>({
    query: GET_PROFILE
  })
  
  // result.data.getProfile has full type safety! 🎉
  console.log(result.data.getProfile.email)
}
```

**Benefits**:
- ✅ TypeScript knows all fields
- ✅ IDE autocomplete works
- ✅ Catches errors at compile time
- ✅ Types stay in sync with schema

---

## How It Works

```
┌─────────────────────────────────┐
│  infra/cdk/lib/appsync/        │
│  schema.graphql                │
│  (Source of Truth)             │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│  graphql-codegen                │
│  (Automatic Code Generation)    │
└─────────────┬───────────────────┘
              │
    ┌─────────┼─────────┐
    ▼         ▼         ▼
  shared   mobile    web
  types    types     types
  
All in sync. Always matches schema.
```

---

## Project Structure

### Schema (Single Source of Truth)
```
infra/cdk/lib/appsync/schema.graphql
  - All types defined here
  - All queries defined here
  - All mutations defined here
  - Subscription definitions here
```

### Generated Types (Auto-Updated)
```
packages/shared/src/graphql/types.ts
apps/mobile/src/graphql/types.ts
apps/web/src/graphql/types.ts
```

### Queries/Mutations (Write Once, Use Everywhere)
```
packages/shared/src/graphql/*.graphql
apps/mobile/src/graphql/*.graphql
apps/web/src/graphql/*.graphql
```

---

## Writing GraphQL Operations

### Query Example

```graphql
# apps/mobile/src/graphql/queries/profile.graphql

query GetProfile {
  getProfile {
    id
    email
    displayName
    timeZone
    units
    createdAt
    updatedAt
  }
}

query ListHouseholds {
  listHouseholds {
    id
    name
    memberCount
    createdAt
  }
}
```

### Mutation Example

```graphql
# apps/mobile/src/graphql/mutations/profile.graphql

mutation UpdateProfile($input: UpdateProfileInput!) {
  updateProfile(input: $input) {
    id
    displayName
    updatedAt
    _version
  }
}

mutation CreateHousehold($input: CreateHouseholdInput!) {
  createHousehold(input: $input) {
    id
    name
    ownerId
    createdAt
  }
}
```

### Subscription Example

```graphql
# apps/mobile/src/graphql/subscriptions/items.graphql

subscription OnItemCreated($householdId: ID!) {
  onItemCreated(householdId: $householdId) {
    id
    foodName
    expiryAt
    status
    createdAt
  }
}
```

---

## Using Generated Types

### In React Components

```typescript
import { GetProfileQuery, UpdateProfileMutation } from '@/graphql/types'
import { useLazyQuery, useMutation } from '@apollo/client'
import { GET_PROFILE, UPDATE_PROFILE } from '@/graphql/queries'

export function ProfileScreen() {
  const [getProfile, { data }] = useLazyQuery<GetProfileQuery>(GET_PROFILE)
  const [updateProfile] = useMutation<UpdateProfileMutation>(UPDATE_PROFILE)

  return (
    <View>
      {/* data.getProfile is fully typed! */}
      <Text>{data?.getProfile?.displayName}</Text>
      
      <Button
        onPress={() => {
          updateProfile({
            variables: {
              input: { displayName: 'New Name' }
            }
          })
        }}
      />
    </View>
  )
}
```

### In Backend Resolvers

```typescript
import { GetProfileQuery } from '@wfl/shared'

export async function getProfile(user: LocalUser): GetProfileQuery['getProfile'] {
  const profile = await db.get(`USER#${user.email}`, 'PROFILE')
  if (!profile) throw new Error('Not found')
  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.displayName,
    // All fields type-checked! ✅
    // Missing a field? TypeScript error! ✅
  }
}
```

---

## Workflow

### Step 1: Update Schema (if needed)

```bash
# Edit the GraphQL schema
vim infra/cdk/lib/appsync/schema.graphql

# Add new type, query, or mutation
```

### Step 2: Write Operations

```bash
# Create .graphql files with your queries/mutations
cat > apps/mobile/src/graphql/queries/items.graphql <<EOF
query ListItems($householdId: ID!) {
  listItems(householdId: $householdId) {
    id
    foodName
    expiryAt
    status
  }
}
EOF
```

### Step 3: Generate Types

```bash
pnpm graphql:codegen

# Generated files updated automatically
```

### Step 4: Use in Code

```typescript
import { ListItemsQuery } from '@/graphql/types'
import { LIST_ITEMS } from '@/graphql/queries'

const { data } = useQuery<ListItemsQuery>(LIST_ITEMS, {
  variables: { householdId: 'xyz' }
})

// data.listItems is fully typed! 🎉
```

---

## Configuration

The codegen is configured in `codegen.yml`:

```yaml
schema: infra/cdk/lib/appsync/schema.graphql

generates:
  packages/shared/src/graphql/types.ts:
    plugins:
      - typescript
      - typescript-operations
  
  apps/mobile/src/graphql/types.ts:
    plugins:
      - typescript
      - typescript-operations
      - typescript-react-apollo
  
  apps/web/src/graphql/types.ts:
    plugins:
      - typescript
      - typescript-operations

documents:
  - 'packages/shared/src/**/*.graphql'
  - 'apps/mobile/src/**/*.graphql'
  - 'apps/web/src/**/*.graphql'
```

---

## IDE Setup

### VS Code

Install GraphQL extension:
- **GraphQL: Language Feature Support** (graphql.vscode-graphql)

This gives you:
- ✅ Schema autocomplete in `.graphql` files
- ✅ Query validation
- ✅ Jump to type definitions
- ✅ Real-time error checking

---

## CI/CD Integration

### Pre-commit Hook

GraphQL code generation should run before commit:

```bash
# Automatically added by husky
# Regenerates types if schema changed
pnpm graphql:codegen

# Then commit
git add packages/shared/src/graphql/types.ts
git add apps/mobile/src/graphql/types.ts
git add apps/web/src/graphql/types.ts
git commit -m "..."
```

### Pre-push Check

```bash
# Validate schema before push
pnpm graphql:validate

# Errors? Fix schema or operations
```

---

## Troubleshooting

### "Cannot find module '@/graphql/types'"

The types haven't been generated yet.

```bash
pnpm graphql:codegen
```

### "Property does not exist on type"

Your `.graphql` file has a field that doesn't exist in the schema.

**Fix**: Check the schema:
```bash
grep -n "fieldName" infra/cdk/lib/appsync/schema.graphql
```

Or remove the field from your query/mutation.

### Types are stale

Schema changed but types not regenerated.

```bash
# Regenerate
pnpm graphql:codegen

# Or set up file watcher
pnpm graphql:codegen --watch
```

---

## Best Practices

### 1. Collocate Queries with Components

```
apps/mobile/src/
  screens/
    Profile/
      index.tsx
      queries.graphql  ← Keep nearby
```

### 2. Name Operations Consistently

```graphql
query GetProfile { ... }
query ListItems { ... }
mutation UpdateProfile { ... }
mutation CreateItem { ... }
```

### 3. Query Only What You Need

❌ Bad:
```graphql
query ListItems {
  listItems {
    # Gets 20+ fields but only uses 3
    id
    foodName
    # ... 17 more unused fields
  }
}
```

✅ Good:
```graphql
query ListItems {
  listItems {
    id
    foodName
    expiryAt
  }
}
```

### 4. Use Variables for Dynamic Values

❌ Bad:
```graphql
query GetItem {
  getItem(id: "hardcoded-id") { ... }
}
```

✅ Good:
```graphql
query GetItem($id: ID!) {
  getItem(id: $id) { ... }
}
```

### 5. Keep Schema Documentation

```graphql
"""
List all food items in a household.
Includes expiry tracking and status.
"""
type Query {
  listItems(householdId: ID!): [Item!]!
}
```

---

## Example Full Workflow

### 1. Schema Defines API

```graphql
# infra/cdk/lib/appsync/schema.graphql

type Query {
  getProfile: Profile!
  listItems(householdId: ID!): [Item!]!
}

type Mutation {
  updateProfile(input: UpdateProfileInput!): Profile!
  createItem(input: CreateItemInput!): Item!
}

type Profile {
  id: ID!
  email: String!
  displayName: String
  timeZone: String!
  createdAt: AWSDateTime!
  updatedAt: AWSDateTime!
}
```

### 2. Mobile Team Writes Queries

```graphql
# apps/mobile/src/graphql/queries.graphql

query GetProfile {
  getProfile {
    id
    email
    displayName
    timeZone
  }
}

mutation UpdateProfile($input: UpdateProfileInput!) {
  updateProfile(input: $input) {
    id
    displayName
    updatedAt
  }
}
```

### 3. Types Are Generated

```bash
pnpm graphql:codegen
```

Creates:
```typescript
// apps/mobile/src/graphql/types.ts

export interface GetProfileQuery {
  getProfile: {
    id: string
    email: string
    displayName?: string
    timeZone: string
  }
}

export interface UpdateProfileMutation {
  updateProfile: {
    id: string
    displayName?: string
    updatedAt: string
  }
}
```

### 4. Component Uses With Full Type Safety

```typescript
import { GetProfileQuery } from '@/graphql/types'
import { GET_PROFILE } from '@/graphql/queries'

export function ProfileScreen() {
  const { data } = useQuery<GetProfileQuery>(GET_PROFILE)
  
  // ✅ TypeScript knows these fields exist
  return (
    <View>
      <Text>{data?.getProfile.email}</Text>
      <Text>{data?.getProfile.displayName}</Text>
    </View>
  )
}
```

### 5. If Schema Changes

```diff
  type Profile {
    id: ID!
    email: String!
    displayName: String
+   preferredCuisine: [String!]!
    timeZone: String!
    createdAt: AWSDateTime!
    updatedAt: AWSDateTime!
  }
```

**Regenerate types:**
```bash
pnpm graphql:codegen
```

**Now component will error if missing new field:**
```typescript
// ❌ Error: preferredCuisine not in type
// ✅ Add to query to fix
```

---

## Summary

| Task | Command | Result |
|------|---------|--------|
| Generate types | `pnpm graphql:codegen` | Types updated |
| Watch for changes | `pnpm graphql:codegen --watch` | Auto-regenerate |
| Validate schema | `pnpm graphql:validate` | Checks for errors |

**Result**: Type-safe GraphQL queries across all teams, no manual type writing, schema and code always in sync.

🎉 **Every query is type-checked. Every field is autocompleted. Zero runtime surprises.**
