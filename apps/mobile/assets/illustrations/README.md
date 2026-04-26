# Illustrations

Hand-drawn SVG illustrations for WhatsForLunch. Commissioned in Figma, exported as SVG, imported via `react-native-svg`.

## Required assets (Phase B)

| File | Screen | Description |
|---|---|---|
| `empty-fridge.svg` | S14 Dashboard empty | Signature illustration — open fridge, mostly empty, warm style |
| `onboarding-1.svg` | S1 slide 1 | Animated Lottie fridge with items |
| `onboarding-2.svg` | S1 slide 2 | 3-step scan animation (QR / barcode / camera) |
| `onboarding-3.svg` | S1 slide 3 | Phone with alert notification |
| `onboarding-4.svg` | S1 slide 4 | Permission primer — camera + bell |
| `empty-containers.svg` | S7 Containers empty | Stack of clean containers |
| `empty-recipes.svg` | S9 Recipes empty | Cookbook with a question mark |
| `empty-stats.svg` | S13 Stats empty | Chart with sprouting plant |
| `magic-link-sent.svg` | S2 post-submit | Sealed envelope with sparkle |

## Style guide

- **Stroke weight**: 2pt, rounded caps and joins
- **Palette**: pulls from brand tokens (`brand/primary` #2F7D5B, `surface/base` warm whites, earthy neutrals)
- **Dimensions**: 280×280pt (1×), exported at 3× for @3x devices
- **Format**: SVG (preferred) or exported PNG @3x
- **Mood**: warm, friendly, slightly illustrative — NOT flat icon-style, NOT photorealistic

## Usage

```tsx
import { SvgXml } from 'react-native-svg';
import emptyFridgeSvg from '@/assets/illustrations/empty-fridge.svg';

<EmptyState
  illustration={<SvgXml xml={emptyFridgeSvg} width={200} height={200} />}
  title={t('emptyStates.dashboard.title')}
  description={t('emptyStates.dashboard.description')}
  primaryAction={{ label: t('emptyStates.dashboard.cta'), onPress: onAddItem }}
/>
```

## Placeholder

Until commissioned assets arrive, use the `IllustrationPlaceholder` component from `src/components/ui/`:

```tsx
import { IllustrationPlaceholder } from '@/components/ui';
<IllustrationPlaceholder name="empty-fridge" size={200} />
```
