# W7 Phase B — Mobile Settings & Account Management

**Status**: Kickoff  
**Blockers**: None — W5 Phase C complete ✅  
**Target**: Days 22-28  
**Owner**: W7 (Mobile Settings)

---

## Phase B Scope

Build comprehensive settings interface using W5 components:

### Settings Sections

#### 1. Profile Section
- [x] Placeholder in settings layout (W5 delivered)
- [ ] Display name input + save
- [ ] Email display (read-only from Cognito)
- [ ] Profile photo picker
- [ ] Change password (via Cognito)
- [ ] Time zone selector
- [ ] Unit preference (imperial/metric)

#### 2. Households Section
- [ ] Current household display
- [ ] Member list with roles
- [ ] Invite new member (email)
- [ ] Remove member (as owner)
- [ ] Leave household
- [ ] Create new household
- [ ] Switch active household

#### 3. Notifications Section
- [ ] Master toggle (enable/disable all)
- [ ] Expiry alerts toggle
- [ ] Daily digest toggle
- [ ] Digest time picker
- [ ] Household activity toggle
- [ ] Quiet hours (from/to time)
- [ ] Sound/haptic preference

#### 4. Preferences Section
- [ ] Theme selector (auto/light/dark)
- [ ] Language selector (en/es/fr)
- [ ] Dietary restrictions (checkboxes)
- [ ] Cuisine preferences
- [ ] Allergy list
- [ ] Temperature unit (°F/°C)

#### 5. Privacy Section
- [ ] Delete photos after AI scan toggle
- [ ] Share analytics toggle
- [ ] Export data button → CSV download
- [ ] View privacy policy
- [ ] View terms of service

#### 6. Subscription Section
- [ ] Current plan display
- [ ] Usage stats (scans/recipes)
- [ ] Upgrade button (if free tier)
- [ ] Manage subscription link
- [ ] Restore purchases (iOS)

#### 7. Help & Support Section
- [ ] FAQ link
- [ ] Contact support
- [ ] Report bug (pre-filled with device info)
- [ ] Version number

#### 8. Account Section
- [ ] Sign out button
- [ ] Delete account with confirmation

---

## Component Usage

All components from W5 available. Key ones for Settings:

```typescript
import {
  Button,        // For actions (Sign Out, Delete Account)
  ListRow,       // For settings rows with toggle/value
  Input,         // For text inputs (name, email)
  SegmentedControl, // For theme/language selection
  Sheet,         // For pickers (time zone, cuisine)
  Switch,        // For toggles (notifications)
  IconButton,    // For small actions
} from '@/components/ui';
```

### Example: Settings Row with Toggle

```typescript
import { useState } from 'react';
import { Pressable, XStack, YStack, Text } from 'tamagui';

interface SettingsRowProps {
  icon?: string;
  title: string;
  description?: string;
  value?: string | boolean;
  onPress?: () => void;
  trailing?: React.ReactNode;
}

export function SettingsRow({
  icon,
  title,
  description,
  value,
  onPress,
  trailing,
}: SettingsRowProps) {
  return (
    <Pressable onPress={onPress}>
      <XStack
        paddingHorizontal="$4"
        paddingVertical="$3"
        alignItems="center"
        gap="$3"
        borderBottomWidth={1}
        borderBottomColor="$border/subtle"
      >
        {icon && <Icon name={icon} size={20} color="$text/secondary" />}

        <YStack flex={1} gap="$1">
          <Text fontSize="$4" fontWeight="600" color="$text/primary">
            {title}
          </Text>
          {description && (
            <Text fontSize="$3" color="$text/secondary">
              {description}
            </Text>
          )}
        </YStack>

        {trailing || (
          <Text fontSize="$4" color="$text/tertiary">
            {typeof value === 'boolean' ? (value ? 'On' : 'Off') : value}
          </Text>
        )}
      </XStack>
    </Pressable>
  );
}
```

