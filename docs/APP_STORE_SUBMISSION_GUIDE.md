# App Store Submission Guide - Week 3 (May 22+, 2026)

**Phase**: Week 3 App Store Submission  
**Status**: Ready for Submission  
**Version**: 1.0.0  
**Target Launch Date**: May 26, 2026

---

## 📋 Pre-Submission Checklist (May 22)

### Code & Build Verification

```bash
# Verify clean state
git status

# Verify version
grep '"version"' apps/mobile/package.json
# Output: "version": "1.0.0"

# Verify tag
git tag -l v1.0.0

# Run final validation
bash scripts/pre-launch-validation.sh
# All checks should PASS
```

### Submission Readiness

**Code Quality**:

- [ ] All tests passing (208+)
- [ ] TypeScript clean
- [ ] ESLint clean
- [ ] No console.log statements
- [ ] No hardcoded secrets
- [ ] Git history clean

**Beta Results**:

- [ ] Crash rate <0.1%
- [ ] Zero P0 bugs
- [ ] P1 bugs documented and prioritized
- [ ] User feedback incorporated
- [ ] Performance metrics verified

**Documentation**:

- [ ] Release notes finalized
- [ ] App descriptions approved
- [ ] Screenshots captured
- [ ] Privacy policy updated
- [ ] Support contact verified
- [ ] Legal review complete

**Assets**:

- [ ] App icon (1024x1024) - final
- [ ] Feature graphic (1024x500) - final
- [ ] Screenshots (5-8 per platform)
- [ ] Promotional art (if any)
- [ ] Video preview (optional)

### Final Build Preparation

```bash
# Create final production builds
cd apps/mobile

# iOS: Create release archive
pnpm ios -- --release
# Archive will be in Xcode build folder

# Android: Create release APK/AAB
pnpm android -- --release
# APK/AAB in android/app/build/outputs/apk/release/
```

---

## 🍎 iOS App Store Submission Process

### Step 1: Prepare in App Store Connect (15 minutes)

1. **Open App Store Connect**
   - URL: https://appstoreconnect.apple.com
   - Sign in with Apple Developer account

2. **Select WhatsForLunch App**
   - Navigate to: My Apps → WhatsForLunch

3. **Create New Version**
   - Click: "+ Version" or "Create New Version"
   - Select: iOS App
   - Version number: 1.0.0
   - Release type: Manual Release (not automatic)

### Step 2: Upload Build (10 minutes)

1. **Upload via Transporter**

   ```bash
   # Download Transporter from App Store
   # Or use Xcode organizer

   # Using Xcode:
   # 1. Open Xcode
   # 2. Organizer → Archives
   # 3. Select WhatsForLunch 1.0.0 archive
   # 4. Distribute App → App Store Connect → Upload
   ```

2. **Wait for Processing**
   - Upload takes 1-5 minutes
   - Processing takes 5-10 minutes
   - Status shows in App Store Connect

3. **Verify Build**
   - Once processed, build appears under "Builds"
   - Status should be: "Ready to Submit for Review"

### Step 3: Complete App Information (30 minutes)

**Metadata Tab**:

- [ ] Subtitle: "Track food, prevent waste, plan meals"
- [ ] Positive rating description: [pre-filled]
- [ ] Negative rating description: [pre-filled]
- [ ] Support URL: https://www.whatsforlunch.com/support
- [ ] Privacy policy URL: https://www.whatsforlunch.com/privacy

**Pricing and Availability**:

- [ ] Price tier: Free
- [ ] Availability: Worldwide (all countries)
- [ ] Release date: May 26, 2026 (or manual release)
- [ ] Make available: Immediately upon approval

**General Information**:

- [ ] Category: Lifestyle
- [ ] Content rating: 4+ (no adult content)
- [ ] Bundle ID: com.whatsforlunch.app
- [ ] Version number: 1.0.0

### Step 4: Upload App Preview & Screenshots (20 minutes)

**App Preview Video** (Optional but recommended):

- Format: MP4, H.264
- Duration: 15-30 seconds
- Orientation: Portrait
- Must show real app features
- Example: Quick tour of core features

**Screenshots** (Required):

- Format: PNG or JPEG
- Orientation: Portrait (all for mobile)
- Device: 6.5" (iPhone 12 Pro Max or newer)
- Upload for each language (English minimum)
- File size: <5 MB each

**Screenshot Examples**:

1. Dashboard overview
2. Add item flow
3. Item filtering
4. Inventory list
5. Settings/profile

**Upload Process**:

1. Go to: Version → Screenshots
2. Select device size: 6.5-inch
3. Add up to 10 screenshots per language
4. Screenshots auto-optimize
5. Check preview on different devices

### Step 5: Complete App Description (15 minutes)

From `APP_STORE_LISTINGS.md`:

**Description** (from file):

