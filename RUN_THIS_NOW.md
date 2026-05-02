# 🚀 GET THE APP WORKING - FOLLOW EXACTLY

## The Feature You're About to Test

**Complete item management**: Login → Add item → View items → Delete item

All working end-to-end with real API calls.

---

## STEP 1: Open 3 Terminal Windows

You need 3 separate terminals for 3 services.

---

## Terminal 1: Start Docker Services

```bash
pnpm local:start
```

**Wait for output like:**
```
whatsfresh-dynamodb-local-1  | Initializing DynamoDB Local with the following configuration:
whatsfresh-mock-api-1        | Starting local mock API...
```

It's ready when you see no new errors for 5 seconds.

---

## Terminal 2: Start the GraphQL API Server

```bash
pnpm local:api
```

**Expected output:**
```
🚀 WFL Local Mock API running at http://localhost:4000/graphql
📊 GraphiQL explorer available at http://localhost:4000/graphql
```

**VERIFY IT WORKS** - Run this curl in another window:
```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { signIn(email: \"test@dev\") { token userId } }"}'
```

Should return:
```json
{"data":{"signIn":{"token":"eyJhbGc...","userId":"user-123..."}}}
```

If not, STOP. API isn't working. Check the terminal output for errors.

---

## Terminal 3: Start the Mobile App

```bash
cd apps/mobile
pnpm dev
```

**Expected output:**
```
✔ Expo server started

│  Local:            exp://localhost:19000
│  LAN:              exp://192.168.x.x:19000
│  
│ Press 'w' for web
│ Press 'a' for Android
│ Press 'i' for iOS
```

---

## STEP 2: Test in Web Browser (Easiest)

In the Terminal 3 output above, **press `w`**

This opens the app at: `http://localhost:19006`

---

## STEP 3: Test the Complete Flow

**You should see:**

1. **Login screen** with email input and "Sign In" button

   - Enter email: `test@local.dev`
   - Click "Sign In"
   - **Should redirect to dashboard**

2. **Dashboard** showing "0 items" and empty state

   - Click **blue `+` button** on bottom right
   - **Add Item form appears**

3. **Add Item** form

   - Food name: `Milk`
   - Select storage: `fridge`
   - Click "Add Item"
   - **Should say "Success! Item added!"**

4. **Items List** updates

   - Should see `Milk` in the list
   - Should show "📍 fridge"
   - Should show expiry date

5. **Delete Item**

   - Click trash icon on the item
   - Click "Delete" in confirmation
   - **Item disappears**

---

## TROUBLESHOOTING

### "Cannot connect to API"

**Problem**: App can't reach the GraphQL API

**Fix**:
```bash
# Check API is running
curl http://localhost:4000/graphql -H "Content-Type: application/json" -d '{}'

# If error, Terminal 2 isn't running properly. Check logs.
pnpm local:api-logs
```

### "Sign in failed"

**Problem**: Auth mutation returns error

**Fix**:
```bash
# Check .env.local has correct settings
cat apps/mobile/.env.local
# Should show:
# EXPO_PUBLIC_APPSYNC_URL=http://localhost:4000/graphql
# EXPO_PUBLIC_AUTH_MODE=local

# If not, create it:
cp apps/mobile/.env.local.example apps/mobile/.env.local
```

### "Items don't show after adding"

**Problem**: Fetch fails silently

**Fix**: Open browser console (F12) and look for errors. Common issues:
- Token is null (auth failed)
- Network request fails (check API running)
- Malformed GraphQL query

**Debug**: Test the API directly:
```bash
# 1. Get a token
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { signIn(email: \"test@dev\") { token userId } }"}'

# 2. Use token to list items
TOKEN="eyJhbGc..." # from above response
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query":"query { listItems(householdId: \"test-hh\") { id foodName } }"}'

# Should return items array (may be empty, that's ok)
```

### "Red error screen" in browser

**What to do**:
1. Check browser console for error message (F12)
2. Check Terminal 3 (mobile) console
3. Check Terminal 2 (API) logs
4. Common causes:
   - Missing dependency
   - Import error
   - API call exception

---

## Quick Health Check Commands

Run these to verify everything is working:

```bash
# Check Docker services running
docker-compose -f docker-compose.local.yml ps

# Check API responding
curl http://localhost:4000/graphql -v

# Check mobile app compiling
cd apps/mobile && npm run build:web

# Check environment
cat apps/mobile/.env.local
```

---

## What's Working

✅ **Login** - Calls API, stores JWT token
✅ **View Items** - Fetches from API every 10 seconds
✅ **Add Item** - Calls API mutation, shows success/error
✅ **Delete Item** - Calls API, refreshes list
✅ **Error Handling** - Shows alerts on failure

---

## What's Next After This Works

Once you see the full flow working (login → add item → view → delete):

1. **Same for other features**:
   - View item details
   - Edit item
   - Mark as eaten/tossed
   - Search/filter items

2. **Other screens**:
   - Scan (camera)
   - Recipes/recommendations
   - Settings
   - Profile

3. **Offline sync** - Eventually integrate WatermelonDB sync

---

## Timeline

- Start services: **2 min**
- Test in browser: **5 min**
- Complete flow (login → add → delete): **10 min**

**Total: 15-20 minutes to see the app fully working.**

---

**GO. RUN IT. TELL ME WHAT BREAKS.**
