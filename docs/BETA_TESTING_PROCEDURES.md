# Beta Testing Procedures - Week 2 (May 15-21, 2026)

**Phase**: Week 2 Beta Testing  
**Status**: Ready to Execute  
**Version**: 1.0.0  
**Target**: 50+ Beta Testers

---

## 📋 Pre-Beta Preparation (Day 1: May 15)

### Device Testing Results Review

- [ ] All 7 test suites passed on ≥2 devices
- [ ] Zero P0 bugs found
- [ ] Any P1 bugs documented and prioritized
- [ ] Performance metrics within targets
- [ ] Accessibility verified
- [ ] Sign-off from testing team

### Build Preparation

```bash
# Ensure clean git state
git status
# Should show clean working tree

# Verify version
grep '"version"' apps/mobile/package.json
# Should output: "version": "1.0.0"

# Confirm tag exists
git tag -l v1.0.0
# Should show: v1.0.0
```

### TestFlight Setup (iOS)

1. **Create Build Archive**

```bash
cd apps/mobile
pnpm ios -- --release
# Follow Xcode prompts to create archive
```

2. **Upload to App Store Connect**
   - [ ] Open App Store Connect
   - [ ] Select WhatsForLunch app
   - [ ] Go to TestFlight
   - [ ] Upload build using Xcode or Transporter
   - [ ] Wait for processing (~10 minutes)
   - [ ] Verify build appears in "Builds" section

3. **Configure TestFlight**
   - [ ] Add internal testers (development team)
   - [ ] Create beta group "Wave 1" (25 testers)
   - [ ] Create beta group "Wave 2" (25 testers)
   - [ ] Set feedback email: support@whatsforlunch.com
   - [ ] Write beta test notes: "Welcome to WhatsForLunch beta!"

### Google Play Beta Setup (Android)

1. **Create Release Build**

```bash
cd apps/mobile
pnpm android -- --release
# Generates APK/AAB for upload
```

2. **Upload to Play Console**
   - [ ] Open Google Play Console
   - [ ] Select WhatsForLunch app
   - [ ] Go to Testing > Internal Testing
   - [ ] Upload APK/AAB
   - [ ] Wait for review (~2 hours)

3. **Create Beta Tracks**
   - [ ] Create "Closed Beta" track
   - [ ] Upload same build to closed beta
   - [ ] Add 50 beta testers via email list
   - [ ] Write beta release notes
   - [ ] Set rollout to 10% initially

### Beta Tester Recruitment

- [ ] Finalize 50 beta testers list
- [ ] Create recruitment email template
- [ ] Send invitations:
  - iOS: TestFlight link
  - Android: Google Play beta link
- [ ] Include: expectations, feedback method, support contact
- [ ] Set response deadline: 24 hours

---

## 🎯 Beta Testing Phases

### Phase 1: Internal Testing (May 15-16)

**Participants**: Development team only (5-10 people)

**Goals**:

- Basic functionality verification
- Crash detection
- Performance baseline
- Critical bug identification

**Activities**:

1. Each team member uses app for 1+ hour daily
2. Test on their personal device (if available)
3. Report issues immediately in Slack
4. Document any crashes or hangs
5. Note performance observations

**Acceptance Criteria**:

- [ ] No critical crashes
- [ ] All core flows work
- [ ] Performance acceptable
- [ ] Ready to release to Wave 1

### Phase 2: Wave 1 Closed Beta (May 16-18)

**Participants**: 25 carefully selected testers

- Power users / early adopters
- Mix of iPhone and Android
- Mix of experience levels
- Different network conditions

**Goals**:

- Broader feature coverage
- Performance on real devices
- Usability feedback
- Critical issue detection

**Distribution**:

```bash
# Day 1 (May 16): Release to Wave 1
# Day 2-3 (May 17-18): Monitor feedback
# Criteria: Continue if <5 new issues per day
```

**Feedback Collection**:

- TestFlight feedback form (iOS)
- Google Play feedback (Android)
- Email: beta@whatsforlunch.com
- Slack channel: #beta-testing

**Issue Triage**:

- P0 (crash/data loss): Fix immediately
- P1 (broken feature): Assess impact
- P2 (minor issue): Log for v1.1.0

### Phase 3: Wave 2 Expanded Beta (May 18-21)

**Participants**: Full 50 beta testers

- Include less technical users
- Diverse device hardware
- Real-world usage patterns
- Extended testing duration

**Goals**:

- Broader compatibility testing
- Real-world usage patterns
- Performance at scale
- Edge case discovery

