# i18n Verification Guide

**Owner**: W10 (Localization)  
**Executor**: QA team / Testers (Days 30-35)  
**Goal**: Verify all 200+ strings are translated correctly across en, fr, es, de without missing keys or placeholder text

---

## Overview

WhatsForLunch supports 4 languages at MVP launch:

- **English (en)**: Complete, 200+ strings
- **French (fr)**: Full translation
- **Spanish (es)**: Full translation
- **German (de)**: Full translation

All strings are in: `apps/mobile/src/i18n/[lang].json`

---

## Quick Verification (15 min)

### 1. Check All Keys Are Present in All Languages

```bash
cd apps/mobile

# Extract keys from English (source of truth)
jq 'keys' src/i18n/en.json | sort > /tmp/en-keys.txt

# Check each language has the same keys
jq 'keys' src/i18n/fr.json | sort > /tmp/fr-keys.txt
jq 'keys' src/i18n/es.json | sort > /tmp/es-keys.txt
jq 'keys' src/i18n/de.json | sort > /tmp/de-keys.txt

# Compare (should all be identical)
diff /tmp/en-keys.txt /tmp/fr-keys.txt
diff /tmp/en-keys.txt /tmp/es-keys.txt
diff /tmp/en-keys.txt /tmp/de-keys.txt
# Result: No output = all keys match ✅
```

### 2. TypeScript Verification

```bash
cd apps/mobile
pnpm typecheck
# Result: Should PASS (all i18n keys are type-checked)
```

### 3. Runtime String Count

```bash
# Count strings in each language (should be similar)
cd apps/mobile
jq 'keys | length' src/i18n/en.json  # Should be ~210+
jq 'keys | length' src/i18n/fr.json  # Should match
jq 'keys | length' src/i18n/es.json  # Should match
jq 'keys | length' src/i18n/de.json  # Should match
```

---

## Detailed Verification (45 min)

### Accessibility Strings

All screen reader announcements must be present in all languages:

| Key                               | English                               | French | Spanish | German | Verified |
| --------------------------------- | ------------------------------------- | ------ | ------- | ------ | -------- |
| `accessibility.statusStripe`      | "{{status}} status indicator"         | ✅     | ✅      | ✅     | [ ]      |
| `accessibility.itemPhoto`         | "Photo of {{food}}"                   | ✅     | ✅      | ✅     | [ ]      |
| `accessibility.swipeEaten`        | "Swipe right to mark as eaten"        | ✅     | ✅      | ✅     | [ ]      |
| `accessibility.scanSuccess`       | "Item scanned successfully"           | ✅     | ✅      | ✅     | [ ]      |
| `accessibility.aiProcessing`      | "AI is identifying your food"         | ✅     | ✅      | ✅     | [ ]      |
| `accessibility.stepperDecrement`  | "Decrease {{field}}"                  | ✅     | ✅      | ✅     | [ ]      |
| `accessibility.stepperIncrement`  | "Increase {{field}}"                  | ✅     | ✅      | ✅     | [ ]      |
| `accessibility.deleteAccountHint` | "Permanently deletes your account..." | ✅     | ✅      | ✅     | [ ]      |

**Verification Steps**:

1. Open app in each language
2. Settings → Preferences → Language → [FR/ES/DE]
3. Navigate to each screen
4. Enable VoiceOver / TalkBack
5. Swipe through announcements
6. Verify accessibility strings are announced (not hardcoded English)

### UI Strings by Section

#### Authentication

| Screen       | English Key              | String                         | French | Spanish | German | Verified |
| ------------ | ------------------------ | ------------------------------ | ------ | ------- | ------ | -------- |
| Sign In      | `auth.emailPlaceholder`  | "email@example.com"            | ✅     | ✅      | ✅     | [ ]      |
| Sign In      | `auth.signInButton`      | "Sign in"                      | ✅     | ✅      | ✅     | [ ]      |
| Sign In      | `auth.appleButton`       | "Sign in with Apple"           | ✅     | ✅      | ✅     | [ ]      |
| Sign In      | `auth.googleButton`      | "Sign in with Google"          | ✅     | ✅      | ✅     | [ ]      |
| Onboarding   | `onboarding.slide1Title` | "Know what's in your kitchen"  | ✅     | ✅      | ✅     | [ ]      |
| Verify Email | `auth.linkSentMessage`   | "Magic link sent to {{email}}" | ✅     | ✅      | ✅     | [ ]      |

