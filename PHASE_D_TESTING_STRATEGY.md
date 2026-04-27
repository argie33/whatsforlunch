# Phase D — Testing & Validation Strategy

**Target**: Days 29-39 (April 28 - May 6, 2026)  
**Goal**: Beta-ready mobile app with full end-to-end testing before App Store / Play Store submission

---

## Testing Pyramid

```
                          Acceptance Tests (E2E)
                      ↑ (Maestro flows, manual QA)
                    /\
                   /  \
                  /    \
                 /  40% \  (Critical user journeys)
                /        \
               /          \
         Integration Tests
       ↑ (Service layer, API mocks)
     /\
    /  \
   /    \  35% (Feature interactions, persistence)
  /      \
 / ________\
    Unit Tests
    ↓ (Components, utils, hooks)
    25% (Fast, isolated, deterministic)
```

---

## Test Categories

### 1. Unit Tests (Day 29-30)
Focus: Components, utilities, business logic

```typescript
// Example: ItemUtils.getItemStatus()
describe('getItemStatus', () => {
  it('returns "frozen" for frozen items', () => {
    const item = { status: 'frozen', expiryAt: Date.now() + 86400000 };
    expect(getItemStatus(item)).toBe('frozen');
  });

  it('returns "expired" for past expiry date', () => {
    const item = { status: 'active', expiryAt: Date.now() - 1000 };
    expect(getItemStatus(item)).toBe('expired');
  });

  it('returns "urgent" for items expiring within 24h', () => {
    const item = { status: 'active', expiryAt: Date.now() + 12 * 3600000 };
    expect(getItemStatus(item)).toBe('urgent');
  });

  it('returns "soon" for items expiring within 3d', () => {
    const item = { status: 'active', expiryAt: Date.now() + 2 * 86400000 };
    expect(getItemStatus(item)).toBe('soon');
  });

  it('returns "fresh" for items expiring > 3d', () => {
    const item = { status: 'active', expiryAt: Date.now() + 5 * 86400000 };
    expect(getItemStatus(item)).toBe('fresh');
  });
});
```

**Test Checklist**:
- [ ] All status badge logic (fresh, soon, urgent, expired, frozen)
- [ ] Expiry countdown formatting (X days left, X hours left, expired)
- [ ] Item grouping by section (expired, urgent, soon, fresh, frozen)
- [ ] Search filter logic (case-insensitive partial match)
- [ ] Storage filter logic (all, fridge, freezer, pantry)
- [ ] Form validation (Zod schemas for all inputs)
- [ ] Conflict resolution (last-write-wins comparison)
- [ ] Auth service (mock sign-in flows)
- [ ] Sync queue operations (enqueue, dequeue, retry)

**Jest Configuration**: See `jest.config.js`  
**Coverage Target**: >80% on critical paths

---

### 2. Component Tests (Day 30-31)
Focus: Rendering, accessibility, interactions

```typescript
// Example: StatusBadge.test.tsx
describe('StatusBadge', () => {
  it('renders with correct color for "expired" status', () => {
    const { getByTestId } = render(<StatusBadge status="expired" />);
    expect(getByTestId('status-badge')).toHaveStyle({ color: '#C24A3E' });
  });

  it('announces status via accessibility label', () => {
    const { getByLabelText } = render(
      <StatusBadge status="fresh" />
    );
    expect(getByLabelText(/fresh/i)).toBeTruthy();
  });

  it('renders small size variant correctly', () => {
    const { getByTestId } = render(
      <StatusBadge status="soon" size="sm" />
    );
    expect(getByTestId('status-badge')).toHaveStyle({ fontSize: '13px' });
  });
});
```

**Storybook Visual Regression**:
```bash
# Take baseline screenshots
pnpm --filter @wfl/mobile storybook --ci

# Compare against baseline (Chromatic)
pnpm run chromatic --project-token=<token>
```

**Accessibility Testing**:
- [ ] All interactive elements have `accessibilityLabel`
- [ ] All interactive elements have `accessibilityRole` (button, tab, switch, etc.)
- [ ] All interactive elements have `accessibilityState` when needed
- [ ] Images have descriptive `accessibilityLabel` or `accessible={false}`
- [ ] VoiceOver navigation order is logical
- [ ] TalkBack navigation works on Android
- [ ] Touch targets are ≥44pt (iOS) / 48dp (Android)
- [ ] Color + icon used (never color alone)
- [ ] Dynamic Type support (1.5x scaling)
- [ ] Reduce-motion respected in all animations

