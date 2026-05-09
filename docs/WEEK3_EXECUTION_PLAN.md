# Week 3 Execution Plan: App Store Submission & Launch (May 22-26, 2026)

**Phase**: Production Launch  
**Status**: Ready to Execute (after Week 2 approval)  
**Version**: 1.0.0  
**Timeline**: May 22-26, 2026 (5 days)  
**Target Launch**: May 26, 2026

---

## 📅 Daily Breakdown

### Wednesday, May 22 - Pre-Submission Validation

**Morning (8 AM - 12 PM)**:

**Code Verification**:

```bash
# Clean git state
git status
# Should be clean

# Verify version
grep '"version"' apps/mobile/package.json
# Should output: "1.0.0"

# Verify tag
git tag -l v1.0.0
# Should show: v1.0.0

# Run validation script
bash scripts/pre-launch-validation.sh
# Should PASS all checks
```

**Results**:

- [ ] Git clean
- [ ] Version correct
- [ ] Tag exists
- [ ] Validation script PASSES

**Afternoon (1 PM - 5 PM)**:

**Beta Results Review**:

- [ ] Review Week 2 beta final report
- [ ] Crash rate <0.1%? ✓
- [ ] Zero P0 bugs? ✓
- [ ] P1 bugs documented? ✓
- [ ] Performance targets met? ✓
- [ ] Get executive sign-off to proceed

**Asset Preparation**:

- [ ] Finalize app icon (1024x1024)
- [ ] Finalize feature graphic (1024x500)
- [ ] Screenshots ready (5-8 per platform):
  - iPhone screenshots (1242x2208)
  - Android screenshots (1080x1920)
- [ ] All assets uploaded to shared drive/Dropbox

**Evening (5 PM - 8 PM)**:

**Documentation Verification**:

- [ ] Release notes final
- [ ] App descriptions finalized
- [ ] Privacy policy URL working
- [ ] Support contact verified
- [ ] Legal review complete

**EOD Checklist**:

- [ ] Create final pre-submission checklist
- [ ] Assign iOS submission to: [Person]
- [ ] Assign Android submission to: [Person]
- [ ] Brief both people on procedures
- [ ] Post to #launch: "All systems ready for submission"

---

### Thursday, May 23 - iOS App Store Submission

**Time Estimate**: 90-120 minutes total

**Morning (8 AM - 10 AM)**:

**Build Preparation**:

```bash
cd apps/mobile

# Create release archive
pnpm ios -- --release

# Follow Xcode prompts to create archive
# Save to: apps/mobile/build/
```

**Upload to TestFlight**:

- [ ] Open App Store Connect
- [ ] Select WhatsForLunch app
- [ ] Go to TestFlight → Builds
- [ ] Upload build using Xcode or Transporter
- [ ] Wait for processing (10-15 min)
- [ ] Verify build shows "Ready to Submit for Review"

**Mid-Morning (10 AM - 12 PM)**:

**Create Version for Review**:

1. [ ] In App Store Connect, click "+ Version"
2. [ ] Version: 1.0.0
3. [ ] Release type: Manual Release
4. [ ] Save

**Complete Version Details**:

- [ ] Subtitle: "Track food, prevent waste, plan meals"
- [ ] Support URL: https://www.whatsforlunch.com/support
- [ ] Privacy Policy: https://www.whatsforlunch.com/privacy
- [ ] Pricing: Free
- [ ] Availability: Worldwide
- [ ] Category: Lifestyle
- [ ] Content Rating: 4+

**Afternoon (1 PM - 3 PM)**:

**Upload Screenshots**:

- [ ] Upload 5-8 screenshots (1242x2208)
- [ ] Screenshots should show:
  1. Dashboard/home
  2. Add item flow
  3. Item filtering
  4. Inventory management
  5. Settings/profile

**Add App Description**:

- From `APP_STORE_LISTINGS.md`:
- [ ] Long description (copy from file)
- [ ] Keywords: food, inventory, waste, expiry, tracker, fridge, pantry, freezer, recipes, household
- [ ] Release notes (from `APP_STORE_LISTINGS.md`)

**Late Afternoon (3 PM - 5 PM)**:

**Final Review Before Submission**:

- [ ] All metadata correct
- [ ] Screenshots uploaded
- [ ] No red validation errors
- [ ] Build selected correctly
- [ ] Privacy policy URL verified
- [ ] Review checklist all green

**Submit for Review**:

- [ ] Click: "Submit for Review"
- [ ] Confirm submission
- [ ] Note submission time
- [ ] iOS submission complete ✓

**Evening (5 PM - 8 PM)**:

**Monitoring**:

- [ ] Confirm receipt email from Apple
- [ ] Status shows: "Waiting for Review"
- [ ] Post to #launch: "iOS submitted successfully"
- [ ] Expected review time: 24-48 hours

---

### Friday, May 24 - Android Play Store Submission

**Time Estimate**: 90-120 minutes total

**Morning (8 AM - 10 AM)**:

**Build Preparation**:

```bash
cd apps/mobile

# Create release APK/AAB
pnpm android -- --release

# Output in: android/app/build/outputs/bundle/release/app-release.aab
# OR: android/app/build/outputs/apk/release/app-release.apk
```

