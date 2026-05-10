# 12 — App Store Screenshot Capture Guide

This guide provides step-by-step instructions for capturing all required screenshots and promotional assets for both iOS App Store and Google Play Store submissions.

---

## Pre-Capture Setup

### Device/Simulator Preparation

**iOS (Simulator recommended for consistency):**
1. Open Xcode and launch iPhone 15 Pro Max simulator (6.7") for primary screenshots
2. Also test on iPhone 15 (5.5") for secondary size
3. Settings → General → Display & Brightness → Set to Light mode (for consistency)
4. Settings → Accessibility → Display → Reduce transparency: OFF
5. Settings → Accessibility → Zoom: OFF
6. Hide status bar details: `xcrun simctl status_bar iPhone15,3 override --time 9:41 --dataNetwork wifi --wifiMode active --batteryState charged --batteryLevel 100`

**Android (Emulator or device):**
1. Use Pixel 6 Pro emulator (6.7" / 1440x3120) or similar flagship
2. Settings → Display → Brightness: Max
3. Settings → Display → Screen timeout: 10 minutes
4. Disable animations: Settings → Developer options → Animation scale: 0x

### App State Preparation

Before capturing each screen, ensure:
1. User is logged in with test account
2. Household has 3-5 items in containers (seeded test data)
3. One item is expiring soon (red indicator)
4. Household has 2 members including current user
5. Time zone is set to a major US city (for consistent times in screenshots)

---

## iOS Screenshots (6.7" Max + 5.5" Standard)

### Screen 1: Dashboard / Home Screen

**Purpose:** Hero screen showing core value proposition

**Checklist:**
- [ ] Show 2-3 containers with food items
- [ ] At least one item with red "expiring today" badge
- [ ] Household member avatar visible in top-right
- [ ] Tab bar visible with 📦 (Dashboard) highlighted
- [ ] No notification badges or red dots
- [ ] Status bar shows 9:41 (standard time)

**iPhone 6.7" dimensions:** 1284 × 2778 px @ 72 dpi

```bash
# Capture command (after positioning screen):
xcrun simctl io iPhone15ProMax screenshot ~/desktop/ios_01_dashboard_6.7.png
```

**iOS 5.5" version:**
- Capture same flow on iPhone SE (3rd gen)
- Dimensions: 750 × 1334 px @ 72 dpi
- File: `ios_01_dashboard_5.5.png`

---

### Screen 2: Add Item (Photo/AI Classification)

**Purpose:** Show AI-powered capture feature

**Checklist:**
- [ ] Camera is active but not taking over full screen
- [ ] Show the "AI Classification" loading state or result
- [ ] Display item details card with product name, expiry date, category
- [ ] Show confidence score if visible (>90%)
- [ ] Action buttons: "Save", "Edit", visible
- [ ] Include call-to-action text: "Snap anything in your kitchen"

**Dimensions:** Same as Screen 1

```bash
# Navigate to add item, trigger camera, let AI classify:
# 1. Tap + button in dashboard
# 2. Select "Photo" mode
# 3. Wait for classification animation to complete
```

**iOS 5.5" version:** Repeat on iPhone SE

---

### Screen 3: Scanner / QR/Barcode Mode

**Purpose:** Show ease of adding items via scanning

**Checklist:**
- [ ] Camera viewfinder visible
- [ ] QR code scanning reticle (animated outline) in center
- [ ] Mode tabs visible at bottom: QR (highlighted), Barcode, Photo, Date
- [ ] Instruction text: "Point at a QR sticker"
- [ ] Clean black background (no clutter)
- [ ] Status bar at top with close button (X)

**Dimensions:** Same as Screen 1

```bash
# Capture the scan screen in QR mode:
# 1. Navigate to Scan tab (📱)
# 2. Ensure QR mode is selected (first tab)
# 3. Status bar and mode tabs should be visible
```

**iOS 5.5" version:** Repeat on iPhone SE

---

### Screen 4: Container Details + Household Sharing

**Purpose:** Highlight collaboration features

**Checklist:**
- [ ] Container name prominent (e.g., "Fridge")
- [ ] 3-5 items listed with expiry dates
- [ ] Expiry status indicators (green = fresh, yellow = soon, red = expired)
- [ ] Household members section visible (avatars + names)
- [ ] "Invite" button visible
- [ ] Last updated timestamp visible
- [ ] Include one expired item to show warning indicator

**Dimensions:** Same as Screen 1

```bash
# Navigate to a container with multiple items:
# 1. Tap on a container from dashboard
# 2. Scroll to show items + household members
```

**iOS 5.5" version:** Repeat on iPhone SE

---

### Screen 5: Settings / Privacy & Permissions

**Purpose:** Show privacy-first positioning

**Checklist:**
- [ ] Settings menu visible (⚙️ tab highlighted)
- [ ] "Privacy" section visible with toggles
- [ ] "Data Sync" toggle enabled
- [ ] "Analytics" toggle clearly visible (can be off)
- [ ] "Account" section with email visible
- [ ] "Help & Support" section visible
- [ ] Logout button at bottom

**Dimensions:** Same as Screen 1

```bash
# Navigate to settings:
# 1. Tap Settings tab (⚙️)
# 2. Scroll to show all sections
```

**iOS 5.5" version:** Repeat on iPhone SE

---

### Screen 6: Recipes (Wave 2 Placeholder) — OPTIONAL

**Purpose:** Tease upcoming feature

**Checklist:**
- [ ] Recipe tab (🍳) highlighted
- [ ] Show 2-3 recipe cards with images
- [ ] Each card shows: recipe name, ingredients needed (from user's items), difficulty
- [ ] "Coming soon" or "Suggested" badge if applicable
- [ ] Can show placeholder if Wave 2 not ready

**Dimensions:** Same as Screen 1

**iOS 5.5" version:** Repeat on iPhone SE

---

## iPad Screenshots (12.9" — Optional but Recommended)

Landscape orientation for larger screen:

### iPad Screen 1: Dashboard (Landscape)

**Dimensions:** 2048 × 1536 px @ 72 dpi

**Checklist:**
- [ ] Split-pane layout: containers list on left, details on right
- [ ] Sidebar shows all containers + household members
- [ ] Main pane shows expanded container with all items
- [ ] Full keyboard visible at bottom
- [ ] Tap and hold gestures don't interfere with screenshot

```bash
# Rotate simulator to landscape:
xcrun simctl simulate iPhone15Pro rotate left
```

### iPad Screen 2: Scan + Results

**Dimensions:** Same as iPad Screen 1

**Checklist:**
- [ ] Camera on left pane
- [ ] Recent scans / results on right
- [ ] Multi-window support visible if applicable

---

## Android Screenshots (Phone + Tablet)

### Android Phone (5.5" / 1080 × 2400 px @ 72 dpi)

Capture same 5 screens as iOS 5.5" version, with Android-specific adjustments:

**Screen 1: Dashboard**
- [ ] Material Design card layout
- [ ] Floating action button (FAB) in bottom-right
- [ ] Navigation bar at bottom (not hidden)
- [ ] Same item layout as iOS

```bash
# Capture Android phone screenshot:
adb shell screencap -p /sdcard/screenshots/android_01_dashboard.png
adb pull /sdcard/screenshots/android_01_dashboard.png ~/desktop/
```

**Screens 2-5:** Repeat same content as iOS, adapted for Material Design:
- Add Item (AI Classification)
- Scanner (QR/Barcode)
- Container Details
- Settings / Privacy

### Android Tablet (7" / 1200 × 1920 px @ 72 dpi)

**Screen 1: Dashboard (Landscape or Portrait)**
- [ ] Responsive layout for wider screen
- [ ] Side navigation if applicable
- [ ] Split-pane for list + details

**Screens 2-3:** Scanner + Add Item (landscape preferred for better camera view)

---

## Promotional Graphics & Assets

### App Icons

**iOS App Icon:**
- Filename: `whatsfresh-icon-1024.png`
- Dimensions: 1024 × 1024 px
- Format: PNG (no transparency required, but allowed)
- Spec: Simple mark/logo, readable at all sizes
- Colors: Use primary sage green (#2F7D5B) with background
- Avoid: Gradients, shadows, complex details

**Android Icon:**
- Filename: `whatsfresh-icon-512.png`
- Dimensions: 512 × 512 px
- Format: PNG
- Same design as iOS, but may have slight material design shadow/depth
- Android Studio will generate icon variants automatically (192x192, 96x96, etc.)

**Generation Tool:**
```bash
# Using ImageMagick (if icon master is 2000x2000):
convert whatsfresh-icon-2000.png -resize 1024x1024 whatsfresh-icon-1024.png
convert whatsfresh-icon-2000.png -resize 512x512 whatsfresh-icon-512.png
```

---

### iOS App Preview Video (Optional, 30 seconds max)

**Spec:**
- Duration: 15-30 seconds
- Dimensions: 1920 × 1080 (16:9) or 1080 × 1920 (9:16)
- Format: H.264 MP4, 5-10 Mbps bitrate
- Audio: Optional (use uplifting background music if included)

**Recommended flow:**
1. **0-3 sec:** Sign-up/login screen with tagline: "Track everything in your kitchen"
2. **3-8 sec:** Add item via camera (AI classifying food)
3. **8-12 sec:** Container dashboard showing expiring items
4. **12-20 sec:** Household member invite and sharing
5. **20-30 sec:** Settings showing privacy controls + final tagline: "Never waste food again"

**Recording tool:**
```bash
# On simulator, record screen with FFmpeg:
ffmpeg -f avfoundation -i "1:0" -r 30 -vf scale=1920:1080 app-preview.mov

# Or use native Xcode screen recording:
# Xcode → Product → Perform Action → Record Screen
```

---

### Android Feature Graphic

**Spec:**
- Dimensions: 1024 × 500 px (2:1 ratio)
- Format: PNG or JPEG (8-bit)
- Text: Optional but recommended
- Safe zone: Inner 750 × 375 px (avoid critical content near edges)

**Design:**
- Left side: App icon or hero image (food items, containers)
- Right side: Tagline + key features
  - "Stop Wasting Food"
  - "Track. Share. Eat Smart."
- Colors: Use brand palette (sage green #2F7D5B, warm cream #F0E5D8)
- Font: Sans-serif, readable at 200px width

**Example layout:**
```
[App Icon] [Container Image] | "Stop Wasting | Food"
                              | "Track. Share. Eat Smart."
```

---

## Capture Checklist by Platform

### Pre-Capture (All Platforms)

- [ ] Test account created and logged in
- [ ] Test data seeded (3-5 containers, 10+ items, 2+ household members)
- [ ] Notifications disabled (Settings → Notifications)
- [ ] Status bar cleaned (time set to 9:41)
- [ ] Animations disabled for clean captures
- [ ] Device language set to English (US)
- [ ] Device in Light mode (for consistent colors)

### iOS (6.7" Max)

- [ ] Dashboard (1 item with red expiry badge)
- [ ] Add Item / AI Classification (loading + result state)
- [ ] Scanner / QR Mode (reticle visible)
- [ ] Container Details (3-5 items + 2-3 household members)
- [ ] Settings / Privacy (toggles + sections visible)
- [ ] Recipes (optional, but recommended)

All at: **1284 × 2778 px, 72 dpi, PNG or JPG**

### iOS (5.5" Standard)

- [ ] Same 5-6 screens as above
- [ ] All at: **750 × 1334 px, 72 dpi, PNG or JPG**

### iOS (iPad 12.9" — Optional)

- [ ] Dashboard (landscape, split-pane)
- [ ] Scanner + Results (landscape)
- [ ] All at: **2048 × 1536 px, 72 dpi, PNG or JPG**

### Android Phone (5.5")

- [ ] Same 5 screens as iOS 5.5"
- [ ] Adjusted for Material Design (FAB, nav bar)
- [ ] All at: **1080 × 2400 px, 72 dpi, PNG or JPG**

### Android Tablet (7" — Optional)

- [ ] Dashboard (landscape or portrait)
- [ ] Scanner (landscape)
- [ ] All at: **1200 × 1920 px, 72 dpi, PNG or JPG**

### Promotional Assets

- [ ] App Icon (iOS 1024x1024, Android 512x512, PNG)
- [ ] Feature Graphic (Android 1024x500, PNG/JPG)
- [ ] App Preview Video (30-sec MP4, H.264, 1920x1080)

---

## File Organization

Create directory structure:
```
docs/app-store-assets/
├── ios/
│   ├── 6.7-max/
│   │   ├── 01-dashboard.png
│   │   ├── 02-add-item.png
│   │   ├── 03-scanner.png
│   │   ├── 04-container-details.png
│   │   ├── 05-settings.png
│   │   └── 06-recipes.png
│   ├── 5.5-standard/
│   │   └── (same files as above)
│   └── 12.9-ipad/
│       ├── 01-dashboard-landscape.png
│       └── 02-scanner-landscape.png
├── android/
│   ├── phone-5.5/
│   │   ├── 01-dashboard.png
│   │   ├── 02-add-item.png
│   │   ├── 03-scanner.png
│   │   ├── 04-container-details.png
│   │   └── 05-settings.png
│   └── tablet-7/
│       ├── 01-dashboard.png
│       └── 02-scanner.png
├── promotional/
│   ├── whatsfresh-icon-1024.png
│   ├── whatsfresh-icon-512.png
│   ├── whatsfresh-feature-graphic-android.png
│   └── app-preview-video.mp4
└── web/
    └── (screenshots of web dashboard, if applicable)
```

---

## Post-Capture Processing

### Screenshot Optimization

```bash
# Compress PNGs without quality loss (ImageMagick):
pngquant --speed 1 *.png

# Or use pngcrush:
pngcrush -brute *.png

# Verify dimensions:
identify *.png | grep -E "1284x2778|750x1334|2048x1536|1080x2400|1200x1920"
```

### Color Correction

If screenshots have color shift:
1. Open in GIMP or Photoshop
2. Image → Color Balance → Adjust if needed
3. Ensure colors match brand palette:
   - Primary: #2F7D5B (sage green)
   - Secondary: #F0E5D8 (warm cream)
   - Accent: #D4A574 (warm tan)

### Text Overlay (Optional)

Add subtle captions to each screenshot (1-line per image):
- Dashboard: "Stop wasting food. Track everything."
- Add Item: "Snap photos. AI identifies instantly."
- Scanner: "Scan QR stickers or barcodes."
- Container: "Share with household. Real-time sync."
- Settings: "Your data. Your control. No tracking."

---

## Final Verification Checklist

Before uploading to stores:

- [ ] All screenshots are correct dimensions (per store requirements)
- [ ] All screenshots are at 72 dpi
- [ ] All screenshots show real app content (no mockups/placeholders)
- [ ] All screenshots are in PNG or JPG format
- [ ] No debug overlays, debug menus, or code visible
- [ ] No phone borders, bezels, or notches visible (just app)
- [ ] Status bar looks clean (9:41, no notifications)
- [ ] Tab bar / navigation visible and highlighted correctly
- [ ] At least one screen shows expiry notification (red badge)
- [ ] At least one screen shows household members
- [ ] At least one screen shows privacy/settings
- [ ] App icon is high-res and matches brand guidelines
- [ ] Feature graphic (Android) has readable text
- [ ] All files named consistently (lowercase, hyphens)
- [ ] All files uploaded to correct directories in docs/app-store-assets/

---

## Next Steps

1. **Prepare test device/simulator** (follow Pre-Capture Setup above)
2. **Capture each screen** in order (dashboard first for brand consistency)
3. **Organize files** in docs/app-store-assets/ directory structure
4. **Review & edit** screenshots for clarity (remove blurs, crop if needed)
5. **Upload to App Store Connect** (iOS) and **Google Play Console** (Android)
6. **Cross-check metadata** against 11_APP_STORE_LISTINGS.md while uploading

---

## Resources

- [Apple App Store Connect Screenshot Guide](https://help.apple.com/app-store-connect/en.lproj/dev-2c8a77e2-c639-4e8c-a3dd-4d83b8c43fab/)
- [Google Play Console Screenshot Help](https://support.google.com/googleplay/android-developer/answer/1078870)
- [App Preview Requirements (iOS)](https://help.apple.com/app-store-connect/en.lproj/dev-c0098caa-d5a3-4a47-8b45-f631076b1ef7/)
- [Material Design Screenshot Guide](https://material.io/design/communication/imagery.html)
- [ImageMagick Documentation](https://imagemagick.org/)
- [FFmpeg Screen Recording](https://trac.ffmpeg.org/wiki/Capture/Desktop)

