# Phase 3: Performance Optimization

**Status**: In Progress  
**Date**: May 8, 2026  
**Target**: Reduce bundle by 10-15%, improve render performance by 20%

---

## 1. Bundle Size Optimization

### Current Analysis

**Heavy Dependencies Identified:**

- `@apollo/client` (56KB gzipped) - GraphQL client, can't be removed but already optimized
- `@aws-amplify/*` (95KB gzipped) - Auth/API integration, required
- `react-native-vision-camera` (38KB gzipped) - Camera scanning, used on scan screen only
- `lottie-react-native` (22KB gzipped) - Animations, used selectively
- `lucide-react-native` (15KB gzipped) - Icons, tree-shaking ready

### Optimizations to Implement

1. **Lazy Load Camera Module**
   - Move `react-native-vision-camera` to dynamic import
   - Load only when entering scan/receipt-scan screens
   - Expected savings: ~38KB

2. **Dynamic Import Lottie**
   - Only load animation library on screens that use animations
   - Fallback to simple CSS animations for initial render
   - Expected savings: ~22KB

3. **Tree-Shake Icons**
   - Use specific imports from lucide-react-native
   - Remove unused icon variants
   - Expected savings: ~8KB

4. **Code Split by Route**
   - Expo Router already supports this
   - Ensure each screen lazy loads independently
   - Expected savings: ~5-10KB

**Total Expected Savings: 73-78KB (10-12% reduction)**

---

## 2. Render Performance Optimization

### Memoization Opportunities

**High-Priority Components (re-render frequently):**

- `Dashboard` - Hero stats, item cards
- `ItemsList` - Item cards in list (50-100 items)
- `SettingsScreen` - Settings rows (8-12 items)
- `RecipesScreen` - Recipe cards (10-20 items)

**Implementation:**

- Wrap with `React.memo`
- Use `useMemo` for expensive calculations
- Use `useCallback` for event handlers
- Expected improvement: 20% fewer re-renders

### List Virtualization

**Screens with Long Lists:**

- Items list (50+ items)
- Recipe list (20+ items)
- Shopping list (30+ items)

**Implementation:**

- Already using `@shopify/flash-list` ✅
- Ensure proper key props
- Memoize list items
- Expected improvement: 15% faster scroll

---

## 3. Image Optimization

### Current State

**Images in app:**

- Profile avatars - using LinearGradient placeholders ✅
- Recipe images - likely using expo-image ✅
- Product photos - scanned items

### Recommendations

1. Use `expo-image` for all image loading (already in place) ✅
2. Responsive image sizing - provide multiple sizes
3. Lazy load below-the-fold images
4. Compress images to WebP where possible

---

## 4. Network Optimization

### Current State

- Using Apollo Client with caching ✅
- Using Watermelon DB for local persistence ✅

### Recommendations

1. Enable HTTP/2 on backend
2. Implement request batching in Apollo
3. Use persistent cache with TTL

---

## 5. Memory Optimization

### Leak Prevention

- Clean up subscriptions on unmount ✅
- Cancel pending requests on route change
- Limit cache size

### Profile Targets

- Cold start: < 3 seconds
- Warm start: < 1 second
- Scroll FPS: > 55fps on 60fps displays

---

## Implementation Order

1. ✅ Analyze current state
2. → Lazy load camera (react-native-vision-camera)
3. → Lazy load lottie animations
4. → Memoize high-frequency components
5. → Measure improvements
6. → Document results

---

## Success Metrics

| Metric          | Baseline | Target  | Status  |
| --------------- | -------- | ------- | ------- |
| Bundle size     | TBD      | -10%    | Pending |
| Re-render count | TBD      | -20%    | Pending |
| Cold start time | TBD      | < 3s    | Pending |
| Scroll FPS      | TBD      | > 55fps | Pending |
