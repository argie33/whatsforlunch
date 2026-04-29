# WhatsForLunch â€” Accessibility Audit Checklist

**Standard:** WCAG 2.1 AA + Apple MASVS-L1 + Android Accessibility guidelines  
**Scope:** iOS VoiceOver + Android TalkBack  
**Owner:** W10 (Design/Copy/Assets) â€” screen-level implementation by W6/W7

---

## How to use this document

Before merging any screen PR, the author runs through the relevant screen section below and checks every item. Mark items `[x]` when verified. Flag blockers as comments on the PR with label `a11y`.

Test devices:

- iOS: Settings -> Accessibility -> VoiceOver -> On
- Android: Settings -> Accessibility -> TalkBack -> On
- Simulator shortcut: `xcrun simctl accessibility <device> voiceover enable`

---

## Global rules (apply to every screen)

- [x] Every interactive element (`Pressable`, `TouchableOpacity`, `Button`) has `accessibilityLabel`
- [x] Every image has either a meaningful `accessibilityLabel` or `accessible={false}` for decorative images
- [ ] Focus order follows reading order (top-to-bottom, left-to-right) -- requires device testing
- [ ] Minimum touch target: 44x44pt (use `minHeight: 44, minWidth: 44` if visual element is smaller) -- requires device testing
- [x] Reduce Motion respected: animations paused/replaced when `useReduceMotion()` is true -- `LottiePlayer` returns `null` when motion reduced
- [x] Screen reader announced on navigation: `accessibilityViewIsModal` on modals/sheets -- `Sheet.tsx` and `AddItemSheet.tsx` both set on content `YStack`
- [ ] Color is not the only differentiator (status colors accompanied by text/icon) -- Phase C design review
- [x] All haptic feedback calls wrapped in `haptics.*` (respects `isReduceMotionEnabled`)

---

## Component library (W10 -- verified Phase C)

### IconButton (`src/components/ui/IconButton.tsx`)

- [x] Accept `accessibilityLabel` prop and forward to Pressable -- falls back to `icon` name if not provided
- [x] `accessibilityRole="button"` on Pressable; `accessibilityState={{ disabled }}` also forwarded

### Card (`src/components/ui/Card.tsx`)

- [x] When `onPress` provided: `accessibilityRole="button"` + `accessibilityLabel` set
- [x] When no `onPress`: `accessible={false}` to avoid screen-reader focus on decorative container

### ListRow (`src/components/ui/ListRow.tsx`)

- [x] `accessibilityLabel` built automatically as `title + ', ' + subtitle`
- [x] Thumbnail Image: `accessible={false}` (decorative, row label covers it)

### SegmentedControl (`src/components/ui/SegmentedControl.tsx`)

- [x] Each segment Pressable: `accessibilityRole="tab"`, `accessibilityState={{ selected: isSelected }}`
- [x] Container XStack: `accessibilityRole="tablist"`

### Tag (`src/components/ui/Tag.tsx`)

- [x] Remove-button Pressable: `accessibilityLabel={t('accessibility.removeTag', { label })}`, `accessibilityRole="button"`

### Input (`src/components/ui/Input.tsx`)

- [x] TextInput: `accessibilityLabel={label}`, `accessibilityHint={error}`, `accessibilityState={{ disabled }}`
- [x] Clear-button Pressable: `accessibilityLabel={t('accessibility.clearInput')}`, `accessibilityRole="button"`

### Avatar (`src/components/ui/Avatar.tsx`)

- [x] Inner Image: `accessible={false}` (outer YStack carries the label)
- [x] YStack label: `t('accessibility.profilePhoto', { name })` or `t('accessibility.userAvatar')` fallback

---

## Screen-by-screen checklist

### Auth screens

#### Sign In (`app/(auth)/sign-in.tsx`)

- [x] Screen title: `accessibilityRole="header"` on the "Sign in with email" heading
- [x] Logo: `accessible={false}` on YStack + emoji
- [x] Email field: Input `label={t('auth.email')}` sets accessibilityLabel; `keyboardType="email-address"`
- [x] Email error: forwarded as `accessibilityHint` on the TextInput
- [x] Apple Sign-In: `accessibilityRole="button"`, `accessibilityLabel`, `accessibilityState={{ disabled: loading }}`
- [x] Google Sign-In: same pattern
- [x] Magic-link-sent title: `accessibilityRole="header"` on "Check your inbox"
- [x] Resend link: `accessibilityRole="button"`, `accessibilityLabel={t('auth.resendLink')}`

#### Onboarding (`app/(auth)/onboarding.tsx`)

