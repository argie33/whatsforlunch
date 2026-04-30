# W10 Launch Sign-Off Checklist

**Owner**: W10 (Design, Accessibility, Copy)  
**Due**: Day 35 (May 5, 2026) — 1 day before launch  
**Purpose**: Final verification that all W10 Phase C/D deliverables are complete and ready for App Store/Play Store submission

---

## Phase C Completion (Accessibility, i18n, Animations)

### Accessibility (WCAG 2.1 Level AA)

**Component Library (13 components)**

- [ ] Button: role + label + disabled state
- [ ] Card: conditional role, accessible={false} when static
- [ ] IconButton: role + label + disabled state
- [ ] Input: TextInput label + clear button label
- [ ] ListRow: auto-built label (title, subtitle)
- [ ] SegmentedControl: tablist + tab roles + selected state
- [ ] Tag: remove button role + label
- [ ] Avatar: conditional label + image accessible={false}
- [ ] EmptyState: header role on title + illustration accessible={false}
- [ ] StatusBadge: label conveying status
- [ ] Sheet: accessibilityViewIsModal on content
- [ ] IconButton: all icons properly labeled or hidden
- [ ] Toast/Alert: announced to screen reader

**Verification**: Run test suite

```bash
pnpm --filter @wfl/mobile test -- ui-accessibility.test.tsx
```

- [ ] All tests PASS
- [ ] No console errors or warnings

**Core Screens**

- [ ] Auth screens (sign-in, onboarding, verify): labels + roles
- [ ] Dashboard: item labels with status + days left
- [ ] Scan screen: mode selector (radio group), success announced, camera accessible={false}
- [ ] Item detail: hero photo accessible={false}, expiry announced
- [ ] Add/edit item: all fields labeled, errors announced
- [ ] Settings: toggles have role + state, delete warning clear
- [ ] Empty states: present on all major lists
- [ ] Error states: announced to screen reader

**Device Testing**

- [ ] VoiceOver (iOS): Run manual test protocol, all flows PASS
- [ ] TalkBack (Android): Run manual test protocol, all flows PASS
- [ ] No "roaming" of focus (screen reader loses place)
- [ ] No invisible elements announced
- [ ] All status information conveyed without color alone

**Documented**: docs/ACCESSIBILITY_AUDIT.md

- [ ] All items marked [x] verified
- [ ] No [ ] items remaining for Phase D

### Localization (i18n)

**Language Files** (en, fr, es, de)

- [ ] apps/mobile/src/i18n/en.json: 200+ strings complete
- [ ] apps/mobile/src/i18n/fr.json: French translations added
- [ ] apps/mobile/src/i18n/es.json: Spanish translations added
- [ ] apps/mobile/src/i18n/de.json: German translations added

**String Coverage**

- [ ] All UI text strings in locale files (no hardcoded English)
- [ ] Pluralization rules: `_one`, `_other` forms present where needed
- [ ] i18n keys for: buttons, labels, hints, empty states, errors
- [ ] Accessibility strings: status labels, announcements, hints
- [ ] App store copy strings: descriptions, keywords

**Verification**

```bash
cd apps/mobile
pnpm typecheck  # Should pass; all i18n keys are typed
```

- [ ] No missing translation keys in any language
- [ ] Pluralization works (verify in Preferences → Quiet Hours settings)

### Animations & Haptics

**Animations**

- [ ] LottiePlayer: used for scan reticle, success animation, pull-to-refresh
- [ ] Lottie files exist: scan-reticle.json, scan-success.json, pull-to-refresh.json
- [ ] Reduce Motion respected: animations disabled or instant when enabled
- [ ] Frame rate: smooth 60fps (no jank on test devices)

**Haptics Library** (apps/mobile/src/lib/haptics.ts)

- [ ] All haptic calls go through `haptics.*` utility
- [ ] Methods available: selection, tap, medium, heavy, success, error, warning
- [ ] Reduce Motion setting respected (calls check isReduceMotionEnabled())
- [ ] Used throughout:
  - [ ] Filter/tab changes: `haptics.selection()`
  - [ ] Button press: `haptics.tap()`
  - [ ] Scan success: `haptics.success()`
  - [ ] Error: `haptics.error()`
  - [ ] Confirmation: `haptics.heavy()` or `haptics.warning()`