**Run Storybook**:
```bash
pnpm --filter @wfl/mobile storybook
# Or: Start dev server, then storybook plugin detects components
```

---

### 3. Integration Tests (Day 31-32)
Focus: Service layer, data persistence, API interactions

```typescript
// Example: ItemsService integration test
describe('ItemsService', () => {
  let db: Database;
  let service: ItemsService;

  beforeAll(async () => {
    db = await setupTestDatabase(); // In-memory SQLite
    service = new ItemsService(db);
  });

  it('creates item and persists to WatermelonDB', async () => {
    const item = await service.createItem({
      householdId: 'test-hh',
      foodName: 'Apple',
      storageLocation: 'fridge',
      expiryAt: Date.now() + 86400000,
    });

    const fetched = await service.getById(item.id);
    expect(fetched.foodName).toBe('Apple');
  });

  it('marks item eaten and queues for sync', async () => {
    const item = await service.createItem({ /* ... */ });
    await service.markItemEaten(item.id);

    const updated = await service.getById(item.id);
    expect(updated.status).toBe('eaten');
    
    const queued = await syncQueue.get(item.id);
    expect(queued.operation).toBe('update');
  });

  it('resolves conflicts using last-write-wins', async () => {
    const item = await service.createItem({ /* ... */ });
    
    // Local update
    await item.update((i) => {
      i._version = 2;
      i._lastChangedAt = 100;
      i.foodName = 'Local Apple';
    });

    // Remote update (older)
    const conflict = await service.mergeRemoteChange({
      id: item.id,
      _version: 1,
      _lastChangedAt: 50,
      foodName: 'Remote Apple',
    });

    expect(conflict.resolution).toBe('local_wins');
    expect(item.foodName).toBe('Local Apple'); // Local keeps its value
  });

  afterAll(async () => {
    await db.close();
  });
});
```

**Service Layer Tests**:
- [ ] ItemsService: CRUD, mark eaten/tossed/frozen, snooze, partial
- [ ] ContainersService: CRUD, QR resolution, claim container
- [ ] ProfileService: Get/update profile, change password, upload photo
- [ ] HouseholdsService: Get/update households, invite members, leave
- [ ] SyncService: Pull deltas, push queue, conflict detection
- [ ] AuthService: Sign-in (magic link, Apple, Google), sign-out, token refresh

**Data Persistence Tests**:
- [ ] Items persist across app restart
- [ ] Sync queue persists across offline periods
- [ ] User settings persist (theme, language, preferences)
- [ ] Profile data persists
- [ ] Household memberships persist
- [ ] Conflict resolution correctly updates local state

**API Mocking**:
```typescript
// Use MSW (Mock Service Worker) or jest-fetch-mock
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.post('/graphql', (req, res, ctx) => {
    // Mock AppSync endpoint
    return res(ctx.json({
      data: { getDeltaItems: { items: [...] } }
    }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

### 4. End-to-End Tests (Day 32-34)
Focus: Full user journeys, real app behavior

#### Flow 1: Auth Signup → Dashboard
```gherkin
Feature: Authentication
  Scenario: New user signs up with magic link
    Given I open the WhatsForLunch app
    And I see the sign-in screen
    When I enter "newuser@example.com"
    And I tap "Send Magic Link"
    Then I should see "Check your email" confirmation
    
    When I tap the magic link from email
    Then I should be logged in
    And I should see the dashboard
    And the dashboard should be empty
```

**Maestro Flow**:
```yaml
appId: app.whatsforlunch
flows:
  - signInFlow:
      - tapOn:
          text: "Send Magic Link"
      - input:
          text: "newuser@example.com"
      - tapOn:
          text: "Send Magic Link"
      - assertVisible:
          text: "Check your email"
      # Simulate magic link tap (in dev mode)
      - runFlow: confirmMagicLink
      - assertVisible:
          text: "Kitchen" # Dashboard title
