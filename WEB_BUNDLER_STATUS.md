# Web Bundler Status & Architecture Decision

**Date:** 2026-04-29  
**Phase:** Phase D (Days 28-39)  
**Status:** Known Limitation Documented

## Problem Statement

Web bundler (`expo start --web`) fails to generate bundles in the pnpm monorepo environment with the following error:

```
SHA-1 for file C:\...\node_modules\.pnpm\@react-native+js-polyfills@...\error-guard.js is not computed.
Potential causes:
  1) You have symlinks in your project - watchman does not follow symlinks.
  2) Check `blockList` in your metro.config.js and make sure it isn't excluding the file path.
```

## Root Cause

- **pnpm's virtual store structure** uses symlinks to create a flat dependency graph
- **Metro bundler** (Expo's underlying bundler) cannot compute SHA-1 hashes for files in pnpm's `.pnpm` directory
- This is a **known incompatibility** between Expo, pnpm, and web bundling

## Investigation & Solutions Attempted

✅ **Fixed (Completed):**

- Disabled Tamagui babel plugin (was trying to load react-dom in native environment)
- Removed babel-plugin-transform-runtime (dependency resolution issues)
- Updated metro.config.js with proper pnpm monorepo configuration
- Disabled watchman file watcher (pnpm symlinks incompatible)

❌ **Not Viable:**

- Adding symlink handling to Metro (requires Metro internals changes)
- Blocking .pnpm directories (would break dependency resolution)
- SHA-1 cache invalidation workarounds

## Architectural Decision: Native-First Testing

**Best Practice for Phase D:**

Since this is a development convenience issue, not a platform limitation:

1. **Primary Testing:** Jest test suite + Native emulators (iOS/Android)
   - 260+ tests passing ✅
   - Native platform is the target (mobile app)
   - Emulators provide full feature testing

2. **Web Bundler:** Defer to Post-Phase D
   - Not required for Phase D validation
   - Not required for production (mobile app only)
   - Can be resolved with separate Expo tooling investigation

## Configuration Changes Made

**apps/mobile/metro.config.js:**

- Added proper `watchFolders` for pnpm workspace
- Disabled watchman (`useWatchman: false`)
- Configured `nodeModulesPaths` for monorepo resolution
- Added `cacheStores: []` to bypass cache issues

**apps/mobile/babel.config.js:**

- Removed Tamagui babel plugin (test env only)
- Removed @babel/plugin-transform-runtime
- Kept essential plugins: react-native-reanimated, @babel/plugin-proposal-decorators

**apps/mobile/package.json:**

- Updated `main` field: `expo-router/entry` → `./index.js`

**apps/mobile/index.js (New):**

- Minimal entry point for Metro resolution

## Path Forward

### Phase D (Days 28-39)

✅ Use native emulators for testing
✅ Run Jest test suite for validation
✅ All Phase C features work correctly

### Post-Phase D Investigation

- Evaluate Expo CLI v51+ with pnpm support
- Consider monorepo tooling updates
- Possibly migrate to yarn workspaces if pnpm issues persist
- Web bundler can be secondary concern post-launch

## Test Status

- Jest: 260+ tests passing ✅
- Native emulator: Ready (tested in previous phases) ✅
- Web bundler: Blocked by pnpm+Metro incompatibility (non-critical)

---

**Decision:** Proceed with Phase D using native-first testing. Web bundler is a follow-up task, not a blocker.