**Verification**:

1. Sign in with test account
2. Onboarding flow: Verify all 4 slide titles + descriptions translated
3. Magic link screen: Verify email interpolation works (e.g., "Magic link sent to test@example.com")

#### Dashboard

| Key                           | English                              | FR  | ES  | DE  | Verified |
| ----------------------------- | ------------------------------------ | --- | --- | --- | -------- |
| `dashboard.screenTitle`       | "Dashboard"                          | ✅  | ✅  | ✅  | [ ]      |
| `dashboard.filterAll`         | "All"                                | ✅  | ✅  | ✅  | [ ]      |
| `dashboard.filterFridge`      | "Fridge"                             | ✅  | ✅  | ✅  | [ ]      |
| `dashboard.filterFreezer`     | "Freezer"                            | ✅  | ✅  | ✅  | [ ]      |
| `dashboard.filterPantry`      | "Pantry"                             | ✅  | ✅  | ✅  | [ ]      |
| `empty.dashboard.title`       | "No items yet"                       | ✅  | ✅  | ✅  | [ ]      |
| `empty.dashboard.description` | "Add your first item to get started" | ✅  | ✅  | ✅  | [ ]      |

**Verification**:

1. Dashboard → Filter by Fridge/Freezer/Pantry
2. Verify filter labels in each language
3. Add no items, view empty state
4. Verify empty state title + description translated

#### Scan

| Key                    | English                      | FR  | ES  | DE  | Verified |
| ---------------------- | ---------------------------- | --- | --- | --- | -------- |
| `scan.modeQr`          | "QR"                         | ✅  | ✅  | ✅  | [ ]      |
| `scan.modeBarcode`     | "Barcode"                    | ✅  | ✅  | ✅  | [ ]      |
| `scan.modePhoto`       | "Photo"                      | ✅  | ✅  | ✅  | [ ]      |
| `scan.modeDate`        | "Date"                       | ✅  | ✅  | ✅  | [ ]      |
| `scan.qrPrompt`        | "Point at QR code"           | ✅  | ✅  | ✅  | [ ]      |
| `scan.permissionTitle` | "Camera permission required" | ✅  | ✅  | ✅  | [ ]      |
| `scan.detected`        | "Detected!"                  | ✅  | ✅  | ✅  | [ ]      |

**Verification**:

1. Scan screen: Mode tabs (QR, Barcode, Photo, Date) translated
2. Tap each mode: Prompt text changes language
3. Success message "Detected!" appears in correct language

#### Items

| Key                   | English          | FR  | ES  | DE  | Verified |
| --------------------- | ---------------- | --- | --- | --- | -------- |
| `items.statusFresh`   | "Fresh"          | ✅  | ✅  | ✅  | [ ]      |
| `items.statusSoon`    | "Use soon"       | ✅  | ✅  | ✅  | [ ]      |
| `items.statusUrgent`  | "Eat today"      | ✅  | ✅  | ✅  | [ ]      |
| `items.statusExpired` | "Expired"        | ✅  | ✅  | ✅  | [ ]      |
| `items.markEaten`     | "Mark as eaten"  | ✅  | ✅  | ✅  | [ ]      |
| `items.markTossed`    | "Mark as tossed" | ✅  | ✅  | ✅  | [ ]      |
| `items.markFrozen`    | "Mark as frozen" | ✅  | ✅  | ✅  | [ ]      |

**Verification**:

1. Dashboard: Item status text (Fresh, Use soon, Eat today, Expired)
2. Item detail: Action buttons (Mark as eaten, Mark as tossed, etc.) translated

#### Settings

