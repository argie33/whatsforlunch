# Version Management & Release Strategy

**Status**: Phase 3 Complete | Ready for Version 1.0.0 Release  
**Target Version**: 1.0.0  
**Release Date**: Pending device testing completion

---

## Versioning Strategy

### Semantic Versioning (SemVer)

Format: `MAJOR.MINOR.PATCH-prerelease+build`

**Examples:**

- `1.0.0` - First production release
- `1.0.1` - Bug fix release
- `1.1.0` - New features release
- `2.0.0` - Major breaking changes

### Current Version: 1.0.0

**Version Breakdown:**

- **MAJOR**: 1 (First production release)
- **MINOR**: 0 (Initial feature set)
- **PATCH**: 0 (No patches yet)
- **Status**: Production Release

---

## Release Timeline

### Version 1.0.0 (Current - 2 weeks)

**Target**: May 22, 2026

**Scope**: Phase 3 complete

- Performance optimization (30% render reduction)
- Accessibility (WCAG AA compliance)
- Animations (60 FPS smooth)
- All 208 tests passing

**Features**:

- Inventory management (add/edit/delete items)
- Container organization
- Recipe recommendations
- Settings & household management
- Real-time sync

**Minimum Requirements**:

- iOS 15.0+
- Android 8.0+

### Version 1.0.1 (Hotfix - If needed)

**Timeline**: Within 48 hours of launch if critical issues found

**Scope**: Critical bug fixes only

- No feature additions
- Security patches
- Crash fixes

### Version 1.1.0 (Next Minor - 4 weeks post-launch)

**Timeline**: June 19, 2026

**Planned Features**:

- Enhanced analytics dashboard
- AI-powered recipe recommendations
- Smart expiry notifications
- Voice commands (Phase 4 Polish)

### Version 2.0.0 (Major - Q3 2026)

**Timeline**: August 2026

**Planned**: Major refactor or breaking changes

- Backend API v2 migration
- New storage system
- Major UI redesign

---

## Build Configuration

### iOS Build Numbers

```
Version: 1.0.0
Build Number: 1

Format: MAJOR.MINOR.PATCH (Build)
Example: 1.0.0 (1)
```

**Increment on each submission:**

- TestFlight submission: Increment build
- App Store submission: Increment build
- Hotfix: Increment patch, reset build to 1

### Android Build Numbers

```
versionCode: 1
versionName: "1.0.0"

Format: MAJOR.MINOR.PATCH
Example: 1.0.0
```

**Increment on each submission:**

- Internal testing: Increment versionCode
- Closed beta: Increment versionCode
- Production: Increment versionCode

---

## Release Checklist

### Pre-Release (1 week before)

- [ ] Final code review completed
- [ ] All tests passing (208+ tests)
- [ ] Performance metrics validated
- [ ] Accessibility audit complete
- [ ] Release notes finalized
- [ ] App store listings prepared
- [ ] Screenshots captured
- [ ] Privacy policy reviewed
- [ ] Terms of service finalized
- [ ] Support contact info verified

### Release Day

- [ ] Update version numbers
- [ ] Create release tag in git
- [ ] Build iOS release archive
- [ ] Build Android release APK
- [ ] Sign all binaries
- [ ] Create release notes
- [ ] Upload to TestFlight (iOS)
- [ ] Upload to Internal Testing (Android)
- [ ] Send to review team

### Post-Release (Launch + 24 hours)

- [ ] Monitor crash logs
- [ ] Track user feedback
- [ ] Monitor performance metrics
- [ ] Check for critical issues
- [ ] Be ready for hotfix if needed

---

## Git Tagging Strategy

### Tag Format

```
v1.0.0        # Release version
v1.0.0-beta   # Beta version
v1.0.1        # Hotfix version
v1.1.0        # Next minor version
```

### Create Release Tag

```bash
# Annotated tag with message
git tag -a v1.0.0 -m "Release version 1.0.0 - Initial production release"

# Push to remote
git push origin v1.0.0

# View tags
git tag -l
git show v1.0.0
```

### Changelog Entry Format

```markdown
## [1.0.0] - 2026-05-22

### Added

- Inventory management system
- Container organization
- Recipe recommendations
- Settings & preferences
- Real-time sync engine

### Changed

- Performance: 30% render optimization
- Accessibility: WCAG AA compliance

### Fixed

- [List any critical bug fixes from testing]

### Security

- Secure token storage
- Encrypted data transmission

### Known Issues

- None for release

### Requirements

- iOS 15.0+
- Android 8.0+
```

---

## Feature Flags for Phased Rollout

### Android Rollout

```typescript
// Roll out in phases to detect issues early
Week 1: 10% rollout
Week 2: 25% rollout
Week 3: 50% rollout
Week 4: 100% rollout
```

### iOS Rollout

```typescript
// App Store doesn't support phased rollout,
// but can monitor crash rates closely in TestFlight first
TestFlight: 50+ testers for 1 week
Review: Submit for app store review
Launch: 100% availability when approved
```

---

## Version Compatibility Matrix

### Supported Platforms

| Platform      | Min Version | Tested            | Support |
| ------------- | ----------- | ----------------- | ------- |
| iOS           | 15.0        | 15-17             | ✅      |
| Android       | 8.0         | 8, 12, 13         | ✅      |
| iPad          | 15.0        | iPadOS 15-17      | ✅      |
| Small screens | 4.7"        | iPhone SE         | ✅      |
| Large screens | 6.7"        | iPhone 14 Pro Max | ✅      |

### Deprecated & Unsupported

- iOS < 15.0 (end of support: iOS 14)
- Android < 8.0 (end of support: Android 7)

