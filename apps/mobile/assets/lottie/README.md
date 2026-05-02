# Lottie Animations

Lottie JSON files for WhatsFresh. Created in After Effects / LottieFiles, exported as `.json`.

## Required assets (Phase B)

| File | Trigger | Description | Duration |
|---|---|---|---|
| `pull-to-refresh.json` | Pull-to-refresh gesture | Tumbling vegetable (carrot or apple) | 1.2s loop |
| `scan-reticle.json` | Scan screen active | Animated corner brackets sweep + pulse | 2s loop |
| `success-confetti.json` | Streak achieved / first item added | Confetti cannon in brand colors | 1.5s once |
| `scan-success.json` | After successful scan | Reticle scale-pop + checkmark | 0.4s once |
| `ai-processing.json` | AI classification in progress | Soft spinning spark or brain icon | 1s loop |
| `empty-fridge-loop.json` | Dashboard empty state | Subtle fridge door sway or item floating | 5s loop |

## Style guide

- **Colors**: use brand palette (`#2F7D5B` primary, warm neutrals)
- **Easing**: spring-like — ease out, slight overshoot
- **File size**: keep under 50kb per file (optimize via LottieFiles optimizer)
- **Format**: Lottie JSON (not dotLottie at MVP, for RN compatibility)

## Usage

```tsx
import LottieView from 'lottie-react-native';
import scanReticle from '@/assets/lottie/scan-reticle.json';

<LottieView
  source={scanReticle}
  autoPlay
  loop
  style={{ width: 200, height: 200 }}
/>
```

## Reduce Motion

When `AccessibilityInfo.isReduceMotionEnabled()` returns true, replace Lottie with a static SVG equivalent. Each Lottie should have a corresponding static fallback in `assets/illustrations/`.