**Verification**: Check no hardcoded Haptics.\* calls outside haptics.ts

```bash
grep -r "Haptics\." apps/mobile/src --include="*.tsx" --include="*.ts" | grep -v "haptics.ts" | grep -v "lib/haptics"
# Should return 0 results
```

- [ ] No direct Haptics.\* imports in component code
- [ ] All haptics routed through haptics utility

### Empty States

**All Major Lists Have Empty States**

- [ ] Dashboard (no items): "No items yet" + add button
- [ ] Containers (no containers): "No containers" + create button
- [ ] Recipes (no recipes): "No recipes available" + link
- [ ] Search results (no matches): "No results" + clear search

**Empty State Component** (apps/mobile/src/components/ui/EmptyState.tsx)

- [ ] Illustration: accessible={false}, centered
- [ ] Title: accessibilityRole="header"
- [ ] Description: clear, helpful
- [ ] Primary action (if provided): labeled button
- [ ] Used consistently across all screens

---

## Phase D Completion (Testing, QA, Launch Prep)

### Accessibility Testing

**Manual Test Protocol Completed** (docs/ACCESSIBILITY_MANUAL_TEST_PROTOCOL.md)

- [ ] Flow 1 (Auth & Onboarding): PASS
- [ ] Flow 2 (Dashboard): PASS
- [ ] Flow 3 (Scan): PASS
- [ ] Flow 4 (Add/Edit Item): PASS
- [ ] Flow 5 (Settings): PASS
- [ ] Flow 6 (Dark Mode): PASS
- [ ] Flow 7 (Reduce Motion): PASS
- [ ] All edge cases (empty, error, loading, offline): PASS

**Issues Found**: 0  
**Issues Fixed**: [count]  
**Re-tested**: All fixed items PASS

**Tester Sign-Off**

- [ ] Name: **\*\*\*\***\_**\*\*\*\***
- [ ] Date: **\*\*\*\***\_**\*\*\*\***
- [ ] Status: [ ] READY [ ] NEEDS FIXES

### Visual Design Verification

**Design Token Verification** (docs/VISUAL_QA_CHECKLIST.md)

**Colors** (Light & Dark)

