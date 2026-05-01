# UAT Bug Report Template

**Report ID**: UAT-[DATE]-[SEQUENCE]  
**Date Submitted**: [DATE]  
**Tester**: [NAME]  
**Severity**: 🔴 Critical / 🟠 High / 🟡 Medium / 🔵 Low

---

## Bug Summary

**Title**: [One-line description of bug]

**Scenario**: [Which UAT scenario? e.g., "Scenario 3: Add Item"]

**Component**: [Which part? e.g., "Dashboard", "Scan", "Settings"]

---

## Description

**What Happened** (Actual Behavior):
[What did you observe? Be specific.]

**Expected Behavior**:
[What should have happened?]

**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]
3. [Step 3]
4. [Result]

---

## Environment

| Item | Value |
|------|-------|
| Test Date | [DATE] |
| App URL | http://localhost:8082 |
| Browser | [Chrome/Safari/Firefox] |
| Device | Web / iOS / Android |
| OS Version | [e.g., iOS 17, Android 14] |
| App Version | 0.1.0 |

---

## Attachments

- Screenshot: [If applicable, attach screenshot]
- Video: [If applicable, attach short video]
- Log: [If applicable, paste error log]

---

## Severity Assessment

### 🔴 Critical (Block Release)
- ✅ Use if: Feature completely broken, app crashes, data loss
- Impact: Blocks multiple teams or prevents core functionality

### 🟠 High (Major Feature Impact)
- ✅ Use if: Feature partially broken, major UX issue
- Impact: Blocks one or more important features

### 🟡 Medium (Minor Feature Impact)
- ✅ Use if: Works but has issues, confusing UX
- Impact: Feature still works, but with friction

### 🔵 Low (Polish/Nice-to-Have)
- ✅ Use if: Minor UI issue, typo, optimization
- Impact: Doesn't block functionality

---

## Root Cause (Optional, Tester Best Guess)

[If you think you know the cause, describe it]

---

## Suggested Fix (Optional)

[Any ideas on how to fix it?]

---

## Follow-Up Notes

- [ ] Bug reproduced consistently
- [ ] Bug reproduced intermittently
- [ ] Workaround exists: [If yes, describe]
- [ ] Blocks other testing: [If yes, list what]

---

## Tester Sign-Off

**Tester Name**: _____________________  
**Signature**: _____________________  
**Date**: _____________________

---

## Triage (For Dev Team)

**Assigned To**: _____________________  
**Estimated Effort**: [XS / S / M / L / XL]  
**Priority**: [P0 / P1 / P2 / P3 / P4]  
**Target Fix Date**: _____________________  
**Status**: [New / Assigned / In Progress / Fixed / Closed]

---

## Resolution

**Fix Implemented**: [YES / NO]  
**Fix Details**: [What was changed?]  
**Fix Tested By**: _____________________  
**Verification Date**: _____________________

---

## Examples of Good Bug Reports

### ✅ Example 1 (Critical)

**Title**: App crashes when adding item with empty name

**Scenario**: Scenario 3

**Steps to Reproduce**:
1. Click + button
2. Leave "Food name" blank
3. Click "Add Item"
4. App crashes to white screen

**Severity**: 🔴 Critical (blocks item creation)

---

### ✅ Example 2 (High)

**Title**: Swipe actions not responsive on items with long names

**Scenario**: Scenario 4

**Steps to Reproduce**:
1. Add item with long name (>30 chars)
2. Try to swipe right
3. Swipe doesn't register consistently
4. Takes 3-4 attempts

**Severity**: 🟠 High (feature works but frustrating)

---

### ✅ Example 3 (Medium)

**Title**: Search bar doesn't clear when text deleted

**Scenario**: Scenario 2

**Steps to Reproduce**:
1. Search for "Milk"
2. Delete search text
3. Results stay filtered
4. Need to refresh to see all items

**Severity**: 🟡 Medium (works after refresh)

---

### ✅ Example 4 (Low)

**Title**: "Add Item" button label has typo

**Scenario**: Scenario 3

**Current**: "Add Itme" (typo)  
**Should Be**: "Add Item"

**Severity**: 🔵 Low (cosmetic, feature works)

---

## Report This Bug

**In GitHub**: Create issue with title "UAT Bug: [Your Title]"  
**In Slack**: Post summary in #whatsforlunch-dev  
**For Escalation**: Slack @eng-lead if Critical/High

---

## UAT Bug Tracking

| ID | Title | Severity | Scenario | Status |
|----|-------|----------|----------|--------|
| UAT-001 | [Title] | 🔴 | S3 | Assigned |
| UAT-002 | [Title] | 🟠 | S4 | New |
| | | | | |

---

**Template Version**: 1.0  
**Last Updated**: April 30, 2026
