# 05 — UI / UX

This is the design specification. Every screen, every component, every interaction is documented here. Builders should not need to make design decisions; if they do, they propose a change here first.

**Aspiration**: This app should feel like a 2026 Apple Design Award nominee. Reference apps to study: **Flighty**, **Crouton**, **Things 3**, **Bear**, **Halide**, **Copilot (finance)**, **Streaks**, **Gentler Streak**, **Reeder 5**, **Pillar**.

## Design principles

1. **Native first**: feel like a native app, not React Native chrome. SF Pro on iOS, Roboto on Android. Native nav stacks, native sheets, system blur, system haptics.
2. **One signature pattern**: the **left status stripe** on item cards is the brand. Repeated everywhere status matters.
3. **Premium, not loud**: warm off-white, sage primary, restrained color. Food photography does the heavy lifting visually.
4. **Every interaction has soul**: haptics + spring animation + meaningful transition. No linear easing, no flat taps, no hard cuts.
5. **Accessible by default**: VoiceOver, Dynamic Type, high contrast, color-blind safe — not an afterthought.
6. **Empty states are intentional**: hand-drawn illustrations, warm copy, clear CTA. No generic spinners or "No items found".
7. **Real food photos**: never use stock or emoji placeholders for food. AI-generated imagery only as a last resort.

## Design tokens

### Colors (light mode)

| Token | Hex | Use |
|---|---|---|
| `brand/primary` | `#2F7D5B` | Primary CTAs, active tabs, brand accents |
| `brand/primaryMuted` | `#E8F2EC` | Tinted buttons, chips, soft backgrounds |
| `brand/primaryDark` | `#1F5A40` | Pressed state, headings on light |
| `status/fresh` | `#3A8C5F` | "Fresh" tag, green status stripe |
| `status/freshBg` | `#E8F2EC` | "Fresh" chip background |
| `status/soon` | `#C98A2B` | "Use soon" tag, yellow status stripe |
| `status/soonBg` | `#FAF1E1` | |
| `status/urgent` | `#C24A3E` | "Eat today" / red status stripe |
| `status/urgentBg` | `#FAE8E5` | |
| `status/expired` | `#6B6B6B` | "Tossed/expired" |
| `status/expiredBg` | `#F0EFEC` | |
| `surface/base` | `#FBFAF7` | Screen background (warm off-white) |
| `surface/raised` | `#FFFFFF` | Cards |
| `surface/sunken` | `#F2F0EB` | Search bars, input backgrounds |
| `text/primary` | `#0F1411` | Headings, body |
| `text/secondary` | `#5C615E` | Meta, subtitle |
| `text/tertiary` | `#8B908D` | Disabled, captions |
| `text/inverse` | `#FFFFFF` | On primary CTAs |
| `border/subtle` | `#E8E5DE` | Separators, hairlines |
| `border/strong` | `#D2CFC7` | Focus rings |
| `accent/coral` | `#E56C5A` | Used very sparingly; success-with-warmth |

### Colors (dark mode)

| Token | Hex |
|---|---|
| `brand/primary` | `#5FB389` |
| `brand/primaryMuted` | `#1E3329` |
| `brand/primaryDark` | `#3F8D67` |
| `status/fresh` | `#5FB389` |
| `status/freshBg` | `#1E3329` |
| `status/soon` | `#E5B566` |
| `status/soonBg` | `#3A2E18` |
| `status/urgent` | `#F07566` |
| `status/urgentBg` | `#3A1F1B` |
| `status/expired` | `#8E8E93` |
| `status/expiredBg` | `#222423` |
| `surface/base` | `#0E110F` |
| `surface/raised` | `#1A1F1B` |
| `surface/sunken` | `#070908` |
| `text/primary` | `#F4F2EE` |
| `text/secondary` | `#A8ACA9` |
| `text/tertiary` | `#6B706D` |
| `text/inverse` | `#0E110F` |
| `border/subtle` | `#252A26` |
| `border/strong` | `#3A3F3B` |

### Accessibility

- All text colors meet **WCAG AA** on their paired surfaces (≥4.5:1 for body, ≥3:1 for large text and UI)
- Status colors paired with icons (never color-alone) for color-blind safety
- High-contrast mode swaps to a third palette; `AccessibilityInfo.isHighTextContrastEnabled()` triggers it

### Typography

iOS uses **SF Pro Display** (titles) + **SF Pro Text** (body). Android uses **Roboto**. We do not ship custom fonts at MVP — system fonts feel native and avoid licensing.