| Key                               | English                        | FR  | ES  | DE  | Verified |
| --------------------------------- | ------------------------------ | --- | --- | --- | -------- |
| `settings.preferences.themeAuto`  | "Auto"                         | ✅  | ✅  | ✅  | [ ]      |
| `settings.preferences.themeLight` | "Light"                        | ✅  | ✅  | ✅  | [ ]      |
| `settings.preferences.themeDark`  | "Dark"                         | ✅  | ✅  | ✅  | [ ]      |
| `settings.notifications.enabled`  | "Notifications enabled"        | ✅  | ✅  | ✅  | [ ]      |
| `settings.deleteAccountWarning`   | "This action cannot be undone" | ✅  | ✅  | ✅  | [ ]      |

**Verification**:

1. Settings → Preferences: Theme options translated
2. Settings → Notifications: Toggle labels translated
3. Settings → Delete Account: Warning text translated

#### Pluralization

Verify plural forms work correctly:

| Key                   | English (one)                 | English (other)                | French | Spanish | German | Verified |
| --------------------- | ----------------------------- | ------------------------------ | ------ | ------- | ------ | -------- |
| `setExpiryDays_one`   | "Set expiry to {{count}} day" | N/A                            | ✅     | ✅      | ✅     | [ ]      |
| `setExpiryDays_other` | N/A                           | "Set expiry to {{count}} days" | ✅     | ✅      | ✅     | [ ]      |

**Verification**:

1. Item detail → Expiry: Adjust expiry to 1 day
2. Button says: "Set expiry to 1 day" (singular)
3. Adjust to 2+ days: "Set expiry to 7 days" (plural)
4. Switch language, verify correct form used

---

## String Quality Checks

### No Placeholder Text

Check for incomplete/placeholder strings:

```bash
cd apps/mobile
# Search for common placeholder patterns
grep -r "TODO\|FIXME\|XXX\|Lorem\|placeholder" src/i18n/*.json
# Result: No matches ✅
```

### No Hardcoded English in Components

Check that no English strings are hardcoded (all should be in i18n):

```bash
cd apps/mobile
# Search for common English words hardcoded in components
grep -r "Dashboard\|Sign in\|No items" src --include="*.tsx" | grep -v "i18next\|t(" | grep -v "docs" | grep -v "__tests__"
# Result: Should be minimal (only in comments, test names, etc.)
```

### Language-Specific Checks

#### French

- [ ] Accents present: é, è, ê, à, ç, œ, ù, û
- [ ] No English words left untranslated (unless brand names)
- [ ] Capitalization correct (French capitalization rules differ from English)

Example: "Paramètres" not "paramètres" at start of sentence

#### Spanish

- [ ] Accents present: á, é, í, ó, ú, ü
- [ ] Inverted punctuation (¿, ¡) used where appropriate
- [ ] Gender-aware translations used

#### German

- [ ] Capitalization correct (all nouns capitalized)
- [ ] Compound words properly formed
- [ ] Umlauts present: ä, ö, ü

---

## Variable Interpolation

Verify all `{{variable}}` placeholders work:

### Test Cases

| Screen      | Variable Key     | Test Data          | Expected                              | Verified |
| ----------- | ---------------- | ------------------ | ------------------------------------- | -------- |
| Item Card   | `{{foodName}}`   | "Greek yogurt"     | "Greek yogurt"                        | [ ]      |
| Item Status | `{{daysLeft}}`   | 3                  | "3 days left"                         | [ ]      |
| Expiry Hint | `{{count}}`      | 1                  | "1 day" (singular)                    | [ ]      |
| Expiry Hint | `{{count}}`      | 7                  | "7 days" (plural)                     | [ ]      |
| Household   | `{{memberName}}` | "Alice"            | "Alice"                               | [ ]      |
| Magic Link  | `{{email}}`      | "test@example.com" | "Magic link sent to test@example.com" | [ ]      |

**Verification**:

1. For each language (en, fr, es, de):
   - Create item with name "Test"
   - Verify name appears as "Test" (not {{foodName}})
   - Verify days left shows number (not {{daysLeft}})
   - Verify expiry singular/plural correct
2. Settings → Household → Verify member names shown correctly

---

## Translation Quality Spot-Check (Manual Review)

Read through key screens and assess translation quality (not just completeness):

### Dashboard (FR)

