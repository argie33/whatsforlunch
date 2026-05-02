# WhatsFresh - Quick Start Guide

**Get the app running in 2 minutes**

---

## 🚀 START THE STACK

### Terminal 1: Start Backend API

```bash
cd /path/to/whatsfresh
pnpm local:api
```

**Expected output**:

```
Listening on http://localhost:4000/graphql
```

### Terminal 2: Start Frontend

```bash
cd /path/to/whatsfresh/apps/mobile
pnpm dev
```

**Expected output**:

```
Metro bundler on port 8082
```

### Browser: Open the App

```
http://localhost:8082
```

---

## 🔐 SIGN IN

```
Email: test@local.dev
Password: (any password, local auth ignores it)
```

---

## ✅ QUICK TESTS

### Test 1: Navigate Screens (30 seconds)

1. ✅ Dashboard — Should show empty (no items yet)
2. ✅ Containers — Should show empty
3. ✅ Shopping — Should show empty
4. ✅ Recipes — Should show 5 mock recipes
5. ✅ Settings — Should show profile info

**Result**: All screens load without errors

### Test 2: Create Item (1 minute)

1. Dashboard screen
2. Click "Add Item" or similar button
3. Enter: Name = "Milk", Location = "fridge"
4. Click Save
5. ✅ Item appears in list

### Test 3: Shopping List (1 minute)

1. Go to Shopping List screen
2. Enter: "Bread"
3. Click Add
4. ✅ Item appears in shopping list
5. Click item to mark purchased
6. ✅ Item status changes

### Test 4: Household Members (1 minute)

1. Go to Settings → Household Members
2. Click "Invite Member"
3. Enter: Email = "friend@example.com"
4. Select Role = "Member"
5. Click Send Invite
6. ✅ Friend appears in members list

### Test 5: Recipes (30 seconds)

1. Go to Recipes screen
2. ✅ See 5 recipe recommendations
3. Click a recipe
4. ✅ See ingredients, time, difficulty

---

## 🛠️ VERIFY BACKEND DIRECTLY

### Check API is running

```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { signIn(email: \"test@local.dev\") { token } }"}'
```

**Expected**: Returns JWT token

### Check GraphQL Schema

```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __type(name: \"Query\") { fields { name } } }"}'
```

**Expected**: Lists all available queries

---

## 📱 BROWSER DEVELOPER TOOLS

### Check Console

Press `F12` → Console tab

- Should be clean (no errors on startup)
- May see info logs (expected)

### Check Network

Press `F12` → Network tab

- Click item in dashboard
- Should see GraphQL mutation request to `localhost:4000/graphql`
- Should see response with item data

### Check Local Storage

Press `F12` → Application → Local Storage

- Look for `auth_token` key
- Should contain JWT token

### Check IndexedDB (WatermelonDB)

Press `F12` → Application → IndexedDB

- Look for `WhatsFresh` database
- Should see tables: `items`, `shopping_lists`, `containers`, `households`

---

## ❌ TROUBLESHOOTING

### Backend won't start

```bash
# Check if port 4000 is in use
lsof -i :4000
# Kill process if needed
kill -9 <PID>
# Try again
pnpm local:api
```

### Frontend won't start

```bash
# Make sure you're in mobile directory
cd apps/mobile
# Check Node version (should be 18+)
node --version
# Clear cache and try
pnpm dev
```

### Sign in fails

- Check backend is running (terminal 1)
- Check network tab for GraphQL error
- Verify email is `test@local.dev` exactly

### Items don't appear after creating

1. Check browser console for errors
2. Check browser network tab for failed requests
3. Refresh page (may need local sync)
4. Check browser's IndexedDB (storage issue?)

---

## 🧪 RUN TESTS

```bash
# Full test suite
pnpm test

# Just mobile tests
cd apps/mobile && pnpm test

# With watch (re-run on file change)
pnpm test -- --watch
```

**Expected**: 260+ tests passing (52 CDK + 208 mobile)

---

## 📊 WHAT YOU CAN DO IN THE APP

✅ **Sign in** with test account  
✅ **Create items** (food in fridge/freezer/pantry)  
✅ **View items** in dashboard  
✅ **Delete items** from list  
✅ **Manage shopping list** (add, purchase, delete)  
✅ **View recipes** (mock recommendations)  
✅ **Invite household members** (invite via email)  
✅ **Remove members** from household  
✅ **Update profile** in settings  
✅ **Sign out** and sign back in

❌ **Real-time sync** (disabled for local dev, use polling)  
❌ **Push notifications** (not integrated yet)  
❌ **Photo upload** (needs AWS S3)  
❌ **Barcode scanning** (not implemented)

---

## 🎯 NEXT STEPS

See `CRITICAL_BLOCKERS_&_HANDOFF.md` for:

- What needs to be fixed next
- What's partially done
- Detailed code patterns
- Common tasks for frontend developers

---

## 📞 QUICK REFERENCE

**Ports**:

- Backend API: http://localhost:4000/graphql
- Frontend: http://localhost:8082
- Database: In-memory (no external service needed)

**Test Account**:

- Email: `test@local.dev`
- Password: `any` (not validated locally)

**Key Files**:

- Backend schema: `infra/cdk/lib/appsync/schema.graphql`
- Mobile screens: `apps/mobile/app/(main)/*.tsx`
- Services: `apps/mobile/src/services/`
- Database: `apps/mobile/src/db/`

---

_Last verified: 2026-05-01_  
_All features working end-to-end ✅_