| Token | Size / Line / Weight | Use |
|---|---|---|
| `display` | 34 / 41 / 700 | Hero stats |
| `title1` | 28 / 34 / 700 | Screen large title |
| `title2` | 22 / 28 / 600 | Section headers |
| `title3` | 20 / 25 / 600 | Card titles |
| `headline` | 17 / 22 / 600 | Tab labels, prominent rows |
| `body` | 17 / 22 / 400 | Default body |
| `callout` | 16 / 21 / 400 | Buttons, list rows |
| `subhead` | 15 / 20 / 400 | Subtitles, meta |
| `footnote` | 13 / 18 / 400 | Helper text |
| `caption` | 12 / 16 / 500 | Tags, labels |

Dynamic Type supported up to 1.5x scaling (cap to prevent layout breakage).

### Spacing — 4pt base, 8pt rhythm

`4, 8, 12, 16, 20, 24, 32, 40, 56, 72`

Defaults:
- Screen padding (horizontal): 20
- Card inner padding: 16
- Stack gap (vertical): 12
- Section gap: 32
- Button height: 48 (lg), 40 (md), 32 (sm)

### Radii

`xs 6, sm 10, md 14, lg 20, xl 28, full 999`

- Cards: 20
- Buttons: 14
- Inputs: 14
- Sheets: 28 (top corners only)
- Avatars: full
- Tags: full

### Elevation

Light mode (subtle):
- `e1`: `0 1px 2px rgba(15,20,17,.04), 0 1px 1px rgba(15,20,17,.06)` — cards
- `e2`: `0 4px 12px rgba(15,20,17,.08)` — sheets, dropdowns
- `e3`: `0 12px 28px rgba(15,20,17,.12)` — modals

Dark mode (no shadows; lighten instead):
- `e1`: surface/raised over surface/base + 1px border/subtle hairline
- `e2`: surface above surface/raised + border
- `e3`: blurred backdrop + larger inset

### Iconography

- **iOS**: SF Symbols via `sf-symbols-react-native` (or Expo SF Symbols)
- **Android**: Lucide via `lucide-react-native`
- Wrapper component `<Icon name="..." size={24} />` resolves per platform from a shared mapping
- Brand glyphs (~20 custom icons): commissioned in Figma, shipped as SVG via `react-native-svg`
- Weight: 1.5pt stroke, 24pt default size

## Component primitives

Build these in `apps/mobile/src/components/ui/` before any feature:

### `Button`
- Variants: `filled`, `tinted`, `plain`, `destructive`
- Sizes: `sm`, `md`, `lg`
- States: default, pressed (scale 0.98 + opacity 0.85), disabled, loading
- Leading icon, trailing icon
- Haptic on press (light impact)

### `Card`
- Variants: `default`, `interactive` (press scale 0.98), `statusStripe` (4pt left stripe)
- Tappable card uses `Pressable` + Reanimated scale

### `Sheet` (bottom sheet)
- Wraps `@gorhom/bottom-sheet v5`
- Snap points: `[25%, 50%, 90%]` per use case
- Blurred backdrop on iOS
- Haptic on open
- Pull-handle visible

### `Input`
- Floating label
- Clear button
- Validation state (error red border + helper text)
- Numeric keyboard variant
- Date picker variant
- Voice input button (uses `expo-speech` recognizer)

### `ListRow`
- Leading icon/image (40pt)
- Title + subtitle
- Trailing: chevron / value / switch / nothing
- Pressable with system feedback

### `StatusBadge`
- Color variants: fresh / soon / urgent / expired / frozen
- Size: sm (chip) / md (large)
- Includes icon (clock, warning, check, snowflake)

### `Tag` / `Chip`
- Removable variant (with X)
- Selected state
- Color from status palette or neutral

### `Avatar`
- Circular
- Image with fallback initials
- Sizes: 28, 36, 44, 64
- Online indicator dot (for household members, optional)

### `EmptyState`
- Illustration (Lottie or SVG)
- Title + body
- Primary + secondary CTA

### `Toast`
- Position: top
- Variants: success, info, error
- Blurred background
- Haptic on appear (notification)
- Auto-dismiss 3s

### `SegmentedControl`
- iOS-native feel
- Animated selection pill

### `IconButton`
- 44pt hit area minimum (use hitSlop)
- Round or square variants
- Haptic on press

## Screen catalog

Every screen below has a wireframe described in detail. Builders match these.

### S1: Onboarding (4-screen swiper)