```
WhatsForLunch is your smart food management companion...
[Use exact text from APP_STORE_LISTINGS.md]
```

**Keywords**:

```
food, inventory, waste, expiry, tracker, fridge, pantry, freezer, recipes, household
```

**Support URL**: https://www.whatsforlunch.com/support

**Privacy Policy URL**: https://www.whatsforlunch.com/privacy

### Step 6: Manage App Review Information (10 minutes)

**Contact Information**:

- [ ] First name: Claude
- [ ] Last name: Code
- [ ] Phone: [Your contact number]
- [ ] Email: support@whatsforlunch.com

**Version Release**:

- [ ] Automatic release: No (manual release)
- [ ] Release date: After approval (pick May 26)

**Rating**:

- [ ] Content rating completed (4+)
- [ ] No advertising content
- [ ] No in-app purchases

**Export Compliance**:

- [ ] Encryption: No custom encryption
- [ ] Does your app use encryption: Yes (HTTPS)
- [ ] Encryption exempt: Yes (standard encryption)

### Step 7: Set Build & Release Type (5 minutes)

1. **Select Build**
   - Build selection: [Your uploaded build]
   - Status: Ready to Submit for Review

2. **Confirm Version Details**
   - Version: 1.0.0
   - What's New: [From APP_STORE_LISTINGS.md]
   - Example:

   ```
   Welcome to WhatsForLunch v1.0.0!

   ✨ NEW
   - Full inventory management system
   - Expiry date tracking with notifications
   - Container organization
   - Real-time household sync
   - Recipe recommendations
   - Settings and preferences

   ⚡ PERFORMANCE
   - Optimized for speed (< 2 second startup)
   - Smooth 60 FPS animations
   - Efficient battery usage

   ♿ ACCESSIBILITY
   - Full VoiceOver support
   - WCAG AA compliance
   - Accessible navigation
   ```

### Step 8: Review & Submit (5 minutes)

1. **Final Review Page**
   - Verify all information correct
   - Check no validation errors (red ⚠️)
   - Review "Ready to Submit" checklist

2. **Check Compliance**
   - [ ] No rejected content
   - [ ] No policy violations
   - [ ] All required fields filled
   - [ ] Correct build selected

3. **Submit for Review**
   - Click: "Submit for Review"
   - Confirm submission
   - Wait for success message

4. **Confirm Submission**
   - Status changes to: "Waiting for Review"
   - Email confirmation sent to Apple Developer account
   - You'll receive review updates via email

### Step 9: Monitor Review Process

**iOS Review Timeline**:

- Average: 24-48 hours
- Busy periods: Can be 3-5 days
- Initial submission: Usually faster
- Updates/resubmissions: Sometimes slower

**How to Check Status**:

1. App Store Connect → App Status
2. Status should show: "Waiting for Review" → "In Review" → "Ready for Sale"
3. Or check email for Apple notifications

**If Issues Found**:

- [ ] Apple sends rejection notification
- [ ] Reason stated in email
- [ ] You have 30 days to fix and resubmit
- [ ] Resubmissions usually reviewed faster

**On Approval**:

- [ ] Status changes to: "Ready for Sale"
- [ ] Choose: Immediate release OR scheduled date
- [ ] If scheduled: Select May 26, 2026
- [ ] App appears on App Store within 1 hour

---

## 🤖 Google Play Store Submission Process

### Step 1: Prepare in Google Play Console (10 minutes)

1. **Open Google Play Console**
   - URL: https://play.google.com/console
   - Sign in with Google Developer account

2. **Select WhatsForLunch App**
   - Dashboard → Select WhatsForLunch

3. **Create New Release**
   - Release management → Production
   - Click: "Create new release"

### Step 2: Upload APK/AAB (10 minutes)

1. **Upload Signed APK/AAB**

   ```bash
   # From previous build
   # File location: android/app/build/outputs/bundle/release/app-release.aab
   # Or: android/app/build/outputs/apk/release/app-release-unsigned.apk
   ```

2. **Upload Steps**:
   - Release management → Production → Create new release
   - Click: "Add bundle or APK"
   - Select: app-release.aab (preferred) or app-release.apk
   - Upload file
   - Wait for upload to complete

3. **Review Version**
   - Version code: 1 (auto-incremented)
   - Version name: 1.0.0
   - Verify app details correct

### Step 3: Complete Store Listing (30 minutes)

**From `APP_STORE_LISTINGS.md`**:

**Short Description** (80 chars):

```
Smart food waste tracker - organize, remember, never waste food again
```

**Full Description** (4000 chars):
[Use exact text from APP_STORE_LISTINGS.md - Long Description section]

**Screenshots** (Required: 2, Recommended: 5-8):

- Format: PNG or JPEG
- Size: 1080 x 1920 px (portrait)
- Upload up to 8 screenshots
- Same screenshots as iOS, reformatted for size