- [x] Slide illustrations: `IllustrationPlaceholder` always renders `accessible={false}`
- [x] Slide title: `accessibilityRole="header"` in `SlideContent`
- [x] Pagination dots: `accessibilityRole="tablist"` on XStack; individual dots `accessible={false}`; container label reads `pageIndicator` key
- [x] CTA button: `Button` component (built-in `accessibilityRole="button"`)
- [x] Allow camera / notifications: `Button` with translated label
- [x] Skip button: `accessibilityRole="button"`, `accessibilityLabel={t('common.skip')}`

---

### Dashboard / Home (`app/(main)/index.tsx`)

- [x] Item cards: composite `accessibilityLabel` via `t('accessibility.itemCard', { name, status, daysLeft })`
- [x] Status stripe: `accessible={false}` (color-only, backed by status text in card label)
- [x] Section headers: `accessibilityRole="header"`
- [x] Empty state illustration: `accessible={false}` via IllustrationPlaceholder
- [x] Empty state CTA: `accessibilityLabel={t('items.addItem')}`
- [x] Pull-to-refresh: `accessibilityLabel={t('accessibility.pullToRefresh')}`
- [x] Search field: `accessibilityRole="search"`
- [x] Storage filter row: `accessibilityRole="radiogroup"` + each chip `accessibilityRole="radio"` + `accessibilityState`
- [x] FAB: `accessibilityLabel={t('accessibility.fabButton')}`
- [x] Swipe actions: `accessibilityLabel` via swipeEaten / swipeToss keys

---

### Item Detail (`app/(main)/items/[id].tsx`)

- [x] Back button: `accessibilityRole="button"`, `accessibilityLabel={t('common.back')}`
- [x] Edit button: `accessibilityRole="button"`, `accessibilityLabel={t('common.edit')}`
- [x] Hero image: `accessibilityLabel={t('accessibility.itemPhoto', { food })}`
- [x] Emoji fallback: `accessible={false}`
- [x] Item name title: `accessibilityRole="header"`
- [x] Mark Eaten: `accessibilityLabel={t('items.markEaten')}`, `accessibilityHint={t('accessibility.markEatenHint')}`
- [x] Mark Tossed: `accessibilityLabel={t('items.markTossed')}`
- [x] Delete button: `accessibilityRole="button"`, `accessibilityLabel={t('items.deleteItem')}`

### Add / Edit Item (`app/(main)/items/edit/[id].tsx`, `AddItemSheet`)

- [x] Sheet content: `accessibilityViewIsModal` on `YStack` -- traps VoiceOver/TalkBack focus
- [x] Close button: `accessibilityLabel={t('accessibility.closeSheet')}`, `accessibilityRole="button"`
- [x] Food name input: `accessibilityLabel={t('items.foodName')}`
- [x] Quantity input: `accessibilityLabel={t('items.quantity')}`
- [x] Notes input: `accessibilityLabel={t('items.notes')}`
- [x] Storage location: `accessibilityRole="radiogroup"` + each option `accessibilityRole="radio"` + `accessibilityState`
- [x] Expiry stepper: `accessibilityRole="button"`, `accessibilityLabel` via decreaseExpiry/increaseExpiry keys
- [x] Expiry presets: `accessibilityRole="radio"` + `accessibilityState` + plural setExpiryDays key
- [x] Back / Save nav buttons: roles + labels + disabled state

---

### New Item (`app/(main)/items/new.tsx`)

- [x] Back button: `accessibilityRole="button"`, `accessibilityLabel={t('common.back')}`

---

### Recipes (`app/(main)/recipes.tsx`)

- [x] Screen title: `accessibilityRole="header"`
- [x] Empty state: `IllustrationPlaceholder` `accessible={false}`, CTA labeled
- [x] Item chips: `accessibilityRole="checkbox"`, `accessibilityLabel={item.foodName}`, `accessibilityState={{ checked }}`
- [x] Recipe cards: `accessibilityRole="button"`, `accessibilityLabel={recipe.title}`, `accessibilityHint={t('accessibility.expandRecipe')}`

---

### Containers list (`app/(main)/containers.tsx`)

- [x] Empty state: `accessible={false}` + labeled CTA buttons
- [x] Container card: `accessibilityLabel={t('accessibility.containerCard', { name, count })}`
- [x] Archive toggle: `accessibilityRole="button"`, `accessibilityState={{ checked: showArchived }}`
- [x] Print FAB: `accessibilityRole="button"`, `accessibilityLabel={t('containers.printStickers')}`
- [x] Scan QR FAB: `accessibilityRole="button"`, `accessibilityLabel={t('containers.scanQR')}`

### Container detail (`app/(main)/containers/[id].tsx`)

- [x] Back button: `accessibilityRole="button"`, `accessibilityLabel={t('common.back')}`
- [x] Container name title: `accessibilityRole="header"`
- [x] QR token text: `accessible={false}`
- [x] Print stickers: `accessibilityRole="button"`, `accessibilityLabel={t('containers.printStickers')}`
- [x] Archive: `accessibilityRole="button"`, `accessibilityLabel={t('containers.archiveContainer')}`
- [x] Add item FAB: `accessibilityRole="button"`, `accessibilityLabel={t('items.addItem')}`

