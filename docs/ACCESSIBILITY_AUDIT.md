# WhatsForLunch — Accessibility Audit Checklist

**Standard:** WCAG 2.1 AA + Apple MASVS-L1 + Android Accessibility guidelines  
**Scope:** iOS VoiceOver + Android TalkBack  
**Owner:** W10 (Design/Copy/Assets) — screen-level implementation by W6/W7

---

## How to use this document

Before merging any screen PR, the author runs through the relevant screen section below and checks every item. Mark items `[x]` when verified. Flag blockers as comments on the PR with label `a11y`.

Test devices:
- iOS: Settings → Accessibility → VoiceOver → On
- Android: Settings → Accessibility → TalkBack → On
- Simulator shortcut: `xcrun simctl accessibility <device> voiceover enable`

---

## Global rules (apply to every screen)

- [ ] Every interactive element (`Pressable`, `TouchableOpacity`, `Button`) has `accessibilityLabel`
- [ ] Every image has either a meaningful `accessibilityLabel` or `accessible={false}` for decorative images
- [ ] Focus order follows reading order (top-to-bottom, left-to-right)
- [ ] Minimum touch target: 44×44pt (use `minHeight: 44, minWidth: 44` if visual element is smaller)
- [ ] Reduce Motion respected: animations paused/replaced when `useReduceMotion()` is true
- [ ] Screen reader announced on navigation: `accessibilityViewIsModal` on modals/sheets
- [ ] Color is not the only differentiator (status colors accompanied by text/icon)
- [ ] All haptic feedback calls wrapped in `haptics.*` (respects `isReduceMotionEnabled`)

---

## Component library gaps (W10 — fix before Phase C ships)

These are in shared UI components. W10 owns the fix.

### IconButton (`src/components/ui/IconButton.tsx`)
- [ ] Accept `accessibilityLabel` prop and forward to Pressable
- [ ] Default hint: `accessibilityRole="button"`

### Card (`src/components/ui/Card.tsx`)
- [ ] When `onPress` provided, add `accessibilityRole="button"` and require `accessibilityLabel` prop
- [ ] When no `onPress`, `accessible={false}` to avoid screen-reader focus on decorative container

### ListRow (`src/components/ui/ListRow.tsx`)
- [ ] Forward `accessibilityLabel` prop to the Pressable wrapper
- [ ] Thumbnail Image: `accessible={false}` (decorative, row label covers it)

### SegmentedControl (`src/components/ui/SegmentedControl.tsx`)
- [ ] Each segment Pressable: `accessibilityRole="tab"`, `accessibilityState={{ selected: isSelected }}`
- [ ] Container: `accessibilityRole="tablist"`

### Tag (`src/components/ui/Tag.tsx`)
- [ ] Remove-button Pressable: `accessibilityLabel={t('accessibility.removeTag', { label })}`

### Input (`src/components/ui/Input.tsx`)
- [ ] Clear-button Pressable: `accessibilityLabel={t('accessibility.clearInput')}`

### Avatar (`src/components/ui/Avatar.tsx`)
- [ ] If decorative: `accessible={false}` on the Image
- [ ] If represents a person: `accessibilityLabel={name ?? t('accessibility.userAvatar')}`

---

## Screen-by-screen checklist

### Onboarding / Auth screens (W6)

#### Sign In (`app/(auth)/sign-in.tsx`)
- [ ] Email field: `accessibilityLabel={t('auth.email')}`, `keyboardType="email-address"`, `autoComplete="email"`
- [ ] Password field: `accessibilityLabel={t('auth.password')}`, `secureTextEntry`, `autoComplete="password"`
- [ ] "Sign in with Apple" button: `accessibilityLabel={t('auth.signInWithApple')}`
- [ ] "Sign in with Google" button: `accessibilityLabel={t('auth.signInWithGoogle')}`
- [ ] "Forgot password" link: `accessibilityRole="link"`
- [ ] Logo illustration: `accessible={false}` (decorative)
- [ ] Error messages: announced via `accessibilityLiveRegion="polite"`

#### Magic Link Sent (`app/(auth)/magic-link-sent.tsx`)
- [ ] Illustration: `accessible={false}` (decorative)
- [ ] Main message: `accessibilityRole="header"` on the title
- [ ] "Check your email" body text: part of the focus ring reading order

#### Onboarding slides (`app/(onboarding)/*.tsx`)
- [ ] Each slide illustration: `accessibilityLabel` matching slide concept or `accessible={false}`
- [ ] Pagination dots: `accessibilityRole="tablist"`, each dot `accessibilityState={{ selected }}`
- [ ] "Next" / "Get Started" button: clear label, `accessibilityRole="button"`
- [ ] "Allow camera" / "Allow notifications" permissions buttons: label matches permission string from `docs/BRAND.md`
- [ ] Skip button: `accessibilityLabel={t('onboarding.skip')}`

---

### Dashboard / Home (`app/(tabs)/index.tsx`) — W6

- [ ] Screen title announced on navigation: `<Stack.Screen options={{ title: t('home.today') }} />`
- [ ] Item cards: single focus ring reads item name + status + days remaining
  - Use `accessibilityLabel={t('accessibility.itemCard', { name, status, daysLeft })}`
- [ ] Status stripe: `accessible={false}` (color-only, backed by status text)
- [ ] "Expiring Soon" section header: `accessibilityRole="header"`
- [ ] Empty state illustration: `accessible={false}`
- [ ] Empty state CTA button: `accessibilityLabel={t('items.addItem')}`
- [ ] Pull-to-refresh: `refreshControl` with `accessibilityLabel={t('accessibility.pullToRefresh')}`

