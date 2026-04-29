# App Store Screenshot Capture Guide

**Owner**: W10 (Design & Assets)  
**Consumer**: W9 (App Store submission)  
**Timeline**: Phase D (Days 28-36) — Required before submission

---

## Overview

This guide specifies exact device state, test data, and framing for capturing 8 screenshots (iOS + Android). Screenshots are the #1 conversion driver on app store listings — they must be visually consistent, text-legible, and showcase core features.

---

## Shared Test Data Setup

Before capturing ANY screenshots, pre-populate the app with this test data:

### Household Setup

- Household name: "Demo House"
- Member 1: "Alice" (you — signed in)
- Member 2: "Bob" (added, to show sync in screenshot 7)

### Items (for dashboard screenshot)

| Name              | Location | Status | Expiry  | Icon |
| ----------------- | -------- | ------ | ------- | ---- |
| Greek yogurt      | Fridge   | Urgent | Today   | 🥛   |
| Leftover pasta    | Fridge   | Soon   | 2 days  | 🍝   |
| Frozen chicken    | Freezer  | Fresh  | 30 days | 🍗   |
| Whole wheat bread | Pantry   | Fresh  | 5 days  | 🍞   |
| Orange juice      | Fridge   | Soon   | 1 day   | 🧡   |
| Strawberries      | Fridge   | Urgent | Today   | 🍓   |

---

## Device Requirements

### iOS

