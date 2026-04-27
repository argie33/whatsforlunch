import { ScrollView } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { SegmentedControl } from '@/components/ui';
import { Tag } from '@/components/ui';
import { useUserPreferences, DIETARY_OPTIONS, CUISINE_OPTIONS, ALLERGY_OPTIONS } from '@/features/settings';
import type { ThemePreference, UnitsPreference } from '@/features/settings';

function SectionHeader({ title }: { title: string }) {
  return (
    <Text
      fontSize={13}
      fontWeight="500"
      color="$text/tertiary"
      textTransform="uppercase"
      letterSpacing={0.4}
      paddingHorizontal="$5"
      paddingTop="$6"
      paddingBottom="$2"
    >
      {title}
    </Text>
  );
}

function TagCloud({
  options,
  selected,
  onToggle,
}: {
  options: readonly string[];
  selected: string[];
  onToggle: (tag: string) => void;
}) {
  return (
    <XStack flexWrap="wrap" gap="$2" paddingHorizontal="$5" paddingVertical="$3">
      {options.map(opt => (
        <Tag
          key={opt}
          label={opt}
          selected={selected.includes(opt)}
          onRemove={selected.includes(opt) ? () => onToggle(opt) : undefined}
        />
      ))}
      {options
        .filter(opt => !selected.includes(opt))
        .map(opt => (
          // Tappable unselected tags — wrap in XStack with onPress
          <XStack key={`tap-${opt}`} position="absolute" opacity={0} />
        ))}
    </XStack>
  );
}

function SelectableTagCloud({
  options,
  selected,
  onToggle,
}: {
  options: readonly string[];
  selected: string[];
  onToggle: (tag: string) => void;
}) {
  return (
    <XStack
      flexWrap="wrap"
      gap="$2"
      paddingHorizontal="$5"
      paddingVertical="$3"
      backgroundColor="$surface/raised"
      borderRadius="$md"
      marginHorizontal="$5"
    >
      {options.map(opt => {
        const isSelected = selected.includes(opt);
        return (
          <YStack
            key={opt}
            onPress={() => onToggle(opt)}
            pressStyle={{ opacity: 0.7 }}
          >
            <Tag
              label={opt}
              selected={isSelected}
            />
          </YStack>
        );
      })}
    </XStack>
  );
}

export default function PreferencesScreen() {
  const { prefs, setPrefs } = useUserPreferences();

  function toggleTag(field: 'dietaryTags' | 'cuisineTags' | 'allergyTags', tag: string) {
    const current = prefs[field];
    const next = current.includes(tag)
      ? current.filter(t => t !== tag)
      : [...current, tag];
    setPrefs({ [field]: next });
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#FBFAF7' }}
      contentInsetAdjustmentBehavior="automatic"
    >
      <YStack paddingBottom="$10">

        <SectionHeader title="Appearance" />
        <YStack
          backgroundColor="$surface/raised"
          borderRadius="$md"
          marginHorizontal="$5"
          padding="$4"
          gap="$3"
        >
          <Text fontSize={15} fontWeight="500" color="$text/primary">Theme</Text>
          <SegmentedControl
            segments={[
              { label: 'Auto', value: 'auto' },
              { label: 'Light', value: 'light' },
              { label: 'Dark', value: 'dark' },
            ]}
            value={prefs.theme}
            onValueChange={(v) => setPrefs({ theme: v as ThemePreference })}
          />
        </YStack>

        <SectionHeader title="Units" />
        <YStack
          backgroundColor="$surface/raised"
          borderRadius="$md"
          marginHorizontal="$5"
          padding="$4"
          gap="$3"
        >
          <Text fontSize={15} fontWeight="500" color="$text/primary">Measurements</Text>
          <SegmentedControl
            segments={[
              { label: 'Imperial', value: 'imperial' },
              { label: 'Metric', value: 'metric' },
            ]}
            value={prefs.units}
            onValueChange={(v) => setPrefs({ units: v as UnitsPreference })}
          />
        </YStack>

        <SectionHeader title="Dietary Restrictions" />
        <Text fontSize={13} color="$text/tertiary" paddingHorizontal="$5" paddingBottom="$2">
          Tap to select. Used for recipe suggestions.
        </Text>
        <SelectableTagCloud
          options={DIETARY_OPTIONS}
          selected={prefs.dietaryTags}
          onToggle={(tag) => toggleTag('dietaryTags', tag)}
        />

        <SectionHeader title="Cuisine Preferences" />
        <Text fontSize={13} color="$text/tertiary" paddingHorizontal="$5" paddingBottom="$2">
          Your favourite cuisines for recipe and restaurant suggestions.
        </Text>
        <SelectableTagCloud
          options={CUISINE_OPTIONS}
          selected={prefs.cuisineTags}
          onToggle={(tag) => toggleTag('cuisineTags', tag)}
        />

        <SectionHeader title="Allergies" />
        <Text fontSize={13} color="$text/tertiary" paddingHorizontal="$5" paddingBottom="$2">
          AI will flag recipes containing these ingredients.
        </Text>
        <SelectableTagCloud
          options={ALLERGY_OPTIONS}
          selected={prefs.allergyTags}
          onToggle={(tag) => toggleTag('allergyTags', tag)}
        />

      </YStack>
    </ScrollView>
  );
}
