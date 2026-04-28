# Preview the App Locally

See the WhatsForLunch mobile app working with your local infrastructure.

## What You'll See

- ✅ Sign-in screen
- ✅ Create household
- ✅ Add food items
- ✅ Track expiry dates
- ✅ All data in local DynamoDB
- ✅ Real-time updates
- ✅ Food item AI classification (mock)

All running locally. No AWS needed.

---

## Option 1: Quick Browser Test (Easiest)

If you don't have iPhone/Android simulator set up:

### 1. Start Backend
```bash
pnpm local:setup
# Starts DynamoDB + GraphQL API
# Wait for "All services healthy"
```

### 2. Start Mobile App Dev Server
```bash
# In new terminal
cd apps/mobile
pnpm dev
```

### 3. Use Expo Go on Your Phone
- Download Expo Go app from App Store or Google Play
- Point to your computer's IP address
- Scan QR code shown in terminal
- App launches on your phone

**You now see the real app UI working locally.** 🎉

---

## Option 2: iOS Simulator (Mac Only)

### 1. Start Backend
```bash
pnpm local:setup
```

### 2. Start App with iOS Simulator
```bash
cd apps/mobile
pnpm dev

# When prompted, press: i
# (iOS Simulator will launch)
```

### 3. See App in Simulator
- iPhone simulator opens automatically
- App loads and connects to localhost:4000
- Sign in with any email
- Create household and add items

---

## Option 3: Android Emulator

### 1. Start Backend
```bash
pnpm local:setup
```

### 2. Start Android Emulator
```bash
# First, open Android emulator
# (using Android Studio or Android emulator directly)
```

### 3. Start App
```bash
cd apps/mobile
pnpm dev

# When prompted, press: a
# (App installs and launches in emulator)
```

---

## Test Flow

Once the app is running:

### 1. Sign In
- Type any email (e.g., `test@example.com`)
- Tap "Sign In"
- **Instant JWT token** (no email needed locally)

### 2. Create Household
- Tap "Create"
- Enter household name (e.g., "My Kitchen")
- Tap "Save"
- **Stored in local DynamoDB**

### 3. Add Food Item
- Tap "Add Item"
- Enter food name (e.g., "Milk")
- Enter expiry date (e.g., tomorrow)
- Tap "Save"
- **Stored in local DynamoDB**

### 4. See Item
- Item appears in list
- Shows expiry countdown
- Color-coded by freshness
- **All real data flow**

### 5. Mark Eaten
- Swipe or tap item
- Tap "Mark Eaten"
- Status changes to "eaten"
- **Real mutation working**

---

## Browse Your Data

While app is running, open browser:

### DynamoDB Admin UI
```
http://localhost:8001
```
- See `wfl-main-dev` table
- Browse all items created
- See real data persisting

### GraphQL API
```
http://localhost:4000/graphql
```
- Run queries manually
- Test mutations
- See schema

### Health Check
```
http://localhost:4000/health
```
- Verify API is up
- Should return `{"status":"ok"}`

---

## Troubleshooting

### App won't connect to API

**Check**: Is backend running?
```bash
pnpm local:setup
```

**Check**: Is API responding?
```bash
curl http://localhost:4000/health
```

**Fix**: Restart app in terminal
```bash
# In apps/mobile terminal
pnpm dev

# Press 'i' (iOS) or 'a' (Android) again
```

### Simulator/Phone can't reach localhost:4000

**For iPhone Simulator**: Should work automatically (bridge network)

**For Android Emulator**: Edit `apps/mobile/.env.local`:
```
EXPO_PUBLIC_APPSYNC_URL=http://10.0.2.2:4000/graphql
```
(10.0.2.2 is Android's special IP for host machine)

**For Physical Phone**: Use your computer's IP address:
```
EXPO_PUBLIC_APPSYNC_URL=http://192.168.1.100:4000/graphql
# Replace 192.168.1.100 with your actual IP
```

### "Database not found" error

**Fix**: Set up tables
```bash
pnpm local:setup
```

### "Table already exists" warnings

**OK to ignore** - means tables already exist from previous run.

---

## Reset Everything

If something breaks:

```bash
# Stop everything
pnpm local:down

# Full clean reset
pnpm local:reset

# Restart
pnpm local:setup
pnpm dev:mobile
```

---

## What's Happening Behind the Scenes

```
Your Phone/Simulator
    ↓
Expo Dev Server (localhost:3000)
    ↓
GraphQL Query to http://localhost:4000/graphql
    ↓
Mock GraphQL API (graphql-yoga)
    ↓
DynamoDB Local (http://localhost:8000)
    ↓
Data persists in memory (or volume)
```

All local. All your machine. Zero AWS.

---

## Next Steps

1. **Now**: Get app running with `pnpm dev:mobile`
2. **Play**: Create households, add items, see data
3. **Verify**: Open http://localhost:8001 → see data in DynamoDB
4. **Explore**: http://localhost:4000/graphql → run queries
5. **Build**: Start making changes to the app
6. **Commit**: Push changes when ready

---

## Success Criteria

You're good when:

- ✅ App launches (iPhone sim, Android emu, or physical phone)
- ✅ You can sign in with any email
- ✅ You can create a household
- ✅ You can add a food item
- ✅ DynamoDB Admin UI shows your data at http://localhost:8001
- ✅ No errors in terminal

**All good?** → Infrastructure is working perfectly. Start building. 🚀

---

## Commands Reference

```bash
# Backend
pnpm local:setup        # Start Docker + create tables
pnpm local:down         # Stop everything
pnpm local:reset        # Wipe and restart fresh
pnpm local:api-logs     # View API logs

# App
pnpm dev:mobile         # Start mobile app dev server
# Then press: i (iOS) or a (Android) or scan QR code

# Data
pnpm local:seed         # Add sample data
pnpm local:migrate      # Create tables

# Database
# Browse: http://localhost:8001
# Query:  http://localhost:4000/graphql
# Health: http://localhost:4000/health
```

---

**Ready?** → `pnpm local:setup && pnpm dev:mobile` 🚀