**Upload to Play Console**:

- [ ] Open Google Play Console
- [ ] Select WhatsForLunch app
- [ ] Go to Release management → Production
- [ ] Click: "Create new release"
- [ ] Upload APK/AAB (preferred: AAB)
- [ ] Wait for upload/processing (5-10 min)

**Mid-Morning (10 AM - 12 PM)**:

**Complete Store Listing**:

- [ ] Short description: "Smart food waste tracker"
- [ ] Full description (from `APP_STORE_LISTINGS.md`)
- [ ] Category: Lifestyle
- [ ] Content rating: Everyone (complete questionnaire)

**Upload Screenshots & Assets**:

- [ ] Screenshots: 5-8 (1080x1920)
- [ ] App icon: 512x512 (verify correct)
- [ ] Feature graphic: 1024x500 (optional but recommended)
- [ ] Screenshots show same flow as iOS

**Afternoon (1 PM - 3 PM)**:

**Release Notes & Configuration**:

- [ ] Release notes (from `APP_STORE_LISTINGS.md`)
- [ ] Rollout strategy: Phased rollout (10% → 25% → 50% → 100%)
- [ ] Release schedule: [Select May 26, 2026]

**Content Rating**:

- [ ] Complete questionnaire
- [ ] Select appropriate rating
- [ ] Confirm: Everyone

**Late Afternoon (3 PM - 5 PM)**:

**Final Review Before Submission**:

- [ ] All metadata correct
- [ ] Screenshots uploaded
- [ ] No validation errors
- [ ] Build correctly selected
- [ ] Privacy policy linked
- [ ] Release notes entered
- [ ] Rollout strategy confirmed

**Submit for Review**:

- [ ] Click: "Review Release"
- [ ] Verify all information
- [ ] Click: "Start rollout to Production"
- [ ] Confirm submission
- [ ] Android submission complete ✓

**Evening (5 PM - 8 PM)**:

**Monitoring**:

- [ ] Confirm Google Play notification
- [ ] Status shows: "In review" or "Rolling out"
- [ ] Post to #launch: "Android submitted successfully"
- [ ] Expected review time: A few hours to 24 hours

---

### Saturday, May 25 - Review Monitoring & Preparation

**Morning (8 AM - 12 PM)**:

**Check Submission Status**:

- [ ] **iOS**: App Store Connect → Status
  - Status: "In Review" or "Ready for Sale"?
  - If approved: Can release immediately or schedule for May 26
- [ ] **Android**: Play Console → Release management
  - Status: "In review" or "Rolling out"?
  - If rolling out: Started at [%]

**If Issues Found**:

- [ ] iOS rejected: Review Apple feedback
  - Address feedback
  - Resubmit (usually reviewed faster)
- [ ] Android rejected: Review Google feedback
  - Address feedback
  - Resubmit

**Afternoon (1 PM - 5 PM)**:

**Prepare Launch Communications**:

- [ ] Write launch announcement for:
  - Email newsletter
  - Social media (Twitter, Facebook, Instagram)
  - Website
  - Blog post (if any)
- [ ] Prepare in-app launch message
- [ ] Brief support team on launch
- [ ] Prepare customer support responses for common questions

**Example Launch Message**:

```markdown
🎉 WhatsForLunch is now live!

We're excited to announce that WhatsForLunch v1.0.0 is now available
on the App Store and Google Play.

✨ Features:

- Track food inventory with expiry dates
- Real-time household sync
- Smart recipe recommendations
- Reduce food waste and save money

🎯 Get it now:

- iOS: https://apps.apple.com/...
- Android: https://play.google.com/...

We'd love to hear your feedback!
📧 support@whatsforlunch.com
🐦 @whatsforlunch

#FoodWaste #SmartKitchen #MealPlanning
```

**Evening (5 PM - 8 PM)**:

**Finalize Launch Details**:

- [ ] Confirm both apps are approved (or will be by May 26)
- [ ] Schedule social media posts for May 26
- [ ] Brief support team: Have responses ready
- [ ] Prep blog post or launch announcement
- [ ] Post to #launch: "All systems ready for May 26 launch"

---

### Sunday, May 26 - LAUNCH DAY 🚀

**Morning (8 AM - 10 AM)**:

**Final Readiness Check**:

- [ ] **iOS**: Status = "Ready for Sale"?
  - If yes: Release immediately OR let scheduled date release
  - If no: Check for approval updates
- [ ] **Android**: Rolling out at correct %?
  - Status should show: "Rolling out to 10%"

**Monitoring Setup**:

- [ ] Open crash monitoring dashboard
- [ ] Prepare analytics dashboard
- [ ] Have support team standing by
- [ ] Monitor social media responses

**Mid-Morning (10 AM - 12 PM)**:

**Public Announcement**:

- [ ] Post launch announcement to:
  - [ ] Twitter/X
  - [ ] Facebook
  - [ ] Instagram
  - [ ] Website/blog
  - [ ] Email newsletter (if list exists)
- [ ] Include download links
- [ ] Include feature highlights
- [ ] Include support contact

