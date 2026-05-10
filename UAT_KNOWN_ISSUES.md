# UAT Known Issues & Limitations

**Date**: April 30, 2026  
**Status**: Pre-UAT Known Issues  
**Update Frequency**: Daily during UAT

---

## Known Limitations (By Design)

### Authentication
- ❌ **No Real Email Verification**: Magic link emails not sent (dev mode)
- ❌ **No Real Social Auth**: Apple/Google logins disabled (dev mode)
- ✅ **Dev Bypass Available**: Use "dev@local.test" to sign in

**Workaround**: Use dev bypass button for testing

---

### AI/ML Features
- ⚠️ **Mock Responses Only**: AI doesn't actually identify food
- ⚠️ **Mock OCR**: Date extraction returns static mock data
- ✅ **Framework Ready**: Real AI wired up for production

**Workaround**: Verify form pre-fill works with mock data

---

### Backend Integration
- ❌ **No AWS Connection**: App works fully offline locally
- ⚠️ **Sync is Local**: Changes stored in phone DB only
- ✅ **Sync Framework Ready**: Will connect to AWS in Phase E

**Impact**: UAT validates local functionality only

---

### Push Notifications
- ❌ **Not Implemented**: Notifications framework installed but not wired
- ✅ **Toggle UI Present**: Settings show notification options
- ✅ **Framework Ready**: Will be connected in Phase E

**Note**: This is expected in UAT phase

---

### Camera Features
- ⚠️ **Camera Access**: May require browser permissions
- ⚠️ **Web Limitations**: Camera limited in web browser
- ✅ **Full Support**: iOS/Android have full camera access

**Workaround**: Test on iOS/Android for full camera features

---

### Data Persistence
- ⚠️ **Local Storage Only**: Data not sent to cloud
- ⚠️ **Browser Reload**: Web version may lose data on hard reload
- ✅ **Mobile Persistent**: iOS/Android use WatermelonDB

**Impact**: For web testing, don't hard refresh mid-session

---

## Known Bugs (To Be Fixed Before Phase E)

### None Currently Documented

---

## Issues Found During UAT

### [Will be populated as testing begins]

---

## Test Data Notes

### Sample Accounts
- **Dev Account**: dev@local.test (hardcoded bypass)
- **No other accounts needed**: Dev mode only needs one

### Sample Data
- **Pre-loaded**: None (start fresh each session)
- **Can Add**: Create items during testing via UI

---

## Environment-Specific Notes

### Web (http://localhost:8082)
✅ **Recommended for UI/UX testing**
- Fast iteration
- Easy screenshot/video capture
- Good for accessibility testing

❌ **Limitations**:
- No native mobile feel
- Limited camera access
- No haptic feedback

### iOS Simulator
✅ **Best for iOS-specific features**
- Native UI feel
- Full camera access
- Haptic feedback works

❌ **Requirements**:
- Mac required
- Xcode installed
- 2-3 min startup

### Android Emulator
✅ **Best for Android-specific features**
- Native UI feel
- Full camera access
- Haptic feedback works

❌ **Requirements**:
- Android SDK installed
- Emulator configured
- 2-3 min startup

### Physical Device (Expo Go)
✅ **Closest to production**
- Exact native behavior
- Full device features
- Real performance

❌ **Limitations**:
- Slower startup
- Device required

---

## Testing Tips & Workarounds

### "Items not showing"
- **Cause**: May not have created any yet
- **Fix**: Use Scenario 3 to add items first

### "Search not working"
- **Cause**: Search is case-sensitive
- **Fix**: Try different case or partial match

### "Swipe actions not responding"
- **Cause**: Item needs padding for swipe area
- **Fix**: Try swiping from middle of item

### "Dark mode not changing"
- **Cause**: Browser may cache old color
- **Fix**: Hard refresh (Ctrl+Shift+R) and toggle again

### "Language not changing"
- **Cause**: Some text is hardcoded (buttons, etc.)
- **Fix**: Reload page after language change

### "Offline mode stuck"
- **Cause**: Browser may not support offline API
- **Fix**: Test on iOS/Android instead of web

---

## Environment Checklist

Before starting UAT, verify:

- [ ] Node.js 20.x installed (`node -v`)
- [ ] pnpm installed (`pnpm -v`)
- [ ] Dependencies installed (`pnpm install` successful)
- [ ] TypeScript compiles (`pnpm typecheck` passes)
- [ ] Mobile app starts (`pnpm --filter @wfl/mobile dev`)
- [ ] App accessible (`http://localhost:8082` loads)
- [ ] Can sign in with dev@local.test
- [ ] Dashboard loads without errors

---

## Performance Notes

### Expected Performance (Web)
- **Cold start**: 2-3 seconds
- **Page navigation**: <500ms
- **Item list scroll**: 60fps (FlashList optimized)
- **Typing in search**: Immediate response

### Mobile Performance (iOS/Android)
- **Cold start**: <3 seconds (target)
- **Navigation**: <300ms (target)
- **List scroll**: ≥60fps (target)
- **Memory**: <150MB (target)

### If Slower Than Expected
- Clear browser cache
- Close other tabs
- Check browser dev tools for errors
- Try on actual device if testing web

---

## Security Notes for UAT

### No Real Data Concerns
- ✅ Uses mock data only
- ✅ No real AWS services
- ✅ No real user accounts
- ✅ Local storage only

### Dev Mode Bypasses
- ⚠️ Auth is bypassed (intentional)
- ⚠️ No password validation (intentional)
- ⚠️ Mock AI responses (intentional)

**These are expected in pre-prod UAT**

---

## Browser Compatibility

### Tested & Supported
- ✅ Chrome 120+ (Recommended)
- ✅ Safari 17+
- ✅ Firefox 121+
- ✅ Edge 120+

### Known Issues
- ⚠️ Safari: Camera permissions dialog may appear multiple times
- ⚠️ Firefox: Some Expo features limited
- ⚠️ Older browsers: Not tested

**Recommendation**: Use Chrome for web UAT

---

## Next Steps If Issues Found

### For Minor Issues
1. Document in UAT_BUG_REPORT_TEMPLATE.md
2. Post in #whatsfresh-dev
3. Continue testing other scenarios

### For Critical Issues
1. Document immediately
2. Slack @eng-lead
3. Escalate in standup
4. Pause related testing

---

## UAT Success Criteria

✅ **UAT Passes If**:
- 14/15 scenarios pass
- Known issues < 5
- No critical bugs blocking functionality
- All core features testable

❌ **UAT Fails If**:
- App crashes frequently
- Cannot complete core flows
- Data loss observed
- Security issues found

---

## Feedback Loop

**During UAT**, report findings:
1. **Slack**: #whatsfresh-dev (real-time)
2. **Issues**: Use UAT_BUG_REPORT_TEMPLATE.md
3. **Standup**: Report in 9:30 AM PT daily
4. **Dashboard**: Update PHASE_D_TEAM_DASHBOARD.md

**After UAT**, summary:
1. Aggregate all issues
2. Create GitHub issues
3. Prioritize by severity
4. Assign to teams for Phase E

---

**Last Updated**: April 30, 2026  
**Status**: Ready for UAT  
**Next Review**: End of UAT (May 2)
