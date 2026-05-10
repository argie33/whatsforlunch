# How to Actually Test Everything - Real Steps

## The Honest Truth

We've built:

- ✅ Phase C backend infrastructure (APIs, resolvers, Lambdas)
- ✅ Phase A/B mobile UI screens (login, dashboard, scan, etc.)
- ❓ But we don't know if it actually RUNS

You can't test until you START the app and see what actually breaks. That's the only way to know what else needs to be built.

---

## Step 1: Verify Prerequisites

**Do you have these installed?**

```bash
# Check Node version (need 20.18+)
node --version

# Check pnpm (need 9.0+)
pnpm --version

# Check Xcode (for iOS simulator)
xcode-select -p
# or
# Check Android Studio + Emulator (for Android)
```

If any are missing, that's the blocker. Let me know which.

---

## Step 2: Full Clean Install

```bash
cd /c/Users/arger/code/whatsfresh
pnpm install --force
```

Wait for it to complete (might take 2-3 minutes).

---

## Step 3: Start the Backend Stack

**Terminal 1: Docker services**

```bash
pnpm local:start
```

Wait for: `DynamoDB is running`, `Redis is running`

**Terminal 2: Create tables**

```bash
pnpm local:migrate
```

Wait for: All 6 Phase C tables created

**Terminal 3: Start GraphQL API**

```bash
cd services/local-mock && npm run dev
```

Wait for:

```
🚀 WFL Local Mock API running at http://localhost:4000/graphql
```

---

## Step 4: Start the Mobile App

**Terminal 4: Mobile app**

```bash
cd apps/mobile
npm start
```

You should see:

```
✔ Expo server started
│
│   Local:            exp://localhost:19000
│   LAN:              exp://192.168.x.x:19000
│
│ Press 'w' for web
│ Press 'a' for Android
│ Press 'i' for iOS
│ Press 'j' to open debugger
│ Press 'r' to reload app
│ Press 'Ctrl+C' to stop
```

---

## Step 5: Choose Your Device

### Option A: iOS Simulator

- Must be on Mac (you're on Windows, so skip this)

### Option B: Android Emulator

- Open Android Studio → Virtual Device Manager
- Launch an emulator (Pixel 6 recommended)
- In Terminal 4, press `a`
- App should build and launch

### Option C: Web Browser

- In Terminal 4, press `w`
- Opens localhost:19006
- Limited (can't test camera/QR), but fast

---

## Step 6: What You'll See

**If it works:**

- Splash screen appears
- Sign-in screen loads
- You can type email address
- Sign-in button works
- Dashboard loads with empty state

**If it doesn't work:**

- You'll see an error message
- Red screen with error details
- This is the blocker we need to fix

---

## Step 7: Once App is Running

**Login:**

- Email: `test@local.dev` (any email works in local mode)
- Password: (any password, local mode doesn't validate)
- Should create account + go to dashboard

**Test Core Features:**

- See empty dashboard
- Tap + button to add item
- Fill in: Food name, expiry date, storage location
- Save → item appears
- Tap item → see details
- Swipe left → delete item
- Scan button → camera opens (might fail on web)

**Test Phase C APIs (if they're integrated):**

- Go to recipes screen → see recommendations (currently stubbed)
- Go to settings → see analytics (if built)
- etc.

---

## What to Report Back

Once you try this, tell me:

1. **Does the app start?** (yes/no)
2. **What error do you see?** (copy the red screen error)
3. **How far do you get?** (splash → login → dashboard → feature XYZ)
4. **Which device?** (Android emulator / Web / Physical device)

---

## Common Blockers We Might Hit

| Problem                        | Solution                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------ |
| `ENOENT: no such file`         | Run `pnpm install --force`                                                     |
| `Module not found: ...`        | Dependencies missing, run install again                                        |
| `Cannot find Android emulator` | Open Android Studio, start emulator first                                      |
| `Metro bundler timeout`        | Restart Terminal 4, press `a` again                                            |
| `GraphQL connection refused`   | Make sure Terminal 3 (API) is running                                          |
| `Can't connect to backend`     | Check `.env.local` has `EXPO_PUBLIC_APPSYNC_URL=http://localhost:4000/graphql` |

---

## Timeline

- **Install**: 2-3 min
- **Backend start**: 1 min
- **Mobile start**: 2-3 min
- **First screen**: depends on errors

Total: **5-10 minutes** before you see what's actually broken.

---

## Go Now

Open 4 terminals and follow the steps above. Come back and tell me:

1. Did app start?
2. What error (if any)?
3. How far did you get?

Then we know exactly what's left to build.