```
┌────────────────────────────────────┐
│ Skip                            ●○○○│  ← top right skip + page indicator
│                                    │
│      [hero illustration            │
│       ~280pt — animated Lottie     │
│       of fridge / containers]      │
│                                    │
│                                    │
│      Stop wasting food.            │  title1, primary text
│                                    │
│      Track everything in your      │  body, secondary text
│      kitchen so nothing goes bad.  │
│                                    │
│      ┌──────────────────────────┐  │  filled button, lg
│      │      Continue            │  │
│      └──────────────────────────┘  │
└────────────────────────────────────┘
```

Screens:
1. "Stop wasting food" — value prop
2. "Snap, scan, log" — 3-step animation
3. "We remember so you don't have to" — alerts demo
4. "Permission primers" — Camera + Notifications (before system prompt, with Skip)

Pattern: paged horizontal swipe, page indicator, persistent Skip top-right, primary CTA bottom.

**Critical**: do NOT require login to proceed past onboarding. Let users add their first item without an account; prompt account on item #3 or first sync attempt.

### S2: Auth — Email entry

```
┌────────────────────────────────────┐
│ ← Back                              │
│                                    │
│      [icon: sealed envelope]       │
│                                    │
│      Sign in with email            │  title1
│                                    │
│      We'll send you a magic link.  │  body, secondary
│      No passwords to remember.     │
│                                    │
│      ┌──────────────────────────┐  │
│      │ you@example.com          │  │  Input
│      └──────────────────────────┘  │
│                                    │
│      ┌──────────────────────────┐  │
│      │   Send magic link        │  │  filled button
│      └──────────────────────────┘  │
│                                    │
│      ─── or continue with ───      │  divider
│                                    │
│      ┌──────────────────────────┐  │
│      │  ⌥ Continue with Apple   │  │  Apple sign-in (iOS only)
│      └──────────────────────────┘  │
│      ┌──────────────────────────┐  │
│      │  G  Continue with Google │  │
│      └──────────────────────────┘  │
└────────────────────────────────────┘
```

### S3: Dashboard ("Today")

The home screen. The single most important screen.

```
┌────────────────────────────────────┐
│ Kitchen                       👤    │  large title (collapses on scroll)
│ 12 items · 3 expiring soon          │  subhead, secondary
│                                    │
│ [Today] [All] [Fridge] [Freezer]   │  segmented filter chips
│                                    │
│ ┌─ EAT ME FIRST ───────────────┐   │  hero card if items urgent
│ │ ▌ [photo] Leftover pasta     │   │  red stripe
│ │ ▌        Eat today · 2 servings   │
│ │ ▌                             │   │
│ │ ▌ [photo] Greek yogurt        │   │
│ │ ▌        Use in 2 days        │   │  yellow stripe
│ └───────────────────────────────┘   │
│                                    │
│ FRESH (8)                           │  section header, caption
│ ┌────────────────────────────────┐ │
│ │ ▌ [photo] Apples · 5 days     │ │  green stripe
│ │ ▌ [photo] Cheese · 14 days    │ │
│ │ ▌ [photo] ...                  │ │
│ └────────────────────────────────┘ │
│                                    │
│              ⊕                      │  FAB (filled circle, bottom-right)
└────────────────────────────────────┘
```

Card row anatomy:
- 4pt left status stripe (full height)
- 56x56 photo on the left (rounded 10)
- Title (callout, primary)
- Subtitle (footnote, secondary)
- Right swipe action: mark eaten (green)
- Left swipe further: mark tossed (red)
- Tap → S5 detail

FAB (floating action button) at bottom-right opens action sheet:
- Scan QR
- Scan barcode
- Scan packaging (OCR date)
- Take photo (AI classify)
- Add manually

### S4: Camera / Scan

Full-bleed camera with minimal chrome.

```
┌────────────────────────────────────┐
│ [X]                          [⚡][↻] │  blurred capsule top: close, flash, flip
│                                    │
│                                    │
│         ┌─────────────────┐        │  scanning reticle (animated sweep
│         │                 │        │  for barcode mode)
│         │                 │        │
│         │  hold steady    │        │
│         │                 │        │
│         └─────────────────┘        │
│                                    │
│                                    │
│   [QR][Barcode][Photo][Date]       │  segmented control
│                                    │
│              ●                      │  shutter button (72pt)
└────────────────────────────────────┘
```

Modes:
- **QR**: detects QR codes (our paper stickers); haptic on detect; auto-routes to container
- **Barcode**: detects UPC/EAN; haptic on detect; lookup product
- **Photo**: takes photo for AI classification
- **Date**: OCRs printed expiry date on packaging