---

### Item Detail / Edit sheet (`app/items/[id].tsx`, `AddItemSheet`) — W6

- [ ] Sheet: `accessibilityViewIsModal={true}` to trap focus
- [ ] Close button: `accessibilityLabel={t('common.close')}`, `accessibilityRole="button"`
- [ ] Food name input: `accessibilityLabel={t('items.foodName')}`
- [ ] Expiry date picker: `accessibilityLabel={t('items.expiryDate')}`
- [ ] Storage location selector: `accessibilityLabel={t('items.storageLocation')}`
- [ ] Category selector: `accessibilityLabel={t('items.category')}`
- [ ] "Mark Eaten" action: `accessibilityLabel={t('items.markEaten')}`, `accessibilityHint={t('accessibility.markEatenHint')}`
- [ ] "Mark Tossed" action: `accessibilityLabel={t('items.markTossed')}`
- [ ] Photo thumbnail: `accessibilityLabel={t('items.photo')}` or `accessible={false}`
- [ ] Delete confirmation: `accessibilityViewIsModal={true}`, focus moves to dialog

---

### Scan (`app/(tabs)/scan.tsx`) — W6

- [ ] Camera viewfinder: `accessible={false}` (non-informational live view)
- [ ] Mode selector (QR / Barcode / Photo): use SegmentedControl a11y pattern (see component section)
  - `accessibilityLabel` per mode: `t('scan.modeQr')`, `t('scan.modeBarcode')`, `t('scan.modePhoto')`
- [ ] Scan reticle Lottie: `accessible={false}`
- [ ] Flash toggle: `accessibilityLabel={t('accessibility.toggleFlash')}`, `accessibilityState={{ checked: flashOn }}`
- [ ] Success animation: announce `t('scan.success')` via `AccessibilityInfo.announceForAccessibility()`
- [ ] AI processing indicator: announce `t('scan.aiProcessing')` on start, `t('scan.aiDone')` on finish
- [ ] "No item found" error: `accessibilityLiveRegion="assertive"`

---

### Containers (`app/(tabs)/containers.tsx`) — W6

- [ ] Empty state illustration: `accessible={false}`
- [ ] Empty state CTA: `accessibilityLabel={t('containers.addContainer')}`
- [ ] Container card: label = nickname + item count
- [ ] "Claim container" / "Scan QR" button: clear labels

---

### Settings (`app/(tabs)/settings.tsx`) — W7

- [ ] Screen title: `accessibilityRole="header"` on page heading
- [ ] Each settings row (ListRow): label = setting name, hint = current value where applicable
- [ ] Toggle switches: `accessibilityRole="switch"`, `accessibilityState={{ checked }}`
- [ ] Theme picker: `accessibilityRole="radiogroup"` on container, each option `accessibilityRole="radio"` + `accessibilityState={{ checked }}`
- [ ] Language picker: `accessibilityLabel={t('settings.language')}`, `accessibilityValue={{ text: currentLocale }}`
- [ ] "Delete Account" row: `accessibilityLabel={t('settings.deleteAccount')}`, `accessibilityHint={t('accessibility.deleteAccountHint')}`
- [ ] Destructive confirmation sheet: `accessibilityViewIsModal={true}`

#### Profile sub-screen
- [ ] Avatar: `accessibilityLabel={displayName}` or `accessible={false}` if no name
- [ ] "Edit profile" button: clear label
- [ ] Form fields: match label to field name

#### Notifications sub-screen
- [ ] Permission status banner: `accessibilityLiveRegion="polite"`
- [ ] Time picker: `accessibilityLabel={t('notifications.reminderTime')}`, `accessibilityValue={{ text: formattedTime }}`
- [ ] Each notification toggle: `accessibilityRole="switch"` + current state

---

### Stats / Insights (future screen)
- [ ] Charts: provide textual alternative (table or summary paragraph)
- [ ] Bar chart segments: each bar `accessibilityLabel={category + value}`
- [ ] Empty state: illustration `accessible={false}`, CTA button labeled

---

## Automated checks (integrate in CI — W9)

```bash
# Run axe-react-native in test suite
npx jest --testPathPattern="a11y"

# Check for missing accessibilityLabel on Pressables (ESLint rule)
# Add to .eslintrc: "jsx-a11y/interactive-supports-focus" (adapt for RN)
```

Recommended ESLint plugins:
- `eslint-plugin-react-native-a11y` — catches missing labels on common RN components

---

## Localization QA (W10 — Phase C)

Before release, every `accessibilityLabel` string that references `t()` must exist in:
- `en.json` ✅ (added in Phase B)
- `fr.json` 🔲 needs professional translation
- `es.json` 🔲 needs professional translation
- `de.json` 🔲 needs professional translation

Keys to audit specifically (added in en.json `accessibility` namespace):
```
accessibility.itemCard
accessibility.pullToRefresh
accessibility.toggleFlash
accessibility.clearInput
accessibility.removeTag
accessibility.userAvatar
accessibility.deleteAccountHint
accessibility.markEatenHint
accessibility.scanSuccess
accessibility.aiProcessing
```

---

## Sign-off requirement

Each screen needs sign-off from both:
1. **Author** — self-tested with VoiceOver (iOS) or TalkBack (Android)  
2. **W10 design review** — confirmed color/label consistency with brand

File sign-off as a PR comment:
```
A11Y sign-off:
- [ ] VoiceOver tested on iPhone 15 Simulator
- [ ] TalkBack tested on Pixel Emulator (API 33)
- [ ] All checklist items for this screen marked [x]
```