- **Primary**: iPhone 16 Pro Max (6.9") — REQUIRED
  - Resolution: 1290 × 2796 @ 3x (capture at native, export at 1290 × 2796)
- **Secondary**: iPhone 14 Plus (6.5") — REQUIRED
  - Resolution: 1179 × 2556 @ 3x (capture at native, export at 1179 × 2556)
- **Tablet (optional for MVP)**: iPad Pro 12.9" (gen 6)
  - Resolution: 2048 × 2732 @ 2x

### Android

- **Primary**: Pixel 8 Pro (6.7") — REQUIRED
  - Resolution: 1440 × 3120 @ 1x (capture at native)
- **Secondary**: Samsung Galaxy S24+ (6.7") — REQUIRED
  - Resolution: 1440 × 3120 @ 1x

---

## Screenshot Specifications

### Screenshot 1: Dashboard — "See what's about to expire"

**Device**: iPhone 16 Pro Max (primary)

**State**:

- Signed in as Alice
- Home tab active
- Filter: All
- Items visible: Greek yogurt (urgent), leftover pasta (soon), bread (fresh), others in sections
- No search query

**Framing**:

- Full screen capture (top: status bar + nav, bottom: tab bar)
- Optional: Add semi-transparent text overlay at bottom:
  - "See what's about to expire"
  - Font: System, 24pt, bold, white with 0.7 opacity
  - Background: gradient fade to black

**Why this screenshot**:

- Immediately shows the core value prop (urgency indicator)
- Color-coded status (green/yellow/red) visible
- Real household data feels authentic

---

### Screenshot 2: Scan Screen — "Tap to scan"

**Device**: iPhone 14 Plus (secondary)

**State**:

- Camera screen open
- Tap the "QR" tab to highlight it (shows mode switcher)
- Mode tabs at bottom clearly visible: QR | Barcode | Photo | Date
- Camera viewfinder shows blurred background or test area

**Framing**:

- Full screen (camera view centered)
- Optional overlay at bottom-center:
  - "Tap to scan QR sticker, barcode, or photo"
  - White text, semi-transparent

**Why this screenshot**:

- Shows the 4 scan modes (key differentiator)
- Camera permission visible (users expect this)
- Tap-to-scan is intuitive for onboarding

---

### Screenshot 3: AI Classification Result — "AI identifies your food"

**Device**: iPhone 16 Pro Max

**State**:

- Item add screen after scanning photo
- AI has filled in: "Greek Yogurt"
- Expiry calculated: "7 days"
- Container defaulted to "Fridge"
- Clear, visible AI tag or badge indicating "AI-identified"

**Framing**:

- Full screen from form top to bottom
- Highlight the AI identification (badge/pill/text)
- Optional overlay:
  - "AI figures out what it is"
  - Position: top-right corner

**Why this screenshot**:

- AI is the magic (differentiates from manual trackers)
- Shows how fast data entry is
- Pre-filled Expiry = time-saving value prop

---

### Screenshot 4: Add Item Manual Entry — "Add in seconds"

**Device**: iPhone 14 Plus

**State**:

- Item add screen
- Showing the multi-field form (partially filled or empty)
- Visible fields: Photo, Name, Location, Expiry, Container
- Keyboard NOT visible (dismiss it)

**Framing**:

- Full screen
- Optional overlay:
  - "Add items manually or by scanning"
  - White text, centered bottom

**Why this screenshot**:

- Shows fallback for non-AI users
- Form clarity (users see all required fields at once)
- Photo + quick form = speed message

---

### Screenshot 5: Item Detail — "Tap to mark eaten/tossed/frozen"

**Device**: iPhone 16 Pro Max

**State**:

- Open an existing item (e.g., Greek yogurt)
- Display: large hero photo, expiry countdown, status stripe
- Action buttons visible: Mark Eaten, Mark Tossed, Mark Frozen, Mark Partial

**Framing**:

- Full screen from photo at top to action buttons at bottom
- Optional overlay on action buttons:
  - "Track what happens to every item"
  - White text, semi-transparent

**Why this screenshot**:

- Shows the action loop (scan → add → track → eat/toss)
- Status color + countdown visible
- Buttons are large/tappable-looking

---

### Screenshot 6: Dark Mode — "Dark theme included"

**Device**: iPhone 14 Plus

**State**:

- Settings → Preferences → Theme → Dark
- Navigate back to Dashboard
- Same items as Screenshot 1 but in dark theme
- Colors should be comfortable (high contrast, not too bright)

**Framing**:

- Full screen dashboard in dark mode
- Optional text overlay:
  - "Dark mode works everywhere"
  - Or let the dark theme speak for itself (no overlay)

**Why this screenshot**:

- Modern app = dark mode support
- Reassures power users
- Proves attention to detail

---

### Screenshot 7: Household Sync — "Invite household members"

**Device**: Split screen or two device screenshots (iOS + iPad Pro or two iPhones)

**Option A (if using two devices)**:

- iPhone: Dashboard showing items
- iPad: Same dashboard, same household, showing sync indicator "In sync" or "Syncing"
- Side-by-side or top-bottom composite

**Option B (if only one device)**:

- Screenshot of Household Members screen showing Alice + Bob
- With text overlay: "Sync in real-time with household members"

**Framing**:

- Full screens or composite
- Text overlay (if single device):
  - "Share with household — everyone stays in sync"
  - Position: bottom center

**Why this screenshot**:

- Household sharing = unique value (most food trackers are solo)
- Real-time sync impresses
- Shows app isn't just for individuals

---

### Screenshot 8: Notifications — "Reminders before it's too late"

**Device**: iPhone 16 Pro Max

**State**:

- Notifications enabled
- Show a sample notification on screen (can mock this):
  - Title: "Greek yogurt expires today"
  - Subtitle: "Tap to view details"
  - Time: Timestamp visible
- Or show Notifications settings screen with toggles enabled

**Framing**:

- Full screen
- Optional overlay:
  - "Get reminded before food goes bad"
  - White text, position: top-center

**Why this screenshot**:

- Notifications are the retention lever (keeps users coming back)
- "Before it's too late" = emotional message
- Screenshot choice: Either notification card (authentic) OR settings (if notification can't be mocked)

---

## Capture Process

### Setup Phase (30 min)

1. Launch app, sign in with test account
2. Navigate to Preferences → Theme → Light (for all but screenshot 6)
3. Pre-populate household + test items (exact names/dates as above)
4. Close any tutorials/onboarding
5. Restart app fresh (go to home screen, reopen) to ensure clean state

### Capture Phase (45 min)

For each screenshot:

1. Navigate to the state specified above
2. Confirm no notifications, banners, or UI clutter in status bar
3. Dismiss keyboard (tap empty area)
4. Capture full screen (device native res):
   - iOS: Volume Up button (lock must be off, or use Xcode)
   - Android: Power + Volume Down (simultaneously, 1s hold)
5. Crop to device frame if needed (remove home indicator for iPhoneX+ designs)
6. Export as PNG at specified dimensions

### Naming Convention

```
screenshot-{number}-{device}-{feature}.png
screenshot-1-iphone-16-pro-max-dashboard.png
screenshot-2-iphone-14-plus-scan.png
screenshot-3-iphone-16-pro-max-ai-classification.png
screenshot-4-iphone-14-plus-add-item.png
screenshot-5-iphone-16-pro-max-item-detail.png
screenshot-6-iphone-14-plus-dark-mode.png
screenshot-7-iphone-16-pro-max-household-sync.png
screenshot-8-iphone-16-pro-max-notifications.png
# Plus Android equivalents:
screenshot-1-pixel-8-pro-dashboard.png
# ... etc
```

---

## Text Overlay Guidelines (Optional)

If adding text overlays for app store submission:

**Font**: System (San Francisco on iOS, Roboto on Android)  
**Size**: 18-24pt (readable from thumbnail)  
**Color**: White with 70% opacity (readable on all backgrounds)  
**Position**: Bottom-center (doesn't cover key UI)  
**Animation**: Static (no animated overlays in screenshots)  
**Alignment**: Center, max 2 lines

Example:

```
See what's about to expire

Color-coded by urgency
```

Or simpler (1 line):

```
See what's about to expire
```

---

## Quality Checklist

- [ ] All 8 screenshots captured
- [ ] Correct device resolutions (native, not scaled)
- [ ] No system notifications visible
- [ ] No test data artifacts (errors, loading spinners)
- [ ] Status bar visible (shows time, signal)
- [ ] App UI fully visible (no clipped buttons)
- [ ] Dark mode accurate (colors match design)
- [ ] Text overlays (if used) readable and positioned
- [ ] File naming consistent
- [ ] iOS and Android versions match (same feature in same screenshot number)
- [ ] All PNG exports at target DPI (72 PPI minimum for web, 326 PPI for retina displays)

---

## Handoff to W9

Once screenshots are ready:

1. **Folder structure**:

   ```
   assets/app-store-screenshots/
   ├── ios/
   │   ├── iphone-16-pro-max/
   │   │   ├── screenshot-1.png
   │   │   ├── screenshot-2.png
   │   │   └── ... (8 total)
   │   └── iphone-14-plus/
   │       ├── screenshot-1.png
   │       └── ... (8 total)
   └── android/
       ├── pixel-8-pro/
       │   └── ... (8 total)
       └── galaxy-s24-plus/
           └── ... (8 total)
   ```

2. **Metadata file** (`assets/app-store-screenshots/metadata.json`):

   ```json
   {
     "screenshots": [
       {
         "number": 1,
         "feature": "Dashboard",
         "tagline": "See what's about to expire",
         "devices": ["iphone-16-pro-max", "pixel-8-pro"]
       }
       // ... 7 more
     ],
     "capturedDate": "2026-05-01",
     "capturedBy": "W10-Design",
     "testDataNotes": "Test items pre-populated per guide"
   }
   ```

3. **Notify W9**: "Screenshots ready for App Store submission" (link folder)

---

## Common Pitfalls & Fixes

| Problem                                   | Fix                                                        |
| ----------------------------------------- | ---------------------------------------------------------- |
| Status bar shows 9:41 / different time    | Use a simulator; time is auto-set to 9:41                  |
| Notification badges visible               | Settings → Notifications → Turn off all test notifications |
| Keyboard visible                          | Tap empty area to dismiss before capturing                 |
| Wrong colors (dark on light, vice versa)  | Verify Settings → Preferences → Theme is set correctly     |
| Text too small on thumbnail               | Increase overlay font to 24pt; preview on a phone          |
| Screenshot cropped                        | Capture full screen with home indicator; don't crop        |
| Items not visible (scrolled out of frame) | Scroll to top before capturing dashboard                   |

---

## Timeline

- **Day 29-30**: Capture all 8 screenshots (iOS devices)
- **Day 31**: Capture Android equivalents (or use emulator)
- **Day 32**: Deliver to W9 in folder with metadata
- **Day 33-36**: W9 uploads to App Store Connect & Play Console

---

## Archive & Reuse

Once submitted, archive this folder. Screenshots are reusable for:

- Marketing website (case studies, press kit)
- Email campaigns (onboarding)
- YouTube thumbnail ideas
- Social media
