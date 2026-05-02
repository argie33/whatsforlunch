# Adding Real App Screenshots

This document explains how to add real WhatsForLunch app screenshots to the landing page.

## Setup

Real app screenshots are displayed in production when the `PUBLIC_SCREENSHOT_URL` environment variable is set. During development, a mock UI is shown as a fallback.

## Adding Screenshots

### 1. Prepare Screenshot Assets

Export screenshots from the WhatsForLunch mobile app:

- **Dashboard screen** (recommended for hero section)
  - Resolution: iPhone 14 Pro (1170 x 2532)
  - Format: PNG or WEBP (WEBP recommended for smaller file size)
  - Content: Kitchen items sorted by expiry date, showing the main value prop

- **Alternative screens** for future use:
  - Scan screen (QR code camera)
  - Containers screen (saved containers list)
  - Stats screen (waste analytics)

### 2. Store Images

Place screenshot images in the `apps/web/public/screenshots/` directory:

```
apps/web/public/screenshots/
├── dashboard.png          # Hero section screenshot
├── dashboard.webp         # Optimized WEBP version
├── scan.png              # Alternative screenshot
├── containers.png        # Alternative screenshot
└── stats.png             # Alternative screenshot
```

### 3. Configure Environment

Set the `PUBLIC_SCREENSHOT_URL` environment variable:

```bash
# .env.production (for production builds)
PUBLIC_SCREENSHOT_URL=/screenshots/dashboard.webp

# Or use the full CDN URL if hosted externally
PUBLIC_SCREENSHOT_URL=https://cdn.whatsforlunch.app/screenshots/dashboard.webp
```

### 4. Build and Deploy

The component automatically uses the screenshot when deployed:

```bash
# Production build will include the screenshot
pnpm run build

# Development continues to show the mock UI
pnpm run dev
```

## Implementation Details

The Hero component (apps/web/src/components/Hero.astro) includes:

- **Production path**: When `PUBLIC_SCREENSHOT_URL` is set, displays the real screenshot
- **Development fallback**: Shows the mock UI for easier development without assets
- **Optimization**: Images are served with proper compression and caching headers
- **Responsiveness**: Screenshots scale automatically to fit the device frame

## Best Practices

1. **Optimization**
   - Use WEBP format for 30-50% file size reduction
   - Compress PNG files with TinyPNG or similar tools
   - Target image sizes: 1170×2532 for dashboard screenshots

2. **Content**
   - Show items at various urgency levels (red, yellow, green)
   - Include realistic food names and expiry times
   - Demonstrate key features: food categorization, urgency indicators

3. **Testing**
   - Build locally with `PUBLIC_SCREENSHOT_URL=./screenshots/dashboard.webp pnpm run build`
   - Verify images display correctly on mobile and desktop
   - Test with various network conditions

## Rollback

If screenshots need to be removed or reverted:

1. Remove the `PUBLIC_SCREENSHOT_URL` environment variable
2. Rebuild: `pnpm run build`
3. The component automatically falls back to the mock UI

## Troubleshooting

**Screenshot not showing:**

- Verify the file exists at `PUBLIC_SCREENSHOT_URL` path
- Check that the environment variable is set during build time
- Ensure the image is accessible (CORS headers for external URLs)

**Image quality issues:**

- Use a tool like TinyPNG to compress without quality loss
- Consider WEBP format for better compression
- Verify the original export resolution matches the frame size

## Future Enhancements

- Multiple screenshots for carousel view
- Dynamic screenshot selection based on user region/language
- Screenshots with annotations highlighting key features
- Animated GIF demos of core workflows
