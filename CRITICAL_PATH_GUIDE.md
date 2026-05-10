# Critical Path: Get Login → Dashboard → Items Working

**Goal**: Build ONE working feature end-to-end that users can actually see and use.

## What We're Building

The **core user flow**:

1. App loads
2. User sees login screen
3. User enters email
4. App calls local API → gets JWT token
5. User navigates to dashboard
6. Dashboard loads items from API
7. Items display on screen

## Architecture

```
┌─────────────────────┐
│  Expo Mobile App    │
│  (apps/mobile)      │
└──────────┬──────────┘
           │
           │ HTTP + JWT
           ▼
┌─────────────────────┐
│  Local Mock API     │
│  (services/        │
│   local-mock)       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  In-Memory DB       │
│  (for local dev)    │
└─────────────────────┘
```

## What's Already Built

✅ Entry point fixed (`apps/mobile/index.js` → uses real Expo app)
✅ Auth service supports local API mode (`EXPO_PUBLIC_AUTH_MODE=local`)
✅ Local auth function (`localSignIn()` calls API and stores JWT)
✅ Local GraphQL client (`local-api-client.ts`)
✅ Hook for fetching items (`useLocalAPIItems()`)
✅ Local mock API has `listItems` query
✅ Mock API has `signIn` mutation

## What Needs to Be Done

### Step 1: Start the Local API (5 minutes)

**Terminal 1 - Start Docker services:**

```bash
pnpm local:start
```

Wait for it to say services are running. You should see:

- DynamoDB running
- Redis running (optional)

**Terminal 2 - Start the mock API:**

```bash
pnpm local:api
```

You should see:

```
🚀 WFL Local Mock API running at http://localhost:4000/graphql
```

### Step 2: Verify the API Works (2 minutes)

Test the signIn mutation:

```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { signIn(email: \"test@local.dev\") { token userId } }"
  }'
```

You should get back:

```json
{
  "data": {
    "signIn": {
      "token": "eyJhbGc...",
      "userId": "user-12345"
    }
  }
}
```

### Step 3: Add a Test Item (Optional - for testing)

```bash
# Get the token from the signIn response above, then:
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_HERE>" \
  -d '{
    "query": "mutation { createItem(input: { householdId: \"test-hh\", foodName: \"Milk\", category: dairy, storageLocation: fridge, expiryAt: \"2026-05-05T00:00:00Z\" }) { id foodName } }"
  }'
```

### Step 4: Start the Mobile App (3 minutes)

**Terminal 3 - Start mobile app:**

```bash
cd apps/mobile
pnpm dev
```

You should see:

```
✔ Expo server started
│ Local:     exp://localhost:19000
│ Press 'i' for iOS
│ Press 'a' for Android
│ Press 'w' for web
```

### Step 5: Test in Web Browser (Easiest)

Press `w` in the terminal above. The app should open in `http://localhost:19006`

**Expected flow:**

1. See login screen (email input + sign in button)
2. Enter: `test@local.dev`
3. Click "Sign In"
4. App should show dashboard
5. Should see items (or empty state)

## Troubleshooting

### "Cannot connect to API"

- Check that `pnpm local:api` is running
- Check `.env.local` has `EXPO_PUBLIC_APPSYNC_URL=http://localhost:4000/graphql`
- Check `EXPO_PUBLIC_AUTH_MODE=local`

### "Sign in failed"

- Verify API is responding: `curl http://localhost:4000/graphql`
- Check API logs: `pnpm local:api-logs`

### "Items not showing"

- Check dashboard is loading (not showing error screen)
- Check browser dev console for errors
- Manually test the listItems query:
  ```bash
  curl -X POST http://localhost:4000/graphql \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <TOKEN>" \
    -d '{
      "query": "query { listItems(householdId: \"test-hh\") { id foodName } }"
    }'
  ```

## Files Modified

- `apps/mobile/src/lib/local-api-client.ts` - GraphQL client for local API
- `apps/mobile/src/hooks/useLocalAPIItems.ts` - Hook for fetching items
- `apps/mobile/src/features/auth/authService.ts` - Already updated to call local API
- `apps/mobile/src/lib/local-auth.ts` - Already set up for API calls

## Next: Dashboard Integration

Once the above works, the dashboard needs to use `useLocalAPIItems()` to display real items from the API instead of relying on the complex SyncService for now.

Files to update:

- `apps/mobile/app/(main)/index.tsx` - Dashboard screen

The change would be simple: instead of reading from WatermelonDB, read from the API using the hook.

---

**Timeline**: 15-20 minutes total to get full flow working end-to-end.

**Success criteria**:

- [ ] Login screen appears
- [ ] Can sign in with any email
- [ ] Dashboard loads after sign in
- [ ] Items display (even if empty)
- [ ] No red error screens
