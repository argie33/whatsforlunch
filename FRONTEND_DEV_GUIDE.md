# Frontend Developer Guide: WhatsForLunch Local Setup

## Quick Start (5 minutes)

```bash
# 1. Verify Claude Code is installed (required for local AI)
claude --version
# Should output something like: Claude Code v0.x.x

# 2. From project root, start the API
pnpm local:api &
# Wait for: "Local GraphQL API listening on http://localhost:4000"

# 3. Start mobile dev server
cd apps/mobile
npx expo start --localhost
# Wait for: "Metro bundler running on..."

# 4. Open in browser
# http://localhost:8082
# Email: test@local.dev (auto-login in dev)
```

## Architecture: How Everything Works

```
┌─────────────────────────────────────────────────────────┐
│                  Mobile App (Expo/Web)                   │
│              (http://localhost:8082)                      │
└────────────────────────┬────────────────────────────────┘
                         │ (GraphQL mutations/queries)
                         ↓
┌─────────────────────────────────────────────────────────┐
│          Local Mock API (GraphQL Server)                │
│              (http://localhost:4000)                     │
└────────────────────────┬────────────────────────────────┘
                         │ (For AI features)
                         ↓
┌─────────────────────────────────────────────────────────┐
│    Claude Code (Subprocess) ← THIS SIMULATES BEDROCK    │
│         (Auto-detected: `claude --version`)             │
│                                                          │
│  Priority: Claude Code > Claude API > Mocks            │
│  (Will be swapped for real Bedrock in AWS)             │
└─────────────────────────────────────────────────────────┘
```

## What's Already Built ✅

- **Backend (100%)**
  - GraphQL API with all resolvers working
  - Auth (JWT tokens, no Cognito in local mode)
  - Item CRUD, shopping lists, households
  - AI service integrated with Claude Code support

- **Mobile Code (100%)**
  - All screens built (dashboard, shopping, recipes, settings)
  - Database setup (WatermelonDB)
  - Sync engine & offline support
  - Navigation, components, i18n

- **Tests (260+ passing)**
  - All unit tests green
  - Integration tests (can run manually)

## What Needs Frontend Work 🔧

### Priority 1: Wire Up AI Features (Claude Code)

**1. Food Classification Screen**

- User takes/uploads photo
- → Calls `classifyFood(householdId, photoUrl)` GraphQL mutation
- → Claude Code analyzes image
- → Returns food name, category, expiry estimate
- → Creates new item in app

**File:** `apps/mobile/app/(main)/_layout.tsx` or new `scan.tsx`
**Status:** UI exists, needs API wiring

**2. OCR Expiry Dates**

- When editing item, user can upload packaging photo
- → Calls `ocrExpiryDate(photoUrl)` GraphQL mutation
- → Claude Code reads expiry date from image
- → Updates item's expiryAt field

**File:** `apps/mobile/app/(main)/items/edit/[id].tsx`
**Status:** Partially built, needs Claude integration

**3. Recipe Recommendations (Already 70% done!)**

- User views `recipes.tsx` screen
- System shows expiring items → User selects items
- → Calls `getRecommendations(householdId)` GraphQL query
- → Claude Code generates recipes from available items
- → Shows recipes with cook button

**File:** `apps/mobile/app/(main)/recipes.tsx`
**Status:** Screen exists, needs API call wiring + testing

### Priority 2: QR Code Scanning

**Container Claim Flow**

- User scans QR code on container
- → Calls `claimContainer(householdId, qrToken, nickname)` mutation
- → Creates container, stores in app

**File:** `apps/mobile/app/(main)/scan.tsx`
**Status:** UI built, needs resolver wiring

### Priority 3: Shopping List Polish

**File:** `apps/mobile/app/(main)/shopping.tsx`
**Status:** Functional, may need filtering/sorting enhancements

## How to Debug AI Features

Check the API logs to see Claude Code being called:

```bash
# In the terminal running `pnpm local:api`, look for:
[AIService] ✅ Using Claude Code (local subprocess) for food classification & recipes

# When a feature is used, you'll see:
[AIService] Claude classification successful: "Milk", "dairy", 14 days, 0.92 confidence
```

If Claude Code is not being used:

```bash
# Check: Is claude CLI installed?
which claude  # Should return a path

# Check: Can we call it?
claude "What is 2+2?"  # Should respond

# Check: API logs show fallback?
[AIService] ℹ️  Claude Code & API not available. Using mock responses
```

## Testing Checklist

- [ ] App loads at localhost:8082
- [ ] Can sign in with test@local.dev
- [ ] Can create items
- [ ] Can view recipes screen
- [ ] See Claude Code logs in API terminal
- [ ] Recipes show real recommendations (not mocks)
- [ ] Can delete items, items marked as eaten
- [ ] Shopping list works
- [ ] Settings screens functional
- [ ] Dark mode toggle works
- [ ] All i18n translations render

## Common Issues

**"Claude Code not found"**

```bash
# Solution: Install Claude Code
# From: https://claude.com/claude-code
# Or check it's in PATH
claude --version
```

**"API not responding"**

```bash
# Make sure API is running
pnpm local:api
# Should see: "Local GraphQL API listening on http://localhost:4000"
```

**"Mobile app shows white screen"**

```bash
# Clear cache and restart
npx expo start --localhost --clear
```

**Recipes showing mocks, not Claude responses**

```bash
# Check API logs for Claude Code errors
# Make sure photosare valid URLs or base64 data URIs
# Test Claude Code directly: claude "hello"
```

## Key Files to Know

```
apps/mobile/
├── app/
│   ├── (main)/
│   │   ├── index.tsx              # Dashboard (items list)
│   │   ├── recipes.tsx            # 🔥 WIRE THIS: Recommendations
│   │   ├── shopping.tsx           # Shopping list
│   │   ├── scan.tsx               # 🔥 WIRE THIS: QR code scanning
│   │   ├── containers.tsx         # Container management
│   │   ├── items/
│   │   │   └── edit/[id].tsx      # 🔥 WIRE THIS: OCR integration
│   │   └── settings/              # All settings screens (done)
│   ├── (auth)/
│   │   ├── sign-in.tsx            # Auth flow (done)
│   │   └── verify.tsx
│   └── _layout.tsx                # Root layout + auth gate
├── src/
│   ├── db/                        # WatermelonDB setup
│   ├── lib/                       # Utilities
│   └── features/                  # Feature modules
└── package.json

services/local-mock/
└── src/
    ├── ai-service.ts             # 🎯 Claude Code integration (done!)
    ├── resolvers.ts              # All GraphQL resolvers (done!)
    └── index.ts                  # GraphQL schema + setup
```

## What "Fully Working Locally" Means

✅ All 3 AI features work with Claude Code

- Food classification reads real images
- OCR reads real expiry dates
- Recipes generated from available items

✅ All data flows end-to-end

- Create item → Food classification → Item stored
- Edit item → OCR expiry → Expiry updated
- Select items → Recipes generated → Cook flow

✅ All screens are functional

- No placeholder data
- All API calls wired
- All error handling in place

✅ No white screens or crashes

## Next Steps

1. Start the full stack (API + Expo)
2. Pick ONE feature from Priority 1 (recommend starting with recipes.tsx since it's 70% done)
3. Wire it to the API
4. Test in browser
5. Check API logs for Claude Code being called
6. Move to next feature

## Questions?

Check these first:

- Are both servers running? (API + Expo)
- Is Claude Code installed? (`claude --version`)
- Are you getting any error messages? (check both terminals + browser console)
- Can you access the API directly? (test in terminal: `curl http://localhost:4000/health`)