After capture: success preview slides up from bottom with detected info + "Use this" / "Try again" / "Edit".

### S5: Item detail

```
┌────────────────────────────────────┐
│ ←                          ⋯        │  back, more menu
│                                    │
│       [hero photo, full-width      │
│        ~280pt, parallax stretch]   │
│                                    │
│ Leftover pasta                     │  title1
│ [● red] Eat today                  │  status badge
│                                    │
│ Added 3 days ago · Fridge · Container "Big Blue"  │
│                                    │
│ ┌─Eaten─┐ ┌─Toss─┐ ┌─Edit─┐        │  action bar (tinted buttons)
│ └───────┘ └──────┘ └──────┘        │
│                                    │
│ NOTES                              │
│ Dad's recipe, extra spicy          │
│                                    │
│ HISTORY                            │
│ • You added · 3 days ago           │
│ • Photo classified by AI · 3 days  │
│ • You edited expiry · 2 days       │
│                                    │
│ NUTRITION (if available)           │
│ ~450 cal · 22g protein · 60g carbs │
│                                    │
│ TASKS                              │
│ • What can I make? →               │  link to recipe suggest
│ • Move to freezer →                │
└────────────────────────────────────┘
```

Hero transition: from the list thumbnail → detail photo with shared element transition (300ms spring, damping 18).

### S6: Add item (manual or AI-assisted)

Bottom sheet, full-height variant.

```
┌────────────────────────────────────┐
│           ───                      │  pull handle
│ Cancel              Add              Save│
│                                    │
│ [photo or "Take photo" placeholder]│
│                                    │
│ Food                                │
│ ┌────────────────────────────────┐ │
│ │ Cooked chicken                 │ │  Input with autocomplete
│ └────────────────────────────────┘ │
│                                    │
│ Storage                             │
│ [Fridge][Freezer][Pantry][...]     │  segmented
│                                    │
│ Quantity                            │
│ ┌────────────────────────────────┐ │
│ │ 2 servings                     │ │
│ └────────────────────────────────┘ │
│                                    │
│ Expires                             │
│ ┌────────────────────────────────┐ │
│ │ Apr 30, 2026 (4 days)        ↓ │ │  date picker
│ └────────────────────────────────┘ │
│ ⚠ AI suggested · tap to override   │  expiry source indicator
│                                    │
│ Notes (optional)                    │
│ ┌────────────────────────────────┐ │
│ │                                │ │
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
```

If AI confidence is high: fields auto-filled; user just taps Save.
If AI confidence is low: fields filled with `?` indicators; banner says "We're not sure — tap to confirm".
If no AI used: blank.

### S7: Containers list

Grid view of containers (when user taps "Containers" tab).

```
┌────────────────────────────────────┐
│ Containers                         │
│ 6 active · 2 archived               │
│                                    │
│ ┌──────────┐ ┌──────────┐          │
│ │ [photo]  │ │ [photo]  │          │  2-col grid
│ │ Big Blue │ │ Glass jar│          │
│ │ Pasta    │ │ Yogurt   │          │
│ │ ▌red     │ │ ▌green   │          │
│ └──────────┘ └──────────┘          │
│ ┌──────────┐ ┌──────────┐          │
│ │ ...      │ │ ...      │          │
│ └──────────┘ └──────────┘          │
│                                    │
│ ───── Archived ─────                │
│ [collapsed accordion]               │
└────────────────────────────────────┘
```

### S8: Print stickers

```
┌────────────────────────────────────┐
│ ← Print QR stickers                │
│                                    │
│ Each sticker has a unique code.    │
│ Stick on any container you want    │
│ to track.                          │
│                                    │
│ Sheet preview                      │
│ ┌──────────────────────────────┐   │
│ │ ▣  ▣  ▣  ▣                   │   │  4×6 grid of QR codes
│ │ ▣  ▣  ▣  ▣                   │   │
│ │ ▣  ▣  ▣  ▣                   │   │
│ │ ▣  ▣  ▣  ▣                   │   │
│ │ ▣  ▣  ▣  ▣                   │   │
│ │ ▣  ▣  ▣  ▣                   │   │
│ └──────────────────────────────┘   │
│                                    │
│ Sheet size: [Letter] [A4]          │
│ Stickers per sheet: 24             │
│                                    │
│ [ Print or share PDF ]             │  filled button
└────────────────────────────────────┘
```