### Example: Settings Section

```typescript
import { YStack, Text } from 'tamagui';

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <YStack gap="$4" marginVertical="$4">
      <Text
        fontSize="$4"
        fontWeight="700"
        color="$text/primary"
        paddingHorizontal="$4"
      >
        {title}
      </Text>
      <YStack
        backgroundColor="$surface/raised"
        borderRadius="$lg"
        overflow="hidden"
        borderWidth={1}
        borderColor="$border/subtle"
      >
        {children}
      </YStack>
    </YStack>
  );
}
```

---

## Data Models & Services

### ProfileService (Phase B)

```typescript
// Get current profile
getCurrentProfile(): Observable<Profile>

// Update profile
updateProfile(updates: {
  displayName?: string;
  timeZone?: string;
  unitsPreference?: 'imperial' | 'metric';
}): Promise<void>

// Update password
changePassword(currentPassword: string, newPassword: string): Promise<void>

// Upload profile photo
uploadProfilePhoto(photoUri: string): Promise<string>
```

### HouseholdService (Phase B)

```typescript
// Get current household
getCurrentHousehold(): Observable<Household>

// List all members
getMembers(householdId: string): Observable<HouseholdMember[]>

// Invite member
inviteMember(householdId: string, email: string): Promise<void>

// Remove member
removeMember(householdId: string, memberId: string): Promise<void>

// Create household
createHousehold(name: string): Promise<Household>

// Update household name
updateHouseholdName(householdId: string, name: string): Promise<void>

// Leave household
leaveHousehold(householdId: string): Promise<void>
```

### PreferencesService (Phase B)

```typescript
// Get user preferences
getPreferences(): Observable<UserPreferences>

// Update preferences
updatePreferences(updates: {
  theme?: 'auto' | 'light' | 'dark';
  language?: string;
  dietaryRestrictions?: string[];
  cuisinePreferences?: string[];
  allergies?: string[];
}): Promise<void>

// Notification preferences
updateNotifications(updates: {
  enableAll?: boolean;
  expiryAlerts?: boolean;
  dailyDigest?: boolean;
  digestTime?: string;
  householdActivity?: boolean;
  quietHoursFrom?: string;
  quietHoursTo?: string;
  soundEnabled?: boolean;
  hapticEnabled?: boolean;
}): Promise<void>

// Privacy preferences
updatePrivacy(updates: {
  deletePhotosAfterAI?: boolean;
  shareAnalytics?: boolean;
}): Promise<void>

// Export data
exportData(): Promise<string> // CSV URL
```

---

## Implementation Structure

### File Layout
```
apps/mobile/app/(main)/settings/
├── _layout.tsx              (Tab navigator + header)
├── index.tsx                (Profile section)
├── notifications.tsx        (Notifications section)
├── preferences.tsx          (Preferences section)
├── privacy.tsx              (Privacy section)
├── help.tsx                 (Help & Support)
└── account.tsx              (Account & Sign Out)

apps/mobile/src/features/settings/
├── index.ts
├── ProfileSection.tsx       (Profile form)
├── HouseholdsSection.tsx    (Household management)
├── NotificationsSection.tsx (Notification toggles)
├── PreferencesSection.tsx   (Theme, language, diet)
└── SettingsComponents.tsx   (Row, Section)
```

### Root Settings Screen