- [ ] All brand colors applied (#2F7D5B / #5FB389 for green)
- [ ] Status colors used correctly (fresh, soon, urgent, expired)
- [ ] Status colors paired with icon + text (never color alone)
- [ ] Surface colors (base, raised, sunken) applied consistently
- [ ] Text colors (primary, secondary, tertiary) appropriate contrast
- [ ] Borders visible but not overwhelming

**Typography**

- [ ] Display (34pt, bold): screen titles
- [ ] Title 1 (28pt, bold): section titles
- [ ] Title 2 (22pt, bold): card titles
- [ ] Body (16pt): paragraphs
- [ ] Caption (13pt): labels, hints
- [ ] Small (11pt): tags, badges
- [ ] All text readable in both light and dark modes

**Spacing**

- [ ] All spacing multiples of 8px ($1=8, $2=16, $3=24, $4=32, $5=40, $6=48)
- [ ] Cards: $4 padding (32px)
- [ ] Sections: $5 gap (40px)
- [ ] No random 10px, 14px, 18px values

**Radius**

- [ ] $xs (4px): small tags
- [ ] $sm (8px): buttons, inputs
- [ ] $md (12px): cards
- [ ] $lg (16px): bottom sheets
- [ ] $xl (20px): large buttons

**Components**

- [ ] Buttons: filled, tinted, destructive states correct
- [ ] Cards: interactive vs. static appropriately styled
- [ ] Inputs: focused state has clear focus ring
- [ ] Toggles: on/off states clearly distinguished
- [ ] Status badges: icon + text pairing verified

**Dark Mode**

- [ ] All text readable in dark mode (contrast >= 4.5:1)
- [ ] Status colors adjusted for dark (bright yellow for "Soon", etc.)
- [ ] No jarring contrast switches
- [ ] Components behave identically in dark (no extra noise)

**Animations & Motion**

- [ ] Reduce Motion ON: animations disabled or instant
- [ ] Reduce Motion OFF: smooth 60fps transitions
- [ ] Pull-to-refresh: spinner visible, completes in <500ms
- [ ] Navigation: smooth transitions 200-300ms

**Touch Targets**

- [ ] All buttons: >= 44pt (iOS) / 48dp (Android)
- [ ] All interactive elements: >= 44pt minimum
- [ ] List rows: >= 48pt height

**Designer Sign-Off**

- [ ] Name: **\*\*\*\***\_**\*\*\*\***
- [ ] Date: **\*\*\*\***\_**\*\*\*\***
- [ ] Light Mode: [ ] PASS [ ] NEEDS FIXES
- [ ] Dark Mode: [ ] PASS [ ] NEEDS FIXES
- [ ] Animations: [ ] PASS [ ] NEEDS FIXES
- [ ] Overall: [ ] READY FOR SUBMISSION [ ] NEEDS FIXES

### Screenshot Assets

**App Store Screenshots Ready** (docs/SCREENSHOT_CAPTURE_GUIDE.md)

**iOS Screenshots** (4 required)

- [ ] Screenshot 1: Dashboard (iPhone 16 Pro Max, 1290×2796)
- [ ] Screenshot 2: Scan screen (iPhone 14 Plus, 1179×2556)
- [ ] Screenshot 3: AI Classification (iPhone 16 Pro Max, 1290×2796)
- [ ] Screenshot 4: Add Item (iPhone 14 Plus, 1179×2556)
- [ ] Screenshot 5: Item Detail (iPhone 16 Pro Max, 1290×2796)
- [ ] Screenshot 6: Dark Mode (iPhone 14 Plus, 1179×2556)
- [ ] Screenshot 7: Household Sync (iPhone, 1290×2796 or composite)
- [ ] Screenshot 8: Notifications (iPhone 16 Pro Max, 1290×2796)

**Android Screenshots** (4 required, same 8 concepts)

- [ ] Screenshot 1: Dashboard (Pixel 8 Pro, 1440×3120)
- [ ] Screenshot 2-8: Same flow as iOS

**Quality Verification**

- [ ] All PNG exports at native resolution
- [ ] No system notifications visible
- [ ] No test data artifacts
- [ ] Status bar visible
- [ ] Text overlays (if used) readable
- [ ] File naming consistent

**Screenshot Folder**

```
assets/app-store-screenshots/
├── ios/
│   ├── iphone-16-pro-max/ (8 screenshots)
│   └── iphone-14-plus/ (8 screenshots)
└── android/
    └── pixel-8-pro/ (8 screenshots)
```

- [ ] Folder structure correct
- [ ] All 24 screenshots present
- [ ] Metadata.json file completed
- [ ] Handed off to W9 for submission

### Copy & App Store Metadata

**App Store Copy** (docs/APP_STORE_COPY.md, docs/app-store/listing-ios.md)

- [ ] App name: "WhatsForLunch — Food Tracker"
- [ ] Subtitle: "Stop wasting food."
- [ ] Description: Compelling, SEO-friendly, <4000 chars
- [ ] Keywords: food,fridge,leftovers,expiry,tracker,QR,kitchen,waste,recipes,scan,pantry
- [ ] Age rating: 4+
- [ ] Support/Marketing URLs valid
- [ ] Demo account credentials prepared (for App Review)

**Play Store Copy** (docs/app-store/listing-android.md)

- [ ] Same description, localized if needed
- [ ] Keywords match iOS version
- [ ] Privacy policy URL: https://app.whatsforlunch.app/privacy
- [ ] Support email: support@whatsforlunch.app

**Marketing Website** (apps/web/src/pages/)

- [ ] Home page (index.astro): HowItWorks section added
- [ ] Privacy policy (privacy.astro): Complete and current
- [ ] Terms of Service (terms.astro): Complete and current
- [ ] Press kit (press.astro): Assets and facts ready (Wave 2 prep)
- [ ] All pages accessible and mobile-responsive

**Marketing Copy Verification**

- [ ] Tagline consistent: "Stop wasting food"
- [ ] Value props clear: Scan, AI, Notifications, Sharing
- [ ] No outdated dates or placeholder text
- [ ] All links functional (no 404s)

### Documentation Complete

**Phase D Guides Created**

- [ ] docs/SCREENSHOT_CAPTURE_GUIDE.md: Detailed 8-screenshot specification
- [ ] docs/ACCESSIBILITY_MANUAL_TEST_PROTOCOL.md: 7 test flows with sign-off
- [ ] docs/VISUAL_QA_CHECKLIST.md: Design token + component verification
- [ ] docs/ACCESSIBILITY_AUDIT.md: Final audit with all items marked [x]
- [ ] docs/AccessibilityGuide.ts: Updated with stepper + decorativeOverlay patterns

**Accessibility Tests**

- [ ] apps/mobile/src/**tests**/ui-accessibility.test.tsx: 13 component tests
- [ ] All tests PASS locally
- [ ] Tests integrated into CI pipeline

### Issues & Blockers

**Known Issues** (if any)

- [ ] Issue 1: **\*\*\*\***\_\_**\*\*\*\*** | Status: [ ] OPEN [ ] FIXED [ ] N/A
- [ ] Issue 2: **\*\*\*\***\_\_**\*\*\*\*** | Status: [ ] OPEN [ ] FIXED [ ] N/A
- [ ] Issue 3: **\*\*\*\***\_\_**\*\*\*\*** | Status: [ ] OPEN [ ] FIXED [ ] N/A

**Blockers for Launch**

- [ ] None: [ ] CLEAR TO LAUNCH
- [ ] Blockers exist: List above

---

## Final Approval

### W10 Lead Sign-Off

**All Phase C Deliverables Complete**

- [ ] Accessibility: WCAG 2.1 Level AA verified
- [ ] i18n: 200+ strings in en/fr/es/de
- [ ] Animations: Reduce Motion respected
- [ ] Empty states: All major lists covered

**All Phase D Deliverables Complete**

- [ ] Accessibility manual testing: All flows PASS
- [ ] Visual design QA: All tokens verified, dark mode tested
- [ ] Screenshots: 24 assets captured and ready
- [ ] Copy & metadata: All App Store information prepared
- [ ] Documentation: All testing guides completed

**W10 Lead**

- [ ] Name: **\*\*\*\***\_**\*\*\*\***
- [ ] Signature: **\*\*\*\***\_**\*\*\*\***
- [ ] Date: **\*\*\*\***\_**\*\*\*\***
- [ ] Status: [ ] APPROVED FOR LAUNCH [ ] NEEDS FIXES

### W9 Handoff Checklist

**Assets Ready for W9 to Submit**

**Folder Contents**:

```
launch-ready/
├── screenshots/
│   └── app-store-screenshots/
│       ├── ios/ (16 screenshots: 8 per device)
│       └── android/ (8 screenshots)
├── metadata/
│   ├── app-store-copy.md
│   ├── app-store/listing-ios.md
│   ├── app-store/listing-android.md
│   └── metadata.json (screenshots)
├── branding/
│   ├── press-kit/
│   └── marketing-website-urls.txt
└── testing/
    ├── accessibility-audit.md
    ├── visual-qa-results.txt
    └── manual-testing-summary.txt
```

**W9 Verification**

- [ ] All files received from W10
- [ ] Metadata complete (no placeholders)
- [ ] Screenshots verified (correct resolutions, legible text)
- [ ] App Store Connect entries ready (W9 uploads screenshots + copy)
- [ ] Play Console entries ready (W9 uploads screenshots + copy)

---

## Launch Timeline

- **Day 33 (May 3)**: W10 final QA complete, all tests PASS
- **Day 34 (May 4)**: W10 delivers all assets to W9
- **Day 35 (May 5)**: W9 submits to App Store (review starts)
- **Day 36 (May 6)**: W9 submits to Play Store (review starts)
- **Day 42+ (May 12+)**: App Store review approval, launch

---

## Notes

**Assumptions**:

- All code compiles with 0 TypeScript errors
- All 239 tests PASS (TypeScript + mobile + CDK)
- No critical a11y blockers after manual testing
- All screenshots captured at native device resolution

**Success Criteria**:

- ✅ All Phase C deliverables marked complete
- ✅ All Phase D testing passed
- ✅ W10 sign-off obtained
- ✅ All assets handed off to W9

---

## Archive & Reference

Once signed off, file this checklist in:

```
docs/sign-offs/W10_LAUNCH_SIGN_OFF_[DATE].md
```

Example: `W10_LAUNCH_SIGN_OFF_2026-05-05.md`

This serves as proof of Phase C/D completion and launch readiness.