Generates a PDF via `expo-print` with QR codes generated by `react-native-qrcode-svg`. Each QR encodes a Universal Link `https://app.whatsforlunch.app/c/<token>`.

### S9: Recipes — "What can I make?"

```
┌────────────────────────────────────┐
│ ← What can I make?                 │
│                                    │
│ Using items expiring soon          │
│ [chicken] [pasta] [yogurt]          │  selected item chips
│                                    │
│ ┌────────────────────────────────┐ │
│ │ [recipe photo]                 │ │  recipe card
│ │ Pasta primavera                │ │
│ │ 25 min · easy · 4 servings     │ │
│ │ Uses: chicken, pasta, ...      │ │
│ └────────────────────────────────┘ │
│ ┌────────────────────────────────┐ │
│ │ ...                            │ │
│ └────────────────────────────────┘ │
│                                    │
│ [ Generate more ]                  │  outlined button
└────────────────────────────────────┘
```

Tap recipe → S10 detail.

### S10: Recipe detail

Standard recipe card layout. Hero image, ingredients list with checkboxes (linked to fridge items where matched), step-by-step instructions, "I cooked this" CTA at bottom which marks linked items as eaten.

### S11: Nearby restaurants

```
┌────────────────────────────────────┐
│ ← Eat out tonight                  │
│                                    │
│ Within 5 miles · Italian, Thai     │  filter summary
│                                    │
│ ┌────────────────────────────────┐ │
│ │ [photo]  Trattoria Bella       │ │  ranked by Claude using
│ │           4.6 ★ · $$ · 0.8 mi  │ │  user's learned prefs
│ │           "matches your style" │ │
│ │           [DoorDash][Uber Eats]│ │
│ └────────────────────────────────┘ │
│ ┌────────────────────────────────┐ │
│ │ ...                            │ │
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
```

### S12: Settings (grouped table — iOS native feel)

Sections (iOS-style grouped table):
- **Profile** — name, photo, email
- **Households** — list of households, manage members
- **Notifications** — enable/disable kinds, quiet hours, sound
- **Preferences** — dietary, cuisine, allergies, units, theme
- **Privacy** — delete photos after AI, share analytics, data export
- **Subscription** — current tier, upgrade, manage
- **Help & support** — FAQ, contact us, report bug
- **About** — version, terms, privacy policy
- **Account** — sign out, delete account (red)

### S13: Stats

```
┌────────────────────────────────────┐
│ Stats                              │
│ This week                          │
│                                    │
│ ┌─────────────┐ ┌─────────────┐    │  bento layout
│ │ 12 items    │ │ $24 saved   │    │
│ │ used in time│ │ vs. tossed  │    │
│ └─────────────┘ └─────────────┘    │
│ ┌──────────────────────────────┐   │
│ │ 8-day streak 🌱              │   │
│ │ [progress bar]               │   │
│ └──────────────────────────────┘   │
│ ┌──────────────────────────────┐   │
│ │ Most wasted: lettuce         │   │
│ │ Most eaten: chicken          │   │
│ └──────────────────────────────┘   │
│                                    │
│ [ This month ] [ All time ]        │
└────────────────────────────────────┘
```

### S14: Empty states

Every list screen has a designed empty state:

**Dashboard empty**:
```
        [hand-drawn fridge illustration ~160pt]

           Your kitchen is empty

   Snap a photo or scan a barcode to start
        tracking what's in your fridge

           [  Add first item  ]
           [  Print stickers   ]
```

Custom illustration (commissioned), warm copy, clear CTAs.

## Animations & interactions

### Standards

- **Default easing**: spring (`damping: 15, stiffness: 150`) via Reanimated 3
- **Default duration**: 250–350ms
- **Linear easing**: only for progress bars
- Every Pressable has scale animation (0.98 on press) + haptic

### Specific animations

| Event | Animation |
|---|---|
| Tab press | Light haptic + scale 0.95 + spring back |
| Card tap | Light haptic + scale 0.98 + navigate after 100ms |
| Scan success | Medium haptic + scale-pop reticle + slide-up preview |
| Mark eaten swipe | Color-reveal (green) progressively + success haptic at threshold + checkmark animation |
| Photo upload start | Skeleton shimmer over photo placeholder |
| Photo upload success | Soft notification haptic + photo fades in |
| AI classification arrives | Soft pulse on confirmed fields + "AI" badge tag fades in |
| Pull-to-refresh | Custom Lottie of tumbling vegetable (not default spinner) |
| Streak achieved | Confetti cannon + success haptic + streak number scale-pop |
| Empty state | Lottie loop (subtle, 5s) |
| Splash → home | Logo fades, scales subtly, shifts to header |

