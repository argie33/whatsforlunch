import React, { useCallback, useState } from 'react';
import { ScrollView, Pressable, View } from 'react-native';
import { YStack, XStack, Text, Switch } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react-native';
import { haptics } from '@/lib/haptics';

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
      {options.map((opt) => {
        const isSelected = selected.includes(opt);
        return (
          <Pressable
            key={opt}
            onPress={() => { void haptics.selection(); onToggle(opt); }}
            accessibilityRole="checkbox"
            accessibilityLabel={opt}
            accessibilityState={{ checked: isSelected }}
          >
            <Tag label={opt} selected={isSelected} />
          </Pressable>
        );
      })}
    </XStack>
  );
}

export default function PreferencesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { prefs, setPrefs } = useUserPreferences();
  const { track } = useAnalytics();
  const [digestEnabled, setDigestEnabled] = useState(false);
  const [digestTime, setDigestTime] = useState('09:00');

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

  const handleDigestToggle = useCallback((enabled: boolean) => {
    setDigestEnabled(enabled);
    track(SettingsEvents.DIGEST_TOGGLED, { enabled });
  }, [track]);

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

        <YStack gap="$3">
          <SectionTitle>{t('settings.preferences.sectionDigest')}</SectionTitle>
          <Text fontSize="$3" color="$text/secondary" marginBottom="$2">
            {t('settings.preferences.digestHint')}
          </Text>

          {/* Digest Enable Toggle */}
          <XStack
            paddingVertical="$3"
            paddingHorizontal="$3"
            backgroundColor="$surface/raised"
            borderRadius="$md"
            borderWidth={1}
            borderColor="$border/subtle"
            justifyContent="space-between"
            alignItems="center"
          >
            <Text fontSize="$4" fontWeight="500">
              {t('settings.preferences.digestEnable')}
            </Text>
            <Switch
              checked={digestEnabled}
              onCheckedChange={handleDigestToggle}
              accessibilityLabel={t('settings.preferences.digestEnable')}
            />
          </XStack>

          {/* Digest Time (only show when enabled) */}
          {digestEnabled && (
            <Pressable>
              <XStack
                paddingVertical="$3"
                paddingHorizontal="$3"
                backgroundColor="$surface/raised"
                borderRadius="$md"
                borderWidth={1}
                borderColor="$border/subtle"
                justifyContent="space-between"
                alignItems="center"
              >
                <YStack>
                  <Text fontSize="$3" color="$text/tertiary">
                    {t('settings.preferences.digestTime')}
                  </Text>
                  <Text fontSize="$5" fontWeight="600" marginTop="$1">
                    {digestTime}
                  </Text>
                </YStack>
                <ChevronRight size={20} color="$text/tertiary" />
              </XStack>
            </Pressable>
          )}

          {digestEnabled && (
            <Text fontSize="$2" color="$text/tertiary" marginTop="$2">
              {t('settings.preferences.digestTimeHint')}
            </Text>
          )}
        </YStack>
      </YStack>
    </ScrollView>
  );
}
