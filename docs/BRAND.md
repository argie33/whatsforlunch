# WhatsForLunch — Brand Identity

**Status**: Confirmed ✅  
**Owner**: W10  
**Last updated**: 2026-04-26

This is the single source of truth for all brand decisions. All workers reference this. Any proposed change opens an issue tagged `brand`.

---

## Name & Identity

| | |
|---|---|
| **App name** | WhatsForLunch |
| **Display name** (home screen) | WhatsForLunch |
| **App Store name** | WhatsForLunch — Food Tracker |
| **Tagline** | Stop wasting food. |
| **Short tagline** | Know what's in your kitchen. |
| **Brand voice** | Warm, direct, a little playful. Never preachy about food waste. Never sterile or clinical. Sounds like a helpful friend, not a productivity app. |

### Tone examples

| Context | What we say | What we don't say |
|---|---|---|
| Empty state | "Your kitchen is empty. Add your first item!" | "No items found." |
| Item expiring | "Eat today · leftover pasta" | "Item expiration threshold exceeded" |
| After scan success | "Got it! Leftover pasta added." | "Item successfully created." |
| Delete account | "This will permanently delete your account and all your data." | "This action is irreversible and will purge all user records." |

---

## Color Palette

Full spec in [05_UI_UX.md](05_UI_UX.md). Key brand colors:

| Token | Light | Dark | Usage |
|---|---|---|---|
| `brand/primary` | `#2F7D5B` | `#5FB389` | CTAs, active states, brand accents |
| `brand/primaryMuted` | `#E8F2EC` | `#1E3329` | Tinted buttons, soft backgrounds |
| `brand/primaryDark` | `#1F5A40` | `#3F8D67` | Pressed state, headings |
| `surface/base` | `#FBFAF7` | `#0E110F` | Screen background (warm off-white) |
| `accent/coral` | `#E56C5A` | — | Very sparingly; warm success |

**Primary color personality**: sage green — fresh, natural, food-forward without being "eco-brand cliché."

---

## Typography

System fonts only at MVP — feels native, no licensing friction.

- **iOS**: SF Pro Display (titles) + SF Pro Text (body)
- **Android**: Roboto

Full type scale in [05_UI_UX.md](05_UI_UX.md). Key sizes:

| Scale | Use |
|---|---|
| `display` 34/41/700 | Hero stats (e.g. "12 items") |
| `title1` 28/34/700 | Screen large titles |
| `body` 17/22/400 | Default copy |
| `caption` 12/16/500 | Tags, status labels |

---

## Illustration Style

**Style**: warm, hand-drawn aesthetic. Rounded strokes (2pt), organic shapes, earthy colors pulled from the brand palette.

**Mood references**: Crouton, Bear, Headspace. NOT: flat Material icons, stock food photography, overly-cute kawaii.

**Core illustrations** (commissioned Phase B):
- `empty-fridge` — the signature. Open fridge, warm light, nearly empty. Used on dashboard empty state.
- 4× onboarding heroes
- Per-screen empty states

See `apps/mobile/assets/illustrations/README.md` for full spec.

---

## Animation & Motion

**Philosophy**: every meaningful interaction has a response. Spring physics, never linear.

- **Default spring**: `damping 15, stiffness 150`
- **Press scale**: `0.98`
- **Sheet open**: `200ms`, slide-up + scale + blur
- **Success haptic**: medium impact on confirm/complete actions

See [05_UI_UX.md](05_UI_UX.md) §Animations for the full interaction spec.

---

## Iconography

- **iOS**: SF Symbols (system-native, resizes with Dynamic Type)
- **Android**: Lucide (matching weight/style)
- **Custom brand glyphs**: ~20, commissioned Phase B, shipped as SVG via `react-native-svg`
- **Stroke weight**: 1.5pt, default size 24pt

---

## App Store Copy (Locked)

### App Store (iOS)
- **Name**: WhatsForLunch — Food Tracker
- **Subtitle**: Stop wasting food.
- **Keywords**: food, leftovers, fridge, expiration, tracker, QR, kitchen, waste, recipes, scan

### Play Store (Android)
- **Short description** (80 char): Track leftovers, scan QR codes, and never throw away food again.

### Long description (draft — W9 finalizes before submission)
> WhatsForLunch helps you track everything in your kitchen so nothing goes bad.
> 
> Scan a QR sticker on any container and see exactly what's inside and when it expires. Take a photo and AI identifies the food for you. Scan a barcode and we look up the product automatically.
> 
> Get a gentle nudge before things expire — not a guilt trip, just a helpful reminder that your Greek yogurt is on borrowed time.
> 
> **Features:**
> - QR sticker scanning — know what's in every container instantly
> - AI photo identification — just snap, we figure out the rest
> - Barcode lookup — scan packaging for instant product info
> - Expiry date OCR — point at the "best by" text and we read it
> - Smart alerts — "3 items expire tomorrow. Use them tonight."
> - Recipe suggestions — "What can I make with what I have?"
> - Household sharing — shared kitchen, no surprises
> - Fully offline — works without internet, syncs when connected

---

## Permission Strings (Info.plist / AndroidManifest)

These are locked. Do not change without coordinating W10 + W3.

```
NSCameraUsageDescription
"WhatsForLunch uses the camera to scan QR codes, barcodes, and identify food in photos."

NSPhotoLibraryUsageDescription
"Allow access to attach photos of food items you've already photographed."

NSLocationWhenInUseUsageDescription
"Allow location to suggest nearby restaurants when you don't want leftovers. Optional."

NSContactsUsageDescription
"Optional — invite household members from your contacts."
```

---

## Cross-references

- Full color tokens → [05_UI_UX.md](05_UI_UX.md)
- Illustration assets → `apps/mobile/assets/illustrations/README.md`
- Lottie animations → `apps/mobile/assets/lottie/README.md`
- App icon → `apps/mobile/assets/icon/README.md`
- App Store compliance → [10_APP_STORES.md](10_APP_STORES.md)
- Copy strings (code) → `apps/mobile/src/i18n/en.json`
