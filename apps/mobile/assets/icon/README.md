# App Icon

## Required files (Phase B)

| File | Size | Use |
|---|---|---|
| `icon-1024.png` | 1024×1024 | App Store / Play Store master |
| `icon-ios.png` | 1024×1024 | iOS (no rounded corners — iOS applies mask) |
| `icon-android-foreground.png` | 1024×1024 | Android adaptive icon foreground |
| `icon-android-background.png` | 1024×1024 | Android adaptive icon background (solid brand/primary) |
| `splash-icon.png` | 200×200 | Centered on splash screen |

EAS Build reads icon from `app.json`:
```json
{
  "expo": {
    "icon": "./assets/icon/icon-ios.png",
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/icon/icon-android-foreground.png",
        "backgroundColor": "#2F7D5B"
      }
    }
  }
}
```

## Design spec

- **Concept**: stylized fridge door, slightly ajar, warm light spilling out — or a fork+leaf mark
- **Background**: `brand/primary` (#2F7D5B) or warm cream (#FBFAF7)
- **Style**: clean, geometric, friendly — NOT photorealistic, NOT overly complex
- **iOS corner radius**: 22.5% (applied by system; design to full bleed)
- **Safe zone**: keep all meaningful content within 80% of canvas (margins ~100px on 1024 master)

## Placeholder

The current `icon.png` in the repo root is the default Expo icon. Replace it in Phase B before first EAS build.