**Distribution**:

```bash
# Day 1 (May 18): Release to Wave 2
# Day 2-4 (May 19-21): Monitor data
# Metrics tracked:
#   - Crash rate (target: <0.1%)
#   - Session duration
#   - Feature usage
#   - Error rates
```

**Decision Point (May 21 EOD)**:

- [ ] **READY FOR LAUNCH** - Proceed to submission
- [ ] **1 MORE DAY** - Extend beta to May 22
- [ ] **HOLD** - Found issues requiring fixes

---

## 📊 Monitoring & Metrics

### Crash Monitoring

**Setup Sentry/Firebase Crashlytics**:

```bash
# Check if configured in app
grep -r "Sentry\|Firebase" apps/mobile/src --include="*.ts" --include="*.tsx"
```

**Daily Metrics Review**:

- Total crashes per day
- Crash rate: crashes / sessions
- Top crashing screens
- Top errors
- Device/OS breakdown

**Target**: <0.1% crash rate

### Performance Monitoring

- App startup time (average)
- Session duration (average)
- Feature usage (heatmap)
- Network latency
- Memory usage patterns

### User Feedback

**Feedback Channels**:

- [ ] TestFlight feedback form
- [ ] Google Play Store reviews
- [ ] Email: beta@whatsforlunch.com
- [ ] Slack: #beta-testing
- [ ] In-app feedback (if implemented)

**Feedback Categories**:

- Bug reports
- Feature requests
- Performance complaints
- UI/UX suggestions
- Accessibility feedback

**Daily Summary Template**:

```markdown
## Beta Daily Report - [Date]

**Participants**: [X online, Y total]
**Crashes Today**: [N] ([X%] rate)
**Critical Issues**: [List]
**User Feedback**: [Summary]
**Recommendation**: [Continue/Adjust/Fix]
```

---

## 🐛 Issue Triage & Response

### P0 (Critical - Fix Immediately)

**Examples**:

- App crashes on launch
- Can't sign in
- Data loss or corruption
- Complete feature broken

**Process**:

1. Acknowledge to beta testers (within 30 min)
2. Reproduce issue on development device
3. Create fix
4. Test thoroughly
5. Build new TestFlight/beta build
6. Deploy to testers within 4 hours
7. Notify testers of fix

### P1 (High - Fix Before Launch)

**Examples**:

- Feature partially broken
- Performance degradation
- Layout issues on specific device
- Crashes in specific flow

**Process**:

1. Reproduce and document
2. Assess if blocking launch
3. Create fix if time allows
4. Otherwise: document for v1.0.1
5. Communicate timeline to testers

### P2 (Medium - Log for v1.1.0)

**Examples**:

- Minor visual inconsistency
- Confusing error message
- Non-critical feature suggestion
- Edge case behavior

**Process**:

1. Document issue
2. Add to v1.1.0 backlog
3. Don't delay launch
4. Acknowledge feedback to tester

### Issue Reporting Template

For each issue found during beta:

```markdown
## Issue Report

**Title**: [Clear description]
**Severity**: P[0/1/2]
**Reporter**: [Beta tester ID]
**Reported**: [Date/Time]

### Description

[What happened]

### Reproduction

1. Step 1
2. Step 2
3. Step 3

### Environment

- Device: [Model]
- OS: [Version]
- Network: [Condition]

### Impact

[How many testers, blocking yes/no]

### Status

- Found: [Date]
- Assigned: [Dev name]
- Fixed: [Date]
- Verified: [Date]
- Released: [Build number]
```

---

## 📈 Success Metrics

### Engagement

- [ ] > 80% of testers install app
- [ ] > 60% of testers actively use app
- [ ] Average session: >5 minutes
- [ ] > 50% daily active return rate

### Stability

- [ ] Crash rate <0.1%
- [ ] <5 crashes per 1000 sessions
- [ ] No data loss reports
- [ ] No security issues found

### Performance

- [ ] Startup time <2 seconds (90th percentile)
- [ ] Frame rate >50 FPS (99th percentile)
- [ ] Memory <100 MB (95th percentile)
- [ ] Battery drain acceptable

### Feedback

- [ ] > 70% positive sentiment
- [ ] <10 critical issues
- [ ] > 50 feature suggestions
- [ ] > 5 accessibility improvements

### Decision Criteria for Launch

**READY FOR LAUNCH if**:

- ✅ Crash rate <0.1%
- ✅ <5 P0 issues unresolved
- ✅ <10 P1 issues unresolved
- ✅ Positive user feedback
- ✅ Performance targets met