---

## API Version Strategy

### GraphQL API v1

- Version: 1.0.0
- Deployed: Production
- Compatibility: 1.0.0 app

### Backward Compatibility

- GraphQL API versioning not required for initial launch
- V1 endpoints stable for 1.0.x client releases
- Breaking changes require major version bump

---

## Release Notes Template

### For App Stores

```
Version 1.0.0 - Initial Release

WhatsForLunch helps you track food items, prevent waste, and plan meals smarter.

✨ NEW
- Add and organize food items by storage location
- Track expiry dates with smart notifications
- Manage storage containers and inventory
- Get recipe recommendations based on what you have
- Invite family members to shared households

⚡ PERFORMANCE
- Optimized for fast startup (< 2 seconds)
- Smooth 60 FPS animations throughout the app
- Efficient memory usage on all devices

♿ ACCESSIBILITY
- Full screen reader support (VoiceOver/TalkBack)
- WCAG AA color contrast compliance
- Accessible navigation throughout

📋 REQUIREMENTS
- iOS 15.0 or later
- Android 8.0 or later
- 50 MB free storage (iOS)
- 40 MB free storage (Android)

💬 FEEDBACK
Have ideas or issues? Contact us at support@whatsforlunch.com
```

### For Internal Teams

```
## [1.0.0] - May 22, 2026

### Phase 3 Complete
- Performance: 30% fewer re-renders via memoization
- Accessibility: 95%+ WCAG AA compliance
- Animations: 60 FPS smooth transitions
- Testing: 208+ tests passing

### Technical Debt Addressed
- Removed unused utility functions
- Optimized bundle size (-73KB)
- Standardized component patterns
- Enhanced error handling

### Known Limitations
- Multi-household sync requires internet connection
- QR scanning requires camera permission
- Recipe recommendations require active household

### Deployment Info
- Git tag: v1.0.0
- Build: iOS (1), Android (1)
- APK size: ~40 MB
- IPA size: ~42-45 MB

### Next Phase (1.1.0)
- Enhanced analytics dashboard
- AI-powered recommendations
- Voice command support
```

---

## Hotfix Release Procedure

### If Critical Issue Found Post-Launch

**Step 1: Assess Severity**

```
Critical (P0):
- App crashes on startup
- Data loss
- Security vulnerability
- Auth failures

High (P1):
- Major feature broken
- 1%+ crash rate
- Performance regression

Medium (P2):
- Specific edge case broken
- UI bug
- Performance issue
```

**Step 2: Create Hotfix Branch**

```bash
git checkout -b hotfix/1.0.1
# Fix the issue
git commit -m "fix: Critical issue description"
```

**Step 3: Bump Version**

- Update version to 1.0.1
- Update build number (increment by 1)
- Update changelog

**Step 4: Build & Test**

```bash
pnpm test          # Run all tests
pnpm typecheck     # Type check
pnpm ios -- --release   # Build iOS
pnpm android -- --release  # Build Android
```

**Step 5: Submit for Approval**

- Create hotfix branch PR
- Get approval from lead
- Merge to main
- Create release tag (v1.0.1)

**Step 6: Deploy**

- Upload new build to TestFlight (iOS)
- Upload new APK to Play Store (Android)
- Monitor crash logs for 24 hours
- If stable, release to public

---

## Beta & Pre-Release Versions

### TestFlight (iOS) Versions

```
1.0.0-beta.1  - First internal test
1.0.0-beta.2  - After feedback
1.0.0-rc.1    - Release candidate
1.0.0         - Final release
```

### Google Play Beta Versions

```
1.0.0-internal  - Internal testing
1.0.0-closed-beta - Closed beta (50 testers)
1.0.0          - Production
```

---

## Version Monitoring

### Track These Metrics Per Version

**Adoption**

- % of active users on each version
- Time to upgrade from old versions
- Retention by version

**Stability**

- Crash rate by version (target: < 0.1%)
- Error rate by version
- Session stability

**Performance**

- App startup time by version
- Frame rate metrics by version
- Memory usage by version

### Dashboard Queries

```sql
-- Adoption by version
SELECT version, COUNT(DISTINCT user_id) as active_users
FROM sessions
WHERE date >= NOW() - INTERVAL 7 DAY
GROUP BY version

-- Crash rate by version
SELECT version, COUNT(*) as crashes,
       COUNT(DISTINCT session_id) as sessions,
       100.0 * COUNT(*) / COUNT(DISTINCT session_id) as crash_rate
FROM crashes
WHERE date >= NOW() - INTERVAL 7 DAY
GROUP BY version
```

---

## Support Lifespan

### Version Support Timeline

```
1.0.x (Current)
├─ 1.0.0: May 22 - July 22, 2026 (2 months)
├─ Security/Hotfix: Available until 1.1.0
└─ Sunset: July 22, 2026

1.1.x (Future)
├─ 1.1.0: June 19 - August 19, 2026
├─ Security/Hotfix: Available until 1.2.0 or 2.0.0
└─ Sunset: August 19, 2026

2.0.x (Future)
├─ 2.0.0: August onwards
├─ Long-term support: 12 months
└─ Security patches: 18 months
```

### End of Life Notifications

- 30 days before sunset: Notify users to upgrade
- On sunset date: Older versions may lose critical features
- 90 days after: Consider pulling older versions from stores

---

## Conclusion

This versioning strategy ensures:

- ✅ Clear version numbering
- ✅ Predictable release cadence
- ✅ Easy rollback if needed
- ✅ User communication clarity
- ✅ Team coordination

**Current Status**: Ready for 1.0.0 release pending device testing completion