```

#### Flow 2: Add Item → Mark Eaten → Verify Sync
```gherkin
Feature: Item Management
  Scenario: User adds item, marks eaten, and syncs
    Given I'm signed in
    And I see the dashboard
    When I tap the FAB (+ button)
    And I fill in:
      | Field           | Value              |
      | Food Name       | Apple              |
      | Storage         | Fridge             |
      | Expires In      | 7 days             |
    And I tap "Add Item"
    Then the item appears on the dashboard
    
    When I swipe right on the item
    Then I see "Mark Eaten" action
    When I tap "Mark Eaten"
    Then the item disappears from the list
    And sync status shows "syncing"
    When sync completes
    And I pull to refresh
    Then the item is still gone (sync persisted)
```

#### Flow 3: Scan QR Code → Claim Container
```gherkin
Feature: QR Scanning
  Scenario: User scans container QR code
    Given I'm signed in
    When I tap the Scan tab
    And I select "QR Code" mode
    And I point camera at QR code
    Then the QR is detected (visual feedback)
    When I tap to claim
    And I enter container name "Kitchen"
    Then the container is created
    And I see the container detail screen
    And the container is empty
```

#### Flow 4: Offline → Online Sync
```gherkin
Feature: Offline Sync
  Scenario: User adds item offline, sync queues and syncs on reconnect
    Given I'm signed in
    When I disable network (airplane mode)
    And I add an item "Milk"
    Then the item appears locally
    And sync status shows "offline"
    
    When I enable network
    Then sync status changes to "syncing"
    When sync completes
    Then sync status shows "synced"
    And server has the new item
```

#### Flow 5: Settings → Theme Toggle
```gherkin
Feature: Settings
  Scenario: User switches theme
    Given I'm signed in and in light mode
    When I tap Settings tab
    And I tap "Preferences"
    And I tap "Theme" 
    And I select "Dark"
    And I go back to dashboard
    Then the app is in dark mode
    And theme preference is saved
```

**Maestro Test Suite**:
```bash
# Run all flows
maestro test .maestro/flows --app-id app.whatsforlunch

# Run specific flow
maestro test .maestro/flows/signInFlow.yaml --app-id app.whatsforlunch