- [ ] Status colors: Fresh = "Frais", Soon = "À utiliser bientôt", Urgent = "Manger aujourd'hui"
- [ ] Filters: "Tous", "Réfrigérateur", "Congélateur", "Garde-manger"
- [ ] Natural phrasing (not word-for-word literal translation)

### Scan Screen (ES)

- [ ] Modes: "Código QR", "Código de barras", "Foto", "Fecha"
- [ ] Prompts: "Apunta al código QR", "Apunta al código de barras", etc.
- [ ] Appropriate Spanish (Spain vs. Latin America — should use neutral Spanish)

### Settings (DE)

- [ ] "Einstellungen", "Benachrichtigungen aktiviert", "Design"
- [ ] Proper German compound words (e.g., "Benachrichtigungen" not "Benachrichtigungen")
- [ ] Umlauts used correctly (ö, ä, ü)

---

## Language Switcher Functionality

Verify language switching works without crashes:

1. Launch app in English
2. Settings → Preferences → Language
3. Tap each language (French, Spanish, German, Back to English)
4. App should:
   - [ ] Switch language instantly
   - [ ] All UI text updates
   - [ ] No crashes or console errors
   - [ ] Navigation works in new language
   - [ ] Previous state preserved (same screen, same items)

---

## Checklist for Final Sign-Off

### String Coverage

- [ ] English: 200+ strings complete
- [ ] French: All keys present, no placeholder text
- [ ] Spanish: All keys present, no placeholder text
- [ ] German: All keys present, no placeholder text
- [ ] Key count matches across all languages

### Quality

- [ ] No hardcoded English in components (all routed through i18n)
- [ ] All variables (`{{...}}`) interpolate correctly
- [ ] Pluralization works (1 day vs. 7 days)
- [ ] Accessibility strings announced correctly (VoiceOver/TalkBack)
- [ ] No Lorem ipsum or placeholder text

### Functionality

- [ ] Language switcher works (no crashes)
- [ ] Switching languages updates all UI
- [ ] Navigation functional in all languages
- [ ] Settings persist across language changes

### Device Testing

- [ ] iPhone (min: iPhone SE, max: iPhone 16 Pro Max): Long strings fit
- [ ] Android (min: small phone, max: large phone): Long strings fit
- [ ] Tablet (iPad, Android tablet): Layout works in all languages

---

## Common Issues & Fixes

| Issue                          | Cause                            | Fix                                              |
| ------------------------------ | -------------------------------- | ------------------------------------------------ |
| English text appears in FR app | String not in i18n file          | Add missing key to all 4 language files          |
| "{{variable}}" appears in UI   | Variable name wrong in i18n      | Check component passes correct variable to `t()` |
| Plural form wrong (1 days)     | Only `_other` key exists         | Add `_one` key for singular                      |
| Text truncated on small phone  | Translation too long             | Shorten translation or test layout on device     |
| Wrong language after restart   | Language setting not saved       | Check LocalStorage/MMKV persistence              |
| Crash when switching language  | Missing i18n key in new language | Run key count check; add missing key             |

---

## Sign-Off

**i18n Verification Lead**

- [ ] Name: **\*\*\*\***\_**\*\*\*\***
- [ ] Date: **\*\*\*\***\_**\*\*\*\***
- [ ] String Count Match: [ ] YES [ ] NO
- [ ] Quality Check: [ ] PASS [ ] ISSUES FOUND
- [ ] Device Testing: [ ] PASS [ ] FAIL
- [ ] Overall Status: [ ] READY FOR LAUNCH [ ] NEEDS FIXES

**Issues Found** (if any):

1. ***
2. ***
3. ***

**Fix Due**: **\*\*\*\***\_**\*\*\*\***

---

## Reference

### Language Files

- `apps/mobile/src/i18n/en.json` (source of truth, 210+ keys)
- `apps/mobile/src/i18n/fr.json`
- `apps/mobile/src/i18n/es.json`
- `apps/mobile/src/i18n/de.json`

### i18n Setup

- Framework: `react-i18next`
- Detection: Auto-detects device language (fallback: English)
- Switcher: Settings → Preferences → Language
- Persistence: Stored in MMKV (encrypted local storage)

### Testing Command

```bash
cd apps/mobile
pnpm test -- --testNamePattern="i18n|translation|language"
```