### Hero transitions

- List thumbnail → detail screen: shared element transition (`expo-router` shared element or `react-native-shared-element`)
- Sheet open: slide-up + scale + blur backdrop fade-in (200ms)
- Modal: present from bottom (iOS native presentation)

## Accessibility

### Mandatory

- All `Pressable` have `accessibilityRole`, `accessibilityLabel`, `accessibilityHint`
- Status conveyed by **icon + color + text**, never color alone
- Touch targets ≥44pt iOS / 48dp Android (use `hitSlop` if visual is smaller)
- Dynamic Type supported up to 1.5x (`PixelRatio.getFontScale()`); no layout breakage
- VoiceOver / TalkBack: every screen navigable in logical order
- Focus indicators visible (2pt border/strong)
- Reduce Motion: swap spring animations for fade
- High contrast: third palette swap when `AccessibilityInfo.isHighTextContrastEnabled()`

### Tested with

- VoiceOver weekly during dev
- TalkBack weekly during dev
- `react-native-a11y` lint plugin in CI
- Manual accessibility audit before each major release

## Notifications

### Push notification design

Rich notifications with image attachments and inline actions.

```
┌─────────────────────────────────────────┐
│ WhatsForLunch · 5m ago                  │
│                                         │
│ 3 items expire tomorrow                 │
│ Greek yogurt, salmon, spinach          │
│                                         │
│ [photo of soonest item]                 │
│                                         │
│ [Mark eaten]  [Snooze 1 day]            │  inline actions
└─────────────────────────────────────────┘
```

iOS: **Notification Service Extension** for image attachment.
Android: `BigPictureStyle`.

Inline actions: handled by background task, update local DB + queue cloud sync.

### Notification kinds

- **Expiry alert** — single item or batch
- **Daily digest** — morning summary at user's preferred time
- **Household** — invite, member joined, item added by partner
- **System** — app updates, billing issues

### Quiet hours

User configurable; default 10pm–7am.

## Tamagui configuration

Tokens defined in `apps/mobile/src/theme/tokens.ts` and loaded into `tamagui.config.ts`. All components reference tokens, never hardcoded values.

## Library stack (locked)

| Concern | Library |
|---|---|
| Animation | Reanimated 3 + Moti |
| Gesture | react-native-gesture-handler |
| Lists | @shopify/flash-list |
| Bottom sheet | @gorhom/bottom-sheet v5 |
| Image | expo-image |
| Lottie | lottie-react-native |
| Haptics | expo-haptics |
| Blur | expo-blur |
| Icons (iOS) | sf-symbols-react-native (or Expo SF Symbols) |
| Icons (Android) | lucide-react-native |
| Forms | react-hook-form + Zod |
| Camera | react-native-vision-camera v4 |
| Barcode | vision-camera-code-scanner / MLKit module |
| Navigation | expo-router (native stack, shared transitions) |
| Storage | react-native-mmkv |
| Notifications | expo-notifications + native NSE for rich |
| Component primitives | Tamagui |

## Design files

- Figma file: `https://figma.com/file/...` (TBD)
- Design tokens exported from Figma to `apps/mobile/src/theme/tokens.ts` via Figma Tokens plugin
- Lottie files in `apps/mobile/assets/lottie/`
- Custom illustrations commissioned in Figma, exported as SVG to `apps/mobile/assets/illustrations/`

## Day-one polish checklist

Builders must hit all of these before MVP ships:

- [ ] Splash → home transition is animated (no hard cut)
- [ ] App icon designed at 1024px with proper iOS rounding
- [ ] Every Pressable has haptic + scale animation
- [ ] Dark mode shipped at launch (not v1.1)
- [ ] One signature illustration commissioned (the "empty fridge")
- [ ] All loading states are skeletons, never spinners on first screen
- [ ] First-launch onboarding under 20 seconds to "I added an item"
- [ ] No jank on iPhone SE 2nd gen / Pixel 6a
- [ ] All status colors paired with icons
- [ ] Dynamic Type works without layout breakage
- [ ] VoiceOver navigates every screen in logical order
- [ ] Empty states have illustrations, not generic text

## Cross-references

- Component library setup → [08_DEPLOYMENT.md](08_DEPLOYMENT.md)
- Worker assignments for UI build → [15_WORKER_TRACKS.md](15_WORKER_TRACKS.md)
- Feature acceptance criteria → [07_FEATURES.md](07_FEATURES.md)