# Record new flow
maestro record --app-id app.whatsforlunch
```

**Manual QA Checklist**:
- [ ] Auth: Magic link, Apple Sign-In (iOS), Google Sign-In
- [ ] Dashboard: Load, filter, search, swipe actions, empty state
- [ ] Add item: Form validation, expiry defaults, photo upload (if available)
- [ ] Item detail: All metadata, actions (eaten/tossed/frozen/snooze)
- [ ] Scan: QR detection, barcode detection, photo upload, date OCR
- [ ] Settings: Profile edit, household management, theme, language, notifications
- [ ] Sync: Pull-to-refresh, offline queue, auto-sync on reconnect
- [ ] Error states: Network failure, validation errors, conflicts

---

### 5. Performance Tests (Day 34-35)
Focus: Load times, memory, battery, smooth scrolling

```typescript
// Example: Cold start measurement
describe('Performance', () => {
  it('starts app cold in < 3 seconds', async () => {
    const start = performance.now();
    
    // Simulate app launch
    reloadApp();
    waitFor(() => screen.getByText('Kitchen')); // Dashboard loaded
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(3000);
  });

  it('scrolls item list at ≥60fps', async () => {
    const fps = measureScrollPerformance(dashboardList);
    expect(fps).toBeGreaterThanOrEqual(60);
  });

  it('screen transitions in < 300ms', async () => {
    const start = performance.now();
    tapOn(text: 'Add Item');
    waitFor(() => screen.getByText('Food name'));
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(300);
  });
});
```

**Budgets**:
- Cold start: <3000ms
- Screen transition: <300ms
- Component render: <100ms
- List scroll: ≥60fps
- Image load: <500ms
- Memory usage: <150MB average
- Battery impact: <5% per hour in use

**Tools**:
- Sentry: Real user metrics (RUM) + session replay
- React Profiler: Component render times
- Android Profiler: Memory, CPU, battery
- Xcode Instruments: iOS performance
- Lighthouse CI: Web performance (if web build available)

---

### 6. Accessibility Tests (Day 35-36)
Focus: WCAG 2.1 Level AA compliance

**VoiceOver Testing (iOS)**:
```
✅ All interactive elements announced
✅ VoiceOver navigation order logical (left-to-right, top-to-bottom)
✅ Labels are descriptive ("Mark Item Eaten" not "Button")
✅ Dynamic Type scaling: text readable at 1.5x size
✅ Color + icon: status shown by both (never color alone)
✅ Reduce motion: animations disabled when setting enabled
✅ Touch targets: ≥44pt (minmum iOS standard)
```

**TalkBack Testing (Android)**:
```
✅ All interactive elements announced
✅ Navigation order correct
✅ Labels clear and descriptive
✅ Large text supported
✅ High contrast mode supported
✅ Vibration feedback works
✅ Touch targets: ≥48dp
```

**Tools**:
- Accessibility Inspector (Xcode)
- TalkBack (Android)
- axe DevTools Web (if web version)
- Manual testing with VoiceOver/TalkBack

---

## Test Schedule

### Day 29: Dependency Resolution
- [ ] pnpm install completes
- [ ] pnpm typecheck → 0 errors
- [ ] pnpm lint → 0 errors

### Days 30-31: Unit + Component Tests
- [ ] Run `pnpm test` → all pass
- [ ] Component a11y tests in Storybook
- [ ] Visual regression baseline established

### Days 31-32: Integration Tests
- [ ] Service layer tests pass
- [ ] Data persistence verified
- [ ] Sync queue tested
- [ ] AppSync mock API working

### Days 32-34: E2E + Manual QA
- [ ] Maestro flows pass on physical devices
- [ ] Manual QA checklist completed
- [ ] Edge cases tested (offline, conflicts, errors)
- [ ] Accessibility testing complete

### Days 34-35: Performance Tests
- [ ] Cold start <3s measured
- [ ] List scroll ≥60fps verified
- [ ] Memory usage <150MB
- [ ] No memory leaks detected

### Day 36: Bug Fixes + Retesting
- [ ] Critical bugs fixed
- [ ] Regression testing
- [ ] Final sign-off

---

## Bug Severity Levels

### Critical (Fix Immediately)
- App crash on launch or core flow
- Permanent data loss
- Unable to sign in
- Sync doesn't work
- Security vulnerability

### High (Fix Before Beta)
- Feature doesn't work as intended
- Performance < budget
- Accessibility violation (WCAG 2.1 Level A)
- Data corruption on specific flow

### Medium (Fix in Next Release)
- Minor UI issue
- Non-critical feature broken
- Performance slightly over budget
- Minor a11y issue (Level AAA)

### Low (Consider Later)
- Cosmetic issue
- Rare edge case
- Nice-to-have feature

---

## Sign-Off Criteria

✅ **Code Quality**
- TypeScript strict: 0 errors
- ESLint: 0 errors
- Jest coverage: >80% on critical paths
- No security vulnerabilities

✅ **Functionality**
- All user flows work end-to-end
- Auth: 3 methods (magic link, Apple, Google)
- Dashboard: Items, filters, search, actions
- Scan: All 4 modes working
- Settings: All 8 sections functional
- Sync: Local-first with offline queue

✅ **Performance**
- Cold start: <3s
- Transitions: <300ms
- Scroll: ≥60fps
- Memory: <150MB
- No memory leaks

✅ **Accessibility**
- WCAG 2.1 Level AA on all screens
- VoiceOver/TalkBack work
- Dynamic Type scaling works
- Reduce-motion respected
- Touch targets ≥44pt/48dp

✅ **Testing**
- Unit tests: >80% coverage
- Component tests: All components tested
- E2E tests: All critical flows pass
- Manual QA: Checklist 100% complete
- Performance: All budgets met

---

## Next Phase: Deployment (Days 36-39)

Once sign-off criteria met:

1. **Build Signed APKs/IPAs**
   ```bash
   eas build --platform ios --auto-submit
   eas build --platform android --auto-submit
   ```

2. **Upload to TestFlight / Play Store Internal Testing**
   ```bash
   # Automatic via eas-cli with auto-submit
   # Or manual via Xcode / Android Studio
   ```

3. **Beta Tester Distribution**
   - TestFlight: Email invites
   - Google Play: Internal testing track
   - External testers: Limited to 10k for Google Play

4. **Feedback Loop**
   - Collect crash reports (Sentry)
   - Monitor user feedback
   - Fix critical issues
   - Iterate if needed

5. **App Store / Play Store Submit**
   - Final compliance review
   - Screenshots + descriptions
   - Release notes
   - Submit for review
   - Monitor approval progress

---

**Phase D Ready** 🚀  
All systems built and tested. Ready for beta users and App Store submission!
