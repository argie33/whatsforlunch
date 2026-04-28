# Performance Budget — WhatsForLunch Mobile

**Owner**: W5 (Mobile Foundation)  
**Updated**: 2026-04-27

---

## 1. Cold start

The cold start budget covers the time from the user tapping the app icon to the first interactive frame (TTI).

| Metric                    | Budget     | Current (dev build)           | Measurement method              |
| ------------------------- | ---------- | ----------------------------- | ------------------------------- |
| TTI — foreground launch   | ≤ 2 500 ms | _measure on real device_      | `expo-performance` + Flashlight |
| TTI — background relaunch | ≤ 800 ms   | _measure on real device_      | `expo-performance`              |
| JS bundle parse + execute | ≤ 400 ms   | _measure via Hermes profiler_ | Hermes trace                    |
| WatermelonDB first query  | ≤ 100 ms   | _measure in dev build_        | `performance.now()` wrappers    |

### Measurement

```bash
# Install Flashlight
npm install -g @perf-tools/flashlight

# Start a test session (requires connected Android device or Simulator)
flashlight test --bundleId app.whatsforlunch.mobile --duration 10

# Report is saved to flashlight-report/
```

For iOS:

- Use Instruments → Time Profiler with "App Launch" template
- Target: Main thread idle within 2 500 ms

### Optimisation levers

1. **Hermes**: enabled for both iOS and Android (`jsEngine: 'hermes'` in `app.json`)
2. **Lazy screens**: `expo-router` loads screens only when visited — no eager imports
3. **WatermelonDB**: uses LokiJS adapter in dev (in-memory), SQLite in production — both fast
4. **Tamagui**: compile-time optimised styles; no runtime style computation on initial render
5. **Image pre-load**: splash screen hides after `SplashScreen.hideAsync()` is explicitly called — never blocks on network

### Budget gate (CI)

The budget is verified manually on every release build. When Flashlight integration is complete, add:

```yaml
- name: Cold start budget
  run: flashlight test --bundleId app.whatsforlunch.mobile --duration 10 --tti-budget 2500
  continue-on-error: true
```

---

## 2. Scroll / frame rate

| Metric                           | Budget                                               |
| -------------------------------- | ---------------------------------------------------- |
| Scrolling frame rate (FPS)       | ≥ 60 fps (120 fps on ProMotion)                      |
| List render (100 items)          | ≤ 16 ms per frame                                    |
| Item status transition animation | ≤ 16 ms (Reanimated worklet, never blocks JS thread) |

All animations run on the UI thread via `react-native-reanimated` worklets. Status changes use `withTiming` with `Easing.bezier` — no `setState` during animation.

---

## 3. Bundle size

| Metric                            | Budget   |
| --------------------------------- | -------- |
| JS bundle (Hermes bytecode, gzip) | ≤ 3 MB   |
| OTA update delta (typical)        | ≤ 500 KB |

Check current bundle size:

```bash
cd apps/mobile
npx expo export --platform ios 2>&1 | grep -i "bundle size"
```

---

## 4. Network

| Operation                    | Budget (p95)          |
| ---------------------------- | --------------------- |
| Sign in (magic link → token) | ≤ 1 000 ms            |
| Initial sync (≤ 100 items)   | ≤ 1 500 ms            |
| Delta sync (incremental)     | ≤ 500 ms              |
| Create item (write)          | ≤ 500 ms              |
| Upload photo (background)    | N/A (background task) |

These match the API SLAs in `scripts/benchmarks/api-benchmark.ts`.

---

## 5. Memory

| Metric                           | Budget   |
| -------------------------------- | -------- |
| App memory at idle               | ≤ 120 MB |
| App memory with 500 items loaded | ≤ 200 MB |
| Background memory footprint      | ≤ 60 MB  |

WatermelonDB keeps only the current query result set in JS memory; the full database stays in SQLite. Images are loaded lazily via `expo-image` which respects `prefetch` + LRU cache.

---

## 6. Battery

- No background polling — sync is triggered by app foreground events and explicit user actions
- Push notifications delivered via APNs/FCM (zero battery in background)
- Location: not requested (no location features)

---

## Baseline snapshots

Record these on each release build (real devices, release profile):

| Date                         | Device | OS  | Cold start TTI | FPS (scroll) | Bundle (MB) |
| ---------------------------- | ------ | --- | -------------- | ------------ | ----------- |
| _add on first release build_ |        |     |                |              |             |