```typescript
// apps/mobile/app/(main)/settings/index.tsx

import { ScrollView } from 'react-native';
import { YStack, Text } from 'tamagui';
import { SettingsSection, SettingsRow } from '@/features/settings/SettingsComponents';

export default function SettingsScreen() {
  return (
    <ScrollView>
      <YStack backgroundColor="$surface/base" flex={1}>
        {/* Profile */}
        <SettingsSection title={t('settings.sectionProfile')}>
          <SettingsRow
            title="Name"
            onPress={() => navigate('profile')}
            trailing={<Icon name="chevronRight" />}
          />
          <SettingsRow
            title="Email"
            value={email}
            trailing={<Icon name="chevronRight" />}
          />
        </SettingsSection>

        {/* Households */}
        <SettingsSection title={t('settings.sectionHouseholds')}>
          <SettingsRow
            title={currentHousehold?.name}
            description={`${members.length} members`}
            onPress={() => navigate('households')}
            trailing={<Icon name="chevronRight" />}
          />
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection title={t('settings.sectionNotifications')}>
          <SettingsRow
            title="Notifications"
            trailing={
              <Switch
                value={notificationsEnabled}
                onValueChange={toggleNotifications}
              />
            }
          />
        </SettingsSection>

        {/* Preferences */}
        <SettingsSection title={t('settings.sectionPreferences')}>
          <SettingsRow
            title="Theme"
            value={theme}
            onPress={() => showThemeSheet()}
            trailing={<Icon name="chevronRight" />}
          />
          <SettingsRow
            title="Language"
            value={language}
            onPress={() => showLanguageSheet()}
            trailing={<Icon name="chevronRight" />}
          />
        </SettingsSection>

        {/* Privacy */}
        <SettingsSection title={t('settings.sectionPrivacy')}>
          <SettingsRow
            title="Delete photos after AI"
            trailing={
              <Switch
                value={deletePhotosAfterAI}
                onValueChange={toggleDeletePhotos}
              />
            }
          />
          <SettingsRow
            title="Share analytics"
            trailing={
              <Switch
                value={shareAnalytics}
                onValueChange={toggleAnalytics}
              />
            }
          />
        </SettingsSection>

        {/* Help */}
        <SettingsSection title={t('settings.sectionHelp')}>
          <SettingsRow
            title="FAQ"
            onPress={() => openURL(faqUrl)}
            trailing={<Icon name="externalLink" />}
          />
          <SettingsRow
            title="Contact support"
            onPress={() => openURL(supportEmail)}
            trailing={<Icon name="externalLink" />}
          />
        </SettingsSection>

        {/* Account */}
        <SettingsSection title="">
          <Button
            variant="destructive"
            onPress={() => signOut()}
            width="100%"
          >
            Sign Out
          </Button>
        </SettingsSection>
      </YStack>
    </ScrollView>
  );
}
```

---

## Accessibility Checklist

All W5 components include a11y. W7 must verify:
- [ ] VoiceOver announces setting names + values
- [ ] SettingsRow labels are descriptive ("Enable notifications" not "Toggle")
- [ ] All toggles/buttons have labels
- [ ] Touch targets ≥44pt (iOS) / 48dp (Android)
- [ ] Keyboard navigation works in all pickers
- [ ] Modal dialogs announced (privacy policy, confirm sign out)

---

## Testing Checklist for Phase B

- [ ] Settings screen loads without errors
- [ ] All sections visible and scrollable
- [ ] Toggle switches work (notifications, analytics, etc.)
- [ ] Navigation to detail screens works
- [ ] Profile form saves changes
- [ ] Household member list loads
- [ ] Theme preference persists across app restart
- [ ] Language change updates UI immediately
- [ ] Sign out clears auth and returns to login
- [ ] Delete account shows confirmation
- [ ] VoiceOver navigation works
- [ ] All interactive elements are ≥44pt

---

## Success Criteria

✅ Phase B complete when:
1. All 8 settings sections render correctly
2. Toggles/switches persist to WatermelonDB
3. Profile updates sync with W2 backend (Phase B+)
4. Theme/language changes apply immediately
5. Household management works (invite/remove members)
6. Export data downloads CSV
7. Sign out clears session
8. All interactive elements have a11y labels
9. Screen transitions <300ms (measured via Sentry)
10. Settings form handles errors gracefully

---

**Status**: Ready to implement  
**Time**: 2-3 days for Phase B settings  
**Next**: Phase B+ wire up to W2 backend for persistence
