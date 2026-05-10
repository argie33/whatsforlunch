# Complete Development Setup — One Script Does Everything

Choose one script based on your OS and it will:

1. ✅ Check all prerequisites (Node, pnpm, Docker)
2. ✅ Update repository to latest code
3. ✅ Install all dependencies
4. ✅ Start Docker services (DynamoDB + GraphQL API)
5. ✅ Wait for services to be healthy
6. ✅ Create database tables
7. ✅ Run 23 integration tests
8. ✅ Open browser windows
9. ✅ Show you what's next

---

## Pick Your OS

### macOS/Linux

```bash
chmod +x setup-dev.sh
./setup-dev.sh
```

The script will:
- Take ~3-5 minutes
- Check Node, pnpm, Docker are installed
- Start all services
- Run tests (should show 23/23 PASS)
- Open DynamoDB Admin UI and GraphQL API in browser
- Tell you exactly what to do next

### Windows (PowerShell)

```powershell
.\setup-dev.bat
```

Same as above, but for Windows.

---

## What Happens Step-by-Step

```
Step 1: Check Prerequisites
  ✅ Node.js installed?
  ✅ pnpm installed?
  ✅ Docker installed?
  ✅ Docker running?

Step 2: Update Code
  ✅ Pull latest from main branch

Step 3: Install Dependencies
  ✅ pnpm install (all packages)

Step 4: Start Services
  ✅ Docker Compose up -d
  ✅ Wait for DynamoDB healthy
  ✅ Wait for GraphQL API responsive

Step 5: Setup Database
  ✅ Create wfl-main-dev table
  ✅ Create GSI1, GSI2, GSI3, GSI4
  ✅ Enable streams

Step 6: Validate Everything
  ✅ Run 23 integration tests
  ✅ Test auth, profiles, households, items, persistence, errors

Step 7: Open Browser
  ✅ http://localhost:8001 (DynamoDB Admin)
  ✅ http://localhost:4000/graphql (GraphQL API)

Step 8: Show Summary
  ✅ Services running
  ✅ Next steps to launch app
```

---

## After Setup Completes

You'll see this:

```
╔════════════════════════════════════════╗
║  ✅ Setup Complete!                  ║
╚════════════════════════════════════════╝

Services running:
  • DynamoDB Local:     http://localhost:8000
  • DynamoDB Admin UI:  http://localhost:8001
  • GraphQL API:        http://localhost:4000/graphql

Next steps:
  1. Open a new terminal
  2. Run: cd apps/mobile && pnpm dev
  3. Choose: iOS (i), Android (a), or Expo Go (scan QR)
  4. Sign in with any email
  5. Create household and add food items

🚀 Ready to build!
```

---

## Then Launch the App

**In a NEW terminal:**

```bash
cd apps/mobile
pnpm dev
```

You'll see:
```
To open the app on a simulator or phone:

  ➜  Local:   http://localhost:19000
  ➜  press 'i' to run on iOS Simulator
  ➜  press 'a' to run on Android Emulator
  ➜  press 'w' to open web version
  ➜  press 'e' to share the QR code
```

Choose one:
- **i** = iOS Simulator (opens automatically)
- **a** = Android Emulator (opens automatically)
- **e** = QR code (scan with Expo Go on your phone)

---

## What You'll See in the App

1. **Sign In Screen**
   - Type any email (e.g., test@example.com)
   - Tap "Sign In"
   - Instant JWT token (no email verification needed locally)

2. **Home Screen**
   - Tap "Create"
   - Enter household name
   - Data saved to local DynamoDB

3. **Add Food Item**
   - Tap "Add Item"
   - Enter food name (e.g., "Milk")
   - Set expiry date
   - Data saved to DynamoDB

4. **See Your Data**
   - Open http://localhost:8001
   - Browse DynamoDB tables
   - See your exact data in real-time

---

## If Something Goes Wrong

### Docker won't start
```bash
# Restart Docker Desktop, then try again
docker ps
# Should show containers running

# Then run setup script again
```

### Tests fail
```bash
# Check services are running
docker compose ps

# Check logs
docker compose logs dynamodb
docker compose logs mock-api

# Restart
docker compose down -v
./setup-dev.sh  # or setup-dev.bat
```

### App won't connect
```bash
# Make sure backend is still running
curl http://localhost:4000/health
# Should return: {"status":"ok"}

# If not, restart services
pnpm local:setup
```

---

## System Requirements

- **Node.js** 20+
- **pnpm** 9+
- **Docker Desktop** (with 4GB+ RAM allocated)
- **10 GB** free disk space
- **2-3 minutes** for first setup

---

## What Each Script Does

### setup-dev.sh (macOS/Linux)
- Checks prerequisites
- Pulls latest code
- Installs dependencies
- Starts Docker
- Creates database
- Runs tests
- Opens browser
- Shows next steps

### setup-dev.bat (Windows)
- Same as above, but for Windows PowerShell

### START_NOW.sh / START_NOW.bat
- Faster version (assumes setup already done)
- Just starts backend + app
- Use after first setup

---

## Useful Commands After Setup

```bash
# Run integration tests anytime
pnpm local:test

# Add sample data
pnpm local:seed

# Stop all services
pnpm local:down

# Full clean reset
pnpm local:reset

# View API logs
pnpm local:api-logs

# View DynamoDB Admin UI
# Just open: http://localhost:8001

# Query GraphQL manually
# Just open: http://localhost:4000/graphql
```

---

## Timeline

- **First time**: 3-5 minutes (downloads Docker images)
- **After that**: ~1 minute (services already cached)
- **Every day**: Just run `pnpm local:setup` (30 seconds)

---

## Success Criteria

You're done when:

✅ No errors in terminal
✅ See "✅ Setup Complete!" message
✅ DynamoDB Admin UI opens (http://localhost:8001)
✅ GraphQL explorer opens (http://localhost:4000/graphql)
✅ Run `pnpm dev:mobile` and app launches
✅ Can sign in with any email
✅ Can create household
✅ Can add food items
✅ Data appears in DynamoDB Admin UI

**All good?** → Start building! 🚀

---

## Next Steps

1. Run setup script (3-5 min)
2. Launch app with `pnpm dev:mobile`
3. Test the full flow
4. Start building features
5. All teams work in parallel

That's it!