**App Icon** (512 x 512 px):

- Already uploaded in initial setup
- Verify it's correct

**Feature Graphic** (1024 x 500 px):

- Promotional banner
- Optional but recommended
- Can be same as iOS version

### Step 4: Complete App Details (20 minutes)

**Content Rating**:

- Click: "Continue" in Content Rating section
- Answer questionnaire:
  - Violence: No
  - Sexual content: No
  - Gambling: No
  - Profanity: No
  - Personal info collection: Yes (email, household members, food data)
- Submit → Get rating

**App Category**:

- Category: Lifestyle
- Content rating: Everyone
- Target audience: 3+ years old

**Privacy Policy**:

- [ ] URL: https://www.whatsforlunch.com/privacy
- [ ] Linked to policy
- [ ] Privacy policy includes:
  - Data collection (what data is collected)
  - Data usage (how data is used)
  - Data storage (where data is stored)
  - User rights (how to delete/export data)

### Step 5: Manage Release Details (10 minutes)

**Release Notes** (From `APP_STORE_LISTINGS.md`):

```
WhatsForLunch 1.0.0 - Launch

Track food, prevent waste, save money. WhatsForLunch makes it easy.

✨ NEW
- Add and manage food items
- Track expiry dates
- Real-time household sync
- Recipe suggestions
- Container management

⚡ PERFORMANCE
- Fast startup
- Smooth animations
- Lightweight design

♿ ACCESSIBILITY
- TalkBack support
- Accessible design

What's improved:
- Better performance
- More intuitive interface
- Enhanced notifications

Requires: Android 8.0 or higher

Send feedback to support@whatsforlunch.com
```

**Rollout Schedule**:

- [ ] Phased rollout: Yes (recommended)
- [ ] Initial rollout: 10% (May 26)
- [ ] Monitor for 24 hours
- [ ] Expand to 25% (May 27)
- [ ] Monitor for 24 hours
- [ ] Expand to 50% (May 28)
- [ ] Monitor for 24 hours
- [ ] Expand to 100% (May 29)

**Alternative**: Immediate 100% rollout if confident

### Step 6: Review & Submit (5 minutes)

1. **Review Release Summary**
   - APK/AAB uploaded: ✓
   - Store listing complete: ✓
   - Screenshots added: ✓
   - Privacy policy set: ✓
   - Release notes entered: ✓

2. **Check for Issues**
   - No validation errors
   - All required fields filled
   - Rating completed
   - Contact info correct

3. **Review Store Listing Preview**
   - How it looks on Play Store
   - Screenshots display correctly
   - Description readable

4. **Submit for Review**
   - Click: "Review Release"
   - Verify all information
   - Click: "Start rollout to Production"
   - Confirm submission

### Step 7: Monitor Review & Rollout

**Google Play Review Timeline**:

- Initial review: Usually instant to a few hours
- Most apps approved within 24 hours
- Some may be held for manual review

**Check Status**:

1. Google Play Console → Release management → Production
2. Status shows: "In review" → "Rolling out" → "Completed"
3. Or check email for Google Play notifications

**If Issues Found**:

- [ ] Google Play sends notification
- [ ] You have option to: Fix & resubmit, or appeal
- [ ] Common issues: Policy violations, crashes
- [ ] Resubmission usually faster

**On Approval**:

- [ ] Status changes to: "Rolling out"
- [ ] Phased rollout starts at specified percentage
- [ ] Monitor crash rates during rollout
- [ ] Expand to 100% as scheduled
- [ ] App appears on Play Store immediately

### Step 8: Rollout Expansion Strategy

**For Phased Rollout**:

| Date   | Rollout % | Monitor              | Decision                 |
| ------ | --------- | -------------------- | ------------------------ |
| May 26 | 10%       | Crashes, errors      | If <0.1% crash, proceed  |
| May 27 | 25%       | Crash rate, feedback | If stable, proceed       |
| May 28 | 50%       | Performance, issues  | If good, proceed         |
| May 29 | 100%      | Full monitoring      | Official launch complete |

**Monitoring During Rollout**:

- Check crash reports hourly
- Monitor user ratings
- Track error frequency
- Watch for common issues
- Be ready to pause rollout if issues

**If High Crash Rate** (>0.5%):

- [ ] Pause rollout immediately
- [ ] Investigate cause
- [ ] Create hotfix 1.0.1
- [ ] Test thoroughly
- [ ] Submit new build
- [ ] Resume rollout once fixed

---

## 🚨 Launch Day Procedures (May 26, 2026)

### Morning (8 AM)

**Final Checks**:

- [ ] Both iOS and Android submitted
- [ ] Both under review / approved
- [ ] No new critical issues reported
- [ ] Team standing by for launch

### Throughout Day