**Post on Social Media**:

```
🎉 We're LIVE!

WhatsForLunch v1.0.0 is now available on the App Store and Google Play!

Track your food, prevent waste, save money 🥬

📱 Download: [App Store] [Play Store]

#FoodWaste #SmartKitchen
```

**Afternoon (12 PM - 5 PM)**:

**Monitor Launch Metrics**:

- [ ] Check crash rate hourly (target: <0.1%)
- [ ] Monitor error rate (target: <1%)
- [ ] Track app downloads
- [ ] Monitor app store ratings
- [ ] Watch social media mentions
- [ ] Support team: Handle incoming questions/feedback
- [ ] **If crash spike**: Prepare for emergency hotfix

**Check Both App Stores**:

- [ ] iOS App Store: App visible? Rating showing?
- [ ] Google Play: App visible? Rolled out to 10%? Rating showing?
- [ ] Screenshots displaying correctly?
- [ ] Description visible?

**Evening (5 PM+)**:

**End of Day Status**:

- [ ] Post to #launch: Launch complete
- [ ] Summarize day 1 metrics
- [ ] No critical issues? ✓
- [ ] Prepare for ongoing monitoring

---

## 📊 Launch Day Monitoring Dashboard

Create this spreadsheet/sheet for real-time monitoring:

```markdown
## May 26, 2026 - Launch Day Metrics

**Time**: [Hour]

### iOS App Store

- Status: [Live/In Review/...]
- Rating: [Stars if showing]
- Downloads: [N] (estimate)
- Crash Rate: [X%]
- Top Issue: [...]

### Android Play Store

- Status: [Rolling to X%]
- Rating: [Stars if showing]
- Downloads: [N] (estimate)
- Crash Rate: [X%]
- Top Issue: [...]

### Combined Metrics

- Total Downloads: [N]
- Crash Rate: [X%] (target <0.1%)
- Error Rate: [X%] (target <1%)
- Support Inquiries: [N]
- Social Mentions: [N]

### Critical Issues Found

- P0: [List any critical issues]
- P1: [List high-priority issues]

### Decision

- [ ] All metrics green, launch successful ✓
- [ ] Minor issues, monitoring
- [ ] Critical issue, prepare hotfix
```

---

## 🆘 If Critical Issues Found

### P0 Issue During Launch

**Immediate Actions**:

1. [ ] Assess: Does it affect >1% of users?
2. [ ] Decide: Hotfix or pause rollout?
3. [ ] If hotfix needed:

   ```bash
   git checkout -b hotfix/1.0.1
   # Make minimal fix
   git commit -m "fix: Critical issue"
   git tag -a v1.0.1 -m "Hotfix"

   # Build new version
   pnpm ios -- --release
   pnpm android -- --release

   # Submit for review (can mark as urgent)
   ```

4. [ ] Android: Pause rollout if major issue
5. [ ] iOS: Usually can't pause, monitor closely

**Timeline**:

- Emergency submission: 4-6 hour review
- Have team standing by
- May cause 1-2 day delay to 100% rollout

---

## ✅ Success Criteria for Week 3

**Submission**:

- [ ] iOS submitted successfully
- [ ] Android submitted successfully
- [ ] No rejections from reviewers
- [ ] Both approved by May 26

**Launch**:

- [ ] Both apps live and visible
- [ ] Correct version (1.0.0)
- [ ] Correct descriptions and screenshots
- [ ] Ratings and reviews showing correctly

**Performance**:

- [ ] Crash rate <0.1%
- [ ] Error rate <1%
- [ ] Session success >95%
- [ ] No emergency hotfix needed

**Adoption**:

- [ ] Day 1 downloads: [Target: 1000+]
- [ ] Install to active ratio: >60%
- [ ] Positive user reviews appearing
- [ ] Support team handling inquiries

**Operations**:

- [ ] Monitoring dashboards active
- [ ] Support team prepared
- [ ] Team standing by for issues
- [ ] Launch communications complete

---

## 📞 Launch Day Contacts

**Have these ready May 26**:

- Development Lead: [Contact]
- Product Manager: [Contact]
- Support Lead: [Contact]
- On-call Engineer: [Contact]
- Slack Channel: #launch

**If Emergency Occurs**:

- Contact development lead immediately
- Create hotfix/1.0.1 branch
- Fast-track review with Apple/Google if needed

---

## 🎉 Post-Launch (May 27+)

**Ongoing Monitoring**:

- [ ] Daily crash rate checks
- [ ] User rating trends
- [ ] Social media sentiment
- [ ] Support ticket volume

**Next Steps**:

- [ ] Maintain <0.1% crash rate
- [ ] Gather user feedback
- [ ] Plan v1.1.0 features
- [ ] Monitor adoption metrics

**By June 2**:

- [ ] Complete Week 1 post-launch assessment
- [ ] Decide on any hotfix updates
- [ ] Begin v1.1.0 planning

---

**Week 3 is execution: Submit cleanly, launch smoothly, monitor closely.**

**Target: Live on both app stores by May 26, 2026.**

**Begin Wednesday with pre-submission validation, execute submission Thursday-Friday.**