**DELAY if**:

- ❌ Crash rate >0.5%
- ❌ >10 P0 issues
- ❌ Critical security issues
- ❌ Major performance regression

---

## 🔄 Build & Deploy Workflow

### New Build for Beta Testers

When fixes are needed, create new build:

```bash
# 1. Ensure clean git state
git status

# 2. Make fixes on main branch
# (or hotfix/1.0.0 if critical)

# 3. Increment build number
# iOS: update CFBundleVersion in Info.plist
# Android: increment versionCode in build.gradle

# 4. Commit
git add -A
git commit -m "build: Beta build 2 with fixes"

# 5. Build for TestFlight
pnpm ios -- --release

# 6. Upload to App Store Connect

# 7. Build for Play Beta
pnpm android -- --release

# 8. Upload to Google Play Console

# 9. Notify testers
# Email: "New build available, please update"
```

### Build Number Strategy

```
iOS:
- Build 1: v1.0.0 initial beta
- Build 2: After first round of fixes
- Build 3: Before launch

Android:
- versionCode 1: v1.0.0 initial beta
- versionCode 2: After first round of fixes
- versionCode 3: Before launch
```

---

## 📞 Tester Communication

### Daily Updates

Send brief daily summary to testers:

```markdown
## WhatsForLunch Beta - Daily Update

**Date**: May 17, 2026
**Status**: Stable ✅

**What's New**:

- Fixed login timeout issue (P1)
- Improved search performance
- Better error messages

**Known Issues**:

- Receipt scanning slower on older devices (P2)

**What We Need**:

- Try adding 20+ items and searching
- Test offline functionality
- Report any crashes

**Support**:
Email: beta@whatsforlunch.com
Slack: #beta-testing

Thanks for testing! 🙌
```

### Weekly Sync Meeting

**Schedule**: Every 2 days during beta

**Agenda**:

1. Crash and stability report
2. Critical issues found
3. Fixes deployed
4. Next priorities
5. User feedback highlights
6. Decision on next phase

**Attendees**:

- Development team
- QA lead
- Product manager
- Support lead

---

## ✅ Beta Sign-Off Checklist

### Before Declaring Beta "Complete"

**Quality**:

- [ ] Crash rate <0.1%
- [ ] All P0 issues resolved
- [ ] Most P1 issues addressed
- [ ] No major regressions

**Performance**:

- [ ] Startup <2 seconds
- [ ] Memory <100 MB
- [ ] Frame rate 60 FPS
- [ ] Battery drain acceptable

**Features**:

- [ ] All core features working
- [ ] Navigation smooth
- [ ] Animations 60 FPS
- [ ] Accessibility verified

**Feedback**:

- [ ] > 70% positive sentiment
- [ ] Actionable feedback collected
- [ ] Feature requests logged
- [ ] Improvements noted for v1.1.0

**Launch Readiness**:

- [ ] App Store listings complete
- [ ] Screenshots finalized
- [ ] Release notes approved
- [ ] Privacy policy ready
- [ ] Support contact verified

### Final Sign-Off

```markdown
## Beta Testing Complete - Sign-Off

**Period**: May 15-21, 2026
**Testers**: 50 beta participants
**Results**: [PASS/FAIL]

### Metrics

- Crash Rate: [X%] (target <0.1%)
- Critical Issues: [N] (target 0)
- User Satisfaction: [X%] (target >70%)

### Decision

- [ ] **APPROVED FOR LAUNCH** - Proceed to App Store submission
- [ ] **CONDITIONAL** - Fix 1-2 issues, then launch
- [ ] **HOLD** - Needs more testing or fixes

**Signed By**: ******\_\_\_\_******  
**Date**: ******\_\_\_\_******
**Approved By**: ******\_\_\_\_******
```

---

## 🎯 Next Phase: Week 3 App Store Submission

**When Beta Complete**:

1. Final build preparation
2. App Store metadata finalization
3. Screenshots and promotional art
4. Release notes finalization
5. Submit to App Store and Google Play

**Timeline**:

- May 22: Final validation and submission
- May 23-24: App Store review (iOS)
- May 24-25: Google Play review (Android)
- May 26: Public launch

**If Issues Found During Review**:

- Communicate with reviewer
- Submit update if needed
- May cause 1-2 day delay
- Have hotfix 1.0.1 ready

---

**Beta testing is the final validation before public launch.**

**Success here ensures a smooth, successful public release.**