**Monitor Launch**:

- [ ] App Store: Track approval status
- [ ] Play Store: Monitor rollout progress
- [ ] Crash rates: <0.1% threshold
- [ ] User feedback: Positive sentiment
- [ ] Support team: Ready for inquiries

**Update Status**:

- [ ] Marketing: Post launch announcement
- [ ] Social media: Live launch posts
- [ ] Email: Send launch notification
- [ ] Website: Update app links

### Evening (5 PM+)

**Post-Launch**:

- [ ] Verify both stores live
- [ ] Download app and test
- [ ] Check app store ratings/reviews
- [ ] Monitor crash reports
- [ ] Prepare for v1.0.1 if needed

---

## 📊 Post-Launch Monitoring (May 26+)

### First 24 Hours

**Critical Metrics**:

- [ ] Crash rate <0.1%
- [ ] Error rate <1%
- [ ] Session success rate >95%
- [ ] Average session length >2 minutes

**User Acquisition**:

- [ ] Downloads today: [Target: 1000+]
- [ ] Install-to-active rate >60%
- [ ] Positive reviews appearing

**Support**:

- [ ] Monitor support email
- [ ] Respond to critical issues quickly
- [ ] Track common user questions
- [ ] Document frequently requested features

### First Week (May 26 - June 2)

**App Store Presence**:

- [ ] Maintain high rating (target: 4.5+)
- [ ] Monitor review sentiment
- [ ] Respond to negative reviews
- [ ] Highlight positive features

**Performance**:

- [ ] Maintain crash rate <0.1%
- [ ] Monitor performance regression
- [ ] Track user retention
- [ ] Measure feature adoption

**Engagement**:

- [ ] Daily active users trending up
- [ ] Feature usage patterns
- [ ] User feedback themes
- [ ] Early adopter satisfaction

---

## 🆘 Hotfix Procedures (If Critical Issues Found)

### If P0 Bug Found Post-Launch

**Step 1: Immediate Response** (within 1 hour)

- [ ] Assess severity and scope
- [ ] Decide: Hotfix or wait
- [ ] Communicate with team
- [ ] Create hotfix branch

**Step 2: Create Hotfix v1.0.1**

```bash
# Create hotfix branch
git checkout -b hotfix/1.0.1

# Make minimal fixes only
# Update version to 1.0.1 in package.json

# Test thoroughly
pnpm test
pnpm typecheck

# Commit
git commit -m "fix: Critical issue description"

# Tag for release
git tag -a v1.0.1 -m "Hotfix for critical issue"

# Build release
pnpm ios -- --release
pnpm android -- --release
```

**Step 3: Emergency Submission**

- [ ] Upload new build to TestFlight (iOS)
- [ ] Upload to Play Console with 50% rollout (Android)
- [ ] Notify reviewers of urgency
- [ ] Monitor approval closely
- [ ] Usually approved within 4-6 hours

**Step 4: Rollout**

- [ ] iOS: Released when approved
- [ ] Android: Expand to 100% once verified
- [ ] Announce fix to users
- [ ] Monitor new build closely

### Escalation Contacts

If issues during launch:

- [ ] Development lead: [Contact]
- [ ] Product manager: [Contact]
- [ ] Support manager: [Contact]
- [ ] On-call engineer: [Contact]

---

## ✅ Launch Sign-Off Checklist

Before declaring launch successful:

**App Store**:

- [ ] App appears on iOS App Store
- [ ] Correct version (1.0.0)
- [ ] All screenshots visible
- [ ] Description displays correctly
- [ ] Rating showing (if reviews exist)

**Play Store**:

- [ ] App appears on Google Play
- [ ] Rollout active (at target percentage)
- [ ] Screenshots visible
- [ ] Description displays correctly
- [ ] Rating showing (if reviews exist)

**Performance**:

- [ ] Crash rate <0.1%
- [ ] Error rate <1%
- [ ] User retention >50%
- [ ] Average session >2 minutes

**User Feedback**:

- [ ] Positive reviews appearing
- [ ] No major complaints
- [ ] Support team handling inquiries
- [ ] Feature usage as expected

**Operations**:

- [ ] Analytics tracking correctly
- [ ] Crash monitoring active
- [ ] Support procedures ready
- [ ] Team standing by for issues

**Sign-Off**:

```markdown
## Launch Complete - May 26, 2026

**iOS**: Live on App Store ✓
**Android**: Rolling out on Play Store ✓
**Stability**: <0.1% crash rate ✓
**Adoption**: [X] downloads on day 1 ✓

**Ready for**: Ongoing monitoring and v1.1.0 planning

**Signed By**: ******\_\_\_\_******
**Date**: May 26, 2026
```

---

**Your app is now live on both major app stores.**

**Next phase: Ongoing support, monitoring, and v1.1.0 planning.**
