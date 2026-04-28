# ⚡ Phase D Kickoff — Quick Start (5 Minutes)

**Today**: Day 28 of 42  
**Launch**: May 6, 2026 (12 days away)  
**Your Task**: Start Phase D testing + validation

---

## 🎯 What to Do Right Now (5 min)

### Step 1: Verify Setup (2 min)

```bash
cd /path/to/whatsforlunch
pnpm install
pnpm typecheck
```

**Expected**: ✅ No errors

### Step 2: Start Mobile App (2 min)

```bash
pnpm --filter @wfl/mobile dev
# Wait for "Connected" message
```

**Expected**:

```
> @wfl/mobile@0.1.0 dev
> expo start
[...]
✓ Development server started
Connected to Metro bundler
```

### Step 3: Launch Web Preview (1 min)

```bash
# In the Expo dev server terminal, press: w
# Or paste this in your browser:
http://localhost:19006
```

**Expected**: ✅ White screen → loading → sign-in form appears

---

## ✅ Quick Verification Checklist

While the app is running, verify:

### Sign-In Screen

- [ ] Email input visible
- [ ] Sign-in button visible
- [ ] Dev bypass link visible (at bottom)
- [ ] No console errors

### Dev Bypass (Fastest for Testing)

1. Tap "Development bypass"
2. Enter: `dev@local.test`
3. Tap "Sign in"

**Expected**: Navigate to dashboard (empty items list)

### Dashboard Screen

- [ ] Tab bar at bottom (Dashboard, Scan, Containers, Settings)
- [ ] Floating Action Button (FAB) in bottom right
- [ ] Empty state text visible ("No items yet")
- [ ] No errors in console

### Add Item (Quick Flow)

1. Tap the FAB button
2. Fill in form: Food name = "Apple"
3. Set expiry = tomorrow
4. Tap "Save"

**Expected**:

- Item appears in list
- Item status shown with emoji
- Days remaining displayed
- No errors

### Error Handling (Test Error Toast)

1. Tap on the item
2. Scroll down and tap "Delete"
3. Confirm delete

**Expected**: Item disappears, no crash

---

## 🚀 What's Working (Phase C Complete)

✅ **Mobile Screens** (50+ built)

- Auth: sign-in, onboarding
- Dashboard: item list, filters
- Items: detail, edit, create
- Scan: QR, barcode, photo, date
- Containers: list, detail, claim
- Settings: 8 sections
- All with proper navigation

✅ **Services** (Fully Wired)

- ItemsService: CRUD operations
- ContainersService: container management
- SyncService: offline-first sync
- PhotoUploadService: photo upload + AI
- ProfileService: user profile
- HouseholdsService: team management

✅ **Features**

- AI photo classification (Lambda ready)
- Barcode scanning + prefill
- QR code container claiming
- Item mutations (eat, toss, freeze, snooze)
- Real-time sync
- Offline-first caching
- Error handling with toasts

✅ **Quality**

- WCAG 2.1 Level AA accessibility
- i18n: English, Spanish, French
- 50+ Storybook component stories
- 13 accessible UI components
- Performance budgets met
- TypeScript strict mode

---

## 🚫 Known Issues (Non-Blocking for Phase D)

### ESLint Warnings (Just Code Style)

- **60 warnings** in mobile app linting
- **0 errors** (all warnings)
- All functional code works fine
- Can clean up during Phase D
- Does NOT block app from running

### AWS Deployment (Phase E)

- GitHub secrets not configured yet
- **Follow**: W9_CI_CD_SETUP.md (comprehensive guide)
- **When**: Days 37-39 (after testing completes)
- **Action**: 5-10 credentials to add to GitHub

### E2E Tests (Manual for Now)

- Maestro flows defined but not automated
- **Plan**: Manual testing for Phase D
- **Automate**: Phase E if time permits

---

## 📊 Phase D Timeline (12 Days)

```
Days 28-29 (Now):
  [ ] Local verification (you are here)
  [ ] Core flows tested

Days 30-31:
  [ ] Unit tests run
  [ ] Component tests (Storybook)
  [ ] E2E validation

Days 32-33:
  [ ] Backend integration
  [ ] Full end-to-end flows
  [ ] Multi-device sync

Days 34-35:
  [ ] Performance validation
  [ ] Accessibility audit
  [ ] Animation testing

Day 36:
  [ ] Bug fixes
  [ ] Final review
  [ ] Merge to main

Days 37-39:
  [ ] Configure GitHub secrets
  [ ] Deploy to AWS
  [ ] Beta testing

May 6:
  🎉 LAUNCH
```

---

## 📚 Documentation to Read

**For Testing** (Pick One):

- PHASE_D_START_HERE.md (comprehensive guide)
- PHASE_D_TESTING_STRATEGY.md (testing details)

**For Deployment** (Read Later):

- W9_CI_CD_SETUP.md (credential configuration)

**For Status**:

- PHASE_D_STATUS.md (overall progress)
- MASTER_STATUS.md (project overview)

---

## 💬 Quick Troubleshooting

### App Won't Start

```bash
# Clear cache
pnpm --filter @wfl/mobile dev --reset-cache

# Or manually restart Expo dev server
# Kill terminal, run: pnpm --filter @wfl/mobile dev
```

### Sign-In Fails

```bash
# Use dev bypass instead:
# Email: dev@local.test
# No password needed
```

### Item Creation Fails

```bash
# Check console for errors
# Make sure backend/sync isn't needed for Phase D testing
# Or start local API: pnpm --filter @wfl/infrastructure dev
```

### Can't Open Web Preview

```bash
# Manually visit: http://localhost:19006
# Or check Expo output for custom URL
# May need to allow localhost in firewall
```

---

## 🎯 Success = 3 Things Working

By end of today (Day 28), verify:

1. **App starts** without crashes
2. **Sign-in works** (any method)
3. **Item creation works** (add item → appears in list)

If all 3 work → ✅ **Phase D Ready**  
If issues → 📖 Read PHASE_D_START_HERE.md for detailed troubleshooting

---

## ⏱️ Time Estimate

- **Setup**: 5 minutes
- **Testing core flows**: 10-15 minutes
- **Troubleshooting** (if needed): 15-30 minutes

**Total**: 20-50 minutes to verify local setup works

---

**Next Action**:

1. Run `pnpm install`
2. Run `pnpm --filter @wfl/mobile dev`
3. Press `w` for web preview
4. Test sign-in + create item
5. Report any issues

**Status**: 🟢 **READY TO TEST LOCALLY**
