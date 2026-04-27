/**
 * W5 Phase C — Accessibility Implementation Guide
 *
 * Every component must meet WCAG 2.1 Level AA standards:
 * - accessibilityRole: semantic role (button, header, etc.)
 * - accessibilityLabel: short description of element
 * - accessibilityHint: additional instructions if needed
 * - Minimum touch target: 44pt (iOS) / 48dp (Android)
 * - Color not the only indicator (always pair with icon/text)
 * - Focus indicators for keyboard navigation
 */

export const A11Y_CHECKLIST = {
  button: [
    '✅ accessibilityRole="button"',
    '✅ accessibilityLabel="Clear, action-focused (e.g., \'Send message\')"',
    '✅ accessibilityHint for complex actions',
    '✅ Min 44pt touch target',
    '✅ Visual feedback on press (scale, opacity)',
    '✅ Works with VoiceOver/TalkBack',
  ],
  card: [
    '✅ accessibilityRole="button" if interactive',
    '✅ accessibilityLabel describes content',
    '✅ Status stripe (if present): icon + text, never color alone',
    '✅ Announces expiry status via label',
  ],
  input: [
    '✅ <TextInput accessibilityLabel="Field name"',
    '✅ accessibilityHint for format requirements',
    '✅ Error state announced: "Invalid email, required format: user@example.com"',
    '✅ Floating label visible (not hidden)',
    '✅ Clearable button has label: "Clear {{field name}}"',
  ],
  listRow: [
    '✅ accessibilityRole="button" if tappable',
    '✅ accessibilityLabel = "{{title}}, {{subtitle}}"',
    '✅ Trailing element labeled if interactive',
    '✅ Announces when navigating to new screen',
  ],
  statusBadge: [
    '✅ Icon always paired with text (never color alone)',
    '✅ accessibilityLabel = "{{status}}" (fresh, urgent, etc.)',
    '✅ No semantic meaning from color; icon + text conveys status',
  ],
  avatar: [
    '✅ accessibilityLabel = "Avatar for {{name}}"',
    '✅ Online indicator: "Online status, {{name}}"',
  ],
  icon: [
    '✅ Standalone icon: always has label or aria-hidden',
    '✅ Icon + text: set aria-hidden on icon',
    '✅ Icon button: label on button, not icon',
  ],
  dynamicType: [
    '✅ Support scaling up to 1.5x (not beyond)',
    '✅ Test at accessibility text size settings',
    '✅ Layouts reflow, no truncation',
  ],
  motionPreference: [
    '✅ Detect AccessibilityInfo.isReduceMotionEnabled()',
    '✅ Swap spring animations for fade on user preference',
    '✅ No auto-play animations',
  ],
};

/**
 * Component accessibility checklist — run before Phase C complete:
 *
 * ```bash
 * # 1. VoiceOver test (iOS)
 * Settings → Accessibility → VoiceOver → On
 * Swipe right to navigate, double-tap to activate
 *
 * # 2. TalkBack test (Android)
 * Settings → Accessibility → TalkBack → On
 *
 * # 3. Keyboard-only test
 * - Tab through all interactive elements
 * - Shift+Tab to go backward
 * - Enter to activate
 *
 * # 4. High contrast test
 * Settings → Accessibility → Increase Contrast
 * - Status colors still distinguishable?
 * - Text still readable?
 *
 * # 5. Dynamic Type test
 * Settings → Accessibility → Larger Accessibility Sizes
 * - Set to Largest
 * - All text readable?
 * - No layout breaks?
 *
 * # 6. MobSF scan (Phase C integration)
 * pnpm exec mobsf --scan [ipa_or_apk]
 * ```
 */

export const ACCESSIBILITY_TESTING = {
  ios: {
    voiceOver: 'Settings → Accessibility → VoiceOver',
    displayAccommodations: 'Settings → Accessibility → Display & Text Size',
    textSize: 'Settings → Accessibility → Larger Accessibility Sizes',
    focusMode: 'Settings → Accessibility → Focus → On',
  },
  android: {
    talkBack: 'Settings → Accessibility → TalkBack',
    magnification: 'Settings → Accessibility → Magnification',
    textSize: 'Settings → Display → Font size',
    colorCorrection: 'Settings → Accessibility → Color correction',
  },
};
