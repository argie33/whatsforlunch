import React, { useCallback } from 'react';
import { ScrollView, Pressable } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Tag } from '@/components/ui/Tag';
import { useUserPreferences } from '@/features/settings/useUserPreferences';
import { DIETARY_OPTIONS, CUISINE_OPTIONS, ALLERGY_OPTIONS } from '@/features/settings/constants';
import { useAnalytics } from '@/lib/posthog';
import { SettingsEvents } from '@/features/settings/analytics';
import type { ThemePreference, UnitsPreference } from '@/features/settings/types';

function SectionTitle({ children }: { children: string }) {
  return (
    <Text fontSize="$3" fontWeight="600" color="$text/tertiary" textTransform="uppercase" letterSpacing={0.5} marginBottom="$3">
      {children}
    </Text>
  );
}

function TagCloud({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (tag: string) => void;
}) {
  return (
    <XStack flexWrap="wrap" gap="$2">
      {options.map((opt) => (
        <Pressable key={opt} onPress={() => { Haptics.selectionAsync(); onToggle(opt); }}>
          <Tag label={opt} selected={selected.includes(opt)} />
        </Pressable>
      ))}
    </XStack>
  );
}

export default function PreferencesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { prefs, setPrefs } = useUserPreferences();
  const { track } = useAnalytics();

  const handleTheme = useCallback((val: string) => {
    setPrefs({ theme: val as ThemePreference });
    track(SettingsEvents.THEME_CHANGED, { theme: val });
  }, [setPrefs, track]);

  const handleUnits = useCallback((val: string) => {
    setPrefs({ units: val as UnitsPreference });
    track(SettingsEvents.UNITS_CHANGED, { units: val });
  }, [setPrefs, track]);

  const toggleTag = useCallback((
    key: 'dietaryTags' | 'cuisineTags' | 'allergyTags',
    tag: string,
  ) => {
    const current = prefs[key];
    const next = current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag];
    setPrefs({ [key]: next });
  }, [prefs, setPrefs]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#FBFAF7' }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingHorizontal: 20, paddingTop: 24 }}
      showsVerticalScrollIndicator={false}
    >
      <YStack gap="$6">
        <YStack gap="$3">
          <SectionTitle>{t('settings.preferences.sectionAppearance')}</SectionTitle>
          <SegmentedControl
            segments={[
              { label: t('settings.preferences.themeAuto'), value: 'auto' },
              { label: t('settings.preferences.themeLight'), value: 'light' },
              { label: t('settings.preferences.themeDark'), value: 'dark' },
            ]}
            value={prefs.theme}
            onValueChange={handleTheme}
          />
        </YStack>

        <YStack gap="$3">
          <SectionTitle>{t('settings.preferences.sectionUnits')}</SectionTitle>
          <SegmentedControl
            segments={[
              { label: t('settings.preferences.unitsImperial'), value: 'imperial' },
              { label: t('settings.preferences.unitsMetric'), value: 'metric' },
            ]}
            value={prefs.units}
            onValueChange={handleUnits}
          />
        </YStack>

        <YStack gap="$3">
          <SectionTitle>{t('settings.preferences.sectionDietary')}</SectionTitle>
          <Text fontSize="$3" color="$text/secondary" marginBottom="$2">
            {t('settings.preferences.dietaryHint')}
          </Text>
          <TagCloud
            options={DIETARY_OPTIONS}
            selected={prefs.dietaryTags}
            onToggle={(tag) => toggleTag('dietaryTags', tag)}
          />
        </YStack>

        <YStack gap="$3">
          <SectionTitle>{t('settings.preferences.sectionCuisine')}</SectionTitle>
          <Text fontSize="$3" color="$text/secondary" marginBottom="$2">
            {t('settings.preferences.cuisineHint')}
          </Text>
          <TagCloud
            options={CUISINE_OPTIONS}
            selected={prefs.cuisineTags}
            onToggle={(tag) => toggleTag('cuisineTags', tag)}
          />
        </YStack>

        <YStack gap="$3">
          <SectionTitle>{t('settings.preferences.sectionAllergies')}</SectionTitle>
          <Text fontSize="$3" color="$text/secondary" marginBottom="$2">
            {t('settings.preferences.allergyHint')}
          </Text>
          <TagCloud
            options={ALLERGY_OPTIONS}
            selected={prefs.allergyTags}
            onToggle={(tag) => toggleTag('allergyTags', tag)}
          />
        </YStack>
      </YStack>
    </ScrollView>
  );
}