### Stickers (`app/(main)/stickers.tsx`)

- [x] Page size selector: `accessibilityRole="radiogroup"` + each option `accessibilityRole="radio"` + `accessibilityState`
- [x] Print button: `accessibilityRole="button"`, `accessibilityLabel`, `accessibilityState={{ disabled: exporting }}`
- [x] Export PDF button: same pattern
- [x] Preview grid: `accessible={false}` + `importantForAccessibility="no-hide-descendants"`

---

### Scan (`app/(main)/scan.tsx`) -- W10 verified

- [x] Camera viewfinder: `accessible={false}` on both Camera instances (code + capture modes)
- [x] Mode selector: `accessibilityRole="radiogroup"` on XStack container; each tab `accessibilityRole="radio"` with `accessibilityState={{ checked: active }}`
- [x] LottiePlayer animations: `accessible={false}` on reticle + success animations
- [x] Decorative overlay (reticle, hint text): `importantForAccessibility="no-hide-descendants"` prevents focus leak
- [x] Success scan: `AccessibilityInfo.announceForAccessibility(t('accessibility.scanSuccess'))`
- [x] Capture mode: `AccessibilityInfo.announceForAccessibility(t('accessibility.aiProcessing'))` on photo capture
- [x] Capture button: `accessibilityState={{ disabled: scanning }}` while processing
- [ ] Flash toggle: N/A — flash hardcoded to off in current implementation
- [ ] Error state inline: N/A — errors use native `Alert.alert()` which is fully accessible

---

### Settings (`app/(main)/settings/`) -- W10 verified

- [x] Toggle switches: `accessibilityRole="switch"`, `accessibilityLabel={label}`, `accessibilityState={{ checked, disabled }}` in ToggleRow (notifications.tsx)
- [x] Stepper +/− buttons: replaced `Text` onPress with `Pressable` + `accessibilityRole="button"` + `accessibilityLabel` via `stepperDecrement`/`stepperIncrement` i18n keys
- [x] Preferences TagCloud: each tag `accessibilityRole="checkbox"` + `accessibilityState={{ checked: isSelected }}`
- [x] Theme/Units pickers: `SegmentedControl` handles radiogroup/radio pattern
- [x] Delete Account: `accessibilityHint={t('accessibility.deleteAccountHint')}` on destructive button
- [x] Delete Account bullet dots: `accessible={false}` on decorative `•` Text
- [x] Delete Account warning: `accessibilityRole="header"` on warning title
- [x] Destructive confirmation sheet: `accessibilityViewIsModal` — `Sheet` component handles this
- [ ] Screen/section heading roles: SectionTitle components use plain Text — device test needed

---

### Stats / Insights (future screen)

- [ ] Charts: provide textual alternative
- [ ] Bar chart segments: each bar `accessibilityLabel={category + value}`
- [ ] Empty state: `accessible={false}` illustration, labeled CTA

---

## Automated checks (integrate in CI -- W9)

```bash
# Run axe-react-native in test suite
npx jest --testPathPattern="a11y"

# ESLint: check for missing labels on Pressables
# Add to .eslintrc: eslint-plugin-react-native-a11y
```

---

## Localization QA (W10 -- Phase C)

All `accessibility.*` keys verified present in `en.json`:

```
accessibility.itemCard         accessibility.pullToRefresh
accessibility.toggleFlash      accessibility.clearInput
accessibility.removeTag        accessibility.userAvatar
accessibility.deleteAccountHint accessibility.markEatenHint
accessibility.scanSuccess      accessibility.aiProcessing
accessibility.aiDone           accessibility.containerCard
accessibility.itemPhoto        accessibility.swipeEaten
accessibility.swipeToss        accessibility.fabButton
accessibility.closeSheet       accessibility.decreaseExpiry
accessibility.increaseExpiry   accessibility.setExpiryDays
accessibility.expandRecipe
```

- `en.json` -- complete
- `fr.json` -- machine-translated stubs; professional translation required before shipping
- `es.json` -- machine-translated stubs; professional translation required before shipping
- `de.json` -- machine-translated stubs; professional translation required before shipping

---

## Sign-off requirement

Each screen needs sign-off from both:

1. **Author** -- self-tested with VoiceOver (iOS) or TalkBack (Android)
2. **W10 design review** -- confirmed color/label consistency with brand

```
A11Y sign-off:
- [ ] VoiceOver tested on iPhone 15 Simulator
- [ ] TalkBack tested on Pixel Emulator (API 33)
- [ ] All checklist items for this screen marked [x]
```
